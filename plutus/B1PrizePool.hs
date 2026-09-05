{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

module B1PrizePool
  ( mkValidator
  , compiledValidatorFactory
  ) where

import PlutusLedgerApi.V2
import PlutusLedgerApi.V2.Contexts
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup (..), unless)
import qualified PlutusTx.AssocMap as AssocMap

import Types
  ( B1PrizePoolDatum (..)
  , B1PrizePoolAction (..)
  , PrizeDatum (..)
  , PrizeStatus (..)
  , OracleDatum (..)
  , precision
  , minUtxoLovelace
  , maxOracleAge
  )

-- ============================================================
-- Helpers
-- ============================================================

-- | Effective pool = totalLiquidity - pendingLiabilities
--   - unresolvedReserve - lockedJackpot.
--   All values are in USDM sub-units. Must be >= 0 for solvency.
{-# INLINABLE effectivePool #-}
effectivePool :: B1PrizePoolDatum -> Integer
effectivePool d =
  ppTotalLiquidity d
    - ppPendingLiabilities d
    - ppUnresolvedReserve d
    - ppLockedJackpot d

{-# INLINABLE solvencyInvariant #-}
solvencyInvariant :: B1PrizePoolDatum -> Bool
solvencyInvariant d =
     ppTotalLiquidity d >= 0
  && ppPendingLiabilities d >= 0
  && ppUnresolvedReserve d >= 0
  && ppUnresolvedTicketCount d >= 0
  && ppLockedJackpot d >= 0
  && effectivePool d >= 0

{-# INLINABLE jackpotActive #-}
jackpotActive :: B1PrizePoolDatum -> Bool
jackpotActive d =
  effectivePool d >= ppJackpotThreshold d

{-# INLINABLE ownInputResolved #-}
ownInputResolved :: ScriptContext -> TxOut
ownInputResolved ctx =
  case findOwnInput ctx of
    Just i  -> txInInfoResolved i
    Nothing ->
      traceError "B1PrizePool: missing own input"

{-# INLINABLE ownScriptHash #-}
ownScriptHash :: ScriptContext -> ScriptHash
ownScriptHash ctx =
  case addressCredential (txOutAddress (ownInputResolved ctx)) of
    ScriptCredential h -> h
    _ ->
      traceError "B1PrizePool: own input not script"

-- | Count how many inputs are from this script.
{-# INLINABLE countOwnInputs #-}
countOwnInputs :: ScriptContext -> Integer
countOwnInputs ctx =
  let
    sh = ownScriptHash ctx

    go [] =
      0

    go (i:is) =
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h
          | h == sh ->
              1 + go is
        _ ->
          go is

  in
    go (txInfoInputs (scriptContextTxInfo ctx))

-- | Protocol singleton token helpers.
--
-- A valid PrizePool transaction must carry exactly one unit of
-- the pool authority NFT from the unique Pool input to the unique
-- continuing Pool output.
{-# INLINABLE tokenAmountInInputs #-}
tokenAmountInInputs
  :: TxInfo
  -> CurrencySymbol
  -> TokenName
  -> Integer
tokenAmountInInputs info cs tn =
  go (txInfoInputs info)
  where
    go [] =
      0

    go (i:is) =
      valueOf
        (txOutValue (txInInfoResolved i))
        cs
        tn
        + go is

{-# INLINABLE tokenAmountInOutputs #-}
tokenAmountInOutputs
  :: TxInfo
  -> CurrencySymbol
  -> TokenName
  -> Integer
tokenAmountInOutputs info cs tn =
  go (txInfoOutputs info)
  where
    go [] =
      0

    go (o:os) =
      valueOf
        (txOutValue o)
        cs
        tn
        + go os

{-# INLINABLE singletonPoolTokenValid #-}
singletonPoolTokenValid
  :: ScriptContext
  -> BuiltinByteString
  -> BuiltinByteString
  -> Bool
singletonPoolTokenValid ctx poolPolicy poolName =
  let
    info =
      scriptContextTxInfo ctx

    cs =
      CurrencySymbol poolPolicy

    tn =
      TokenName poolName

    inputAmount =
      tokenAmountInInputs
        info
        cs
        tn

    outputAmount =
      tokenAmountInOutputs
        info
        cs
        tn

    ownInputAmount =
      valueOf
        (txOutValue (ownInputResolved ctx))
        cs
        tn

    ownOutputAmount =
      valueOf
        (ownOutputValue ctx) cs tn
  in
       inputAmount == 1
    && outputAmount == 1
    && ownInputAmount == 1
    && ownOutputAmount == 1

{-# INLINABLE findSingleContinuingDatum #-}
findSingleContinuingDatum
  :: ScriptContext
  -> Maybe B1PrizePoolDatum
findSingleContinuingDatum ctx =
  let
    info =
      scriptContextTxInfo ctx

    ownHash =
      ownScriptHash ctx

    isOwnScriptOut o =
      case addressCredential (txOutAddress o) of
        ScriptCredential h ->
          h == ownHash
        _ ->
          False

    go [] found =
      found

    go (o:os) found =
      if isOwnScriptOut o
        then
          case found of
            Just _ ->
              Nothing

            Nothing ->
              case txOutDatum o of
                OutputDatum d ->
                  case fromBuiltinData (getDatum d) of
                    Just (d' :: B1PrizePoolDatum) ->
                      go os (Just d')

                    Nothing ->
                      Nothing

                OutputDatumHash dh ->
                  case findDatum dh info of
                    Just d ->
                      case fromBuiltinData (getDatum d) of
                        Just (d' :: B1PrizePoolDatum) ->
                          go os (Just d')

                        Nothing ->
                          Nothing

                    Nothing ->
                      Nothing

                NoOutputDatum ->
                  Nothing

        else
          go os found

  in
    go (txInfoOutputs info) Nothing

-- ============================================================
-- PrizeDatum helpers
-- ============================================================

{-# INLINABLE decodePrizeDatumAt #-}
decodePrizeDatumAt
  :: TxInfo
  -> ScriptHash
  -> TxOut
  -> Maybe PrizeDatum
decodePrizeDatumAt info sh out =
  case addressCredential (txOutAddress out) of
    ScriptCredential h
      | h == sh ->
          case txOutDatum out of
            OutputDatum d ->
              fromBuiltinData (getDatum d)

            OutputDatumHash dh ->
              case findDatum dh info of
                Just d ->
                  fromBuiltinData (getDatum d)

                Nothing ->
                  Nothing

            NoOutputDatum ->
              Nothing

    _ ->
      Nothing

-- | Find a single output to the PrizeValidator
--   with a decodable PrizeDatum.
{-# INLINABLE findPrizeOutput #-}
findPrizeOutput
  :: TxInfo
  -> ScriptHash
  -> Maybe PrizeDatum
findPrizeOutput info prizeHash =
  go (txInfoOutputs info) Nothing
  where
    go [] found =
      found

    go (o:os) found =
      case decodePrizeDatumAt info prizeHash o of
        Nothing ->
          go os found

        Just pd ->
          case found of
            Nothing ->
              go os (Just pd)

            Just _ ->
              Nothing

-- | Find a single input from the PrizeValidator
--   with a decodable PrizeDatum.
{-# INLINABLE findPrizeInput #-}
findPrizeInput
  :: TxInfo
  -> ScriptHash
  -> Maybe PrizeDatum
findPrizeInput info prizeHash =
  go (txInfoInputs info) Nothing
  where
    go [] found =
      found

    go (i:is) found =
      case decodePrizeDatumAt info prizeHash (txInInfoResolved i) of
        Nothing ->
          go is found

        Just pd ->
          case found of
            Nothing ->
              go is (Just pd)

            Just _ ->
              Nothing

-- | Find owner of ticket NFT among inputs.
{-# INLINABLE ticketOwnerPkh #-}
ticketOwnerPkh
  :: BuiltinByteString
  -> BuiltinByteString
  -> [TxInInfo]
  -> Maybe PubKeyHash
ticketOwnerPkh _ _ [] =
  Nothing

ticketOwnerPkh cs bs (i:is) =
  let
    resolved =
      txInInfoResolved i

    val =
      txOutValue resolved

    cs' =
      CurrencySymbol cs

    tn' =
      TokenName bs

  in
    if valueOf val cs' tn' == 1
      then
        case addressCredential (txOutAddress resolved) of
          PubKeyCredential pkh ->
            Just pkh

          _ ->
            Nothing

      else
        ticketOwnerPkh cs bs is

{-# INLINABLE pkElem #-}
pkElem
  :: PubKeyHash
  -> [PubKeyHash]
  -> Bool
pkElem _ [] =
  False

pkElem x (y:ys) =
  x == y || pkElem x ys

-- ============================================================
-- Oracle / payout helpers
-- ============================================================

-- | Check if payout to a PubKeyHash has sufficient
--   USDM-denominated value.
--   Uses oracle-based valuation, not lovelace comparison.
{-# INLINABLE payoutPaidUsdm #-}
payoutPaidUsdm
  :: TxInfo
  -> PubKeyHash
  -> PubKeyHash
  -> Integer
  -> [TxOut]
  -> Bool
payoutPaidUsdm _ _ _ _ [] =
  False

payoutPaidUsdm
  info
  oraclePublisher
  pkh
  requiredUsdm
  (o:os) =
  let
    addr =
      txOutAddress o

    matches =
      case addressCredential addr of
        PubKeyCredential h ->
          h == pkh

        _ ->
          False

  in
    if matches
      then
        let
          outValue =
            txOutValue o

          usdmValue =
            totalUsdmValue
              info
              oraclePublisher
              outValue

        in
          usdmValue >= requiredUsdm
            || payoutPaidUsdm
                 info
                 oraclePublisher
                 pkh
                 requiredUsdm
                 os

      else
        payoutPaidUsdm
          info
          oraclePublisher
          pkh
          requiredUsdm
          os

-- | Claim must end at or before expiry.
{-# INLINABLE claimBeforeExpiry #-}
claimBeforeExpiry
  :: Integer
  -> TxInfo
  -> Bool
claimBeforeExpiry expiresAt info =
  case ivTo (txInfoValidRange info) of
    UpperBound (Finite t) _ ->
      getPOSIXTime t <= expiresAt

    _ ->
      False

-- | Expiry action requires the transaction to start
--   at or after expiry.
{-# INLINABLE transactionAtOrAfter #-}
transactionAtOrAfter
  :: Integer
  -> TxInfo
  -> Bool
transactionAtOrAfter expiresAt info =
  case ivFrom (txInfoValidRange info) of
    LowerBound (Finite t) _ ->
      getPOSIXTime t >= expiresAt

    _ ->
      False

-- ============================================================
-- Oracle helpers (C-03)
-- ============================================================

{-# OPAQUE decodeOracleDatum #-}
decodeOracleDatum
  :: TxInfo
  -> TxOut
  -> Maybe OracleDatum
decodeOracleDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      fromBuiltinData (getDatum d)

    OutputDatumHash dh ->
      case findDatum dh info of
        Just d ->
          fromBuiltinData (getDatum d)

        Nothing ->
          Nothing

    NoOutputDatum ->
      Nothing

{-# OPAQUE validOracleTimestamp #-}
validOracleTimestamp
  :: Integer
  -> TxInfo
  -> Bool
validOracleTimestamp timestamp info =
  case ivTo (txInfoValidRange info) of
    UpperBound (Finite t) _ ->
      let
        now =
          getPOSIXTime t

      in
        now - timestamp <= maxOracleAge
          && timestamp <= now

    _ ->
      False

-- ============================================================
-- USDM value computation (C-03)
-- ============================================================

-- | Ceiling division: (a + b - 1) / b.
--   Safe rounding direction: payout can never be underfunded.
{-# OPAQUE ceilingDiv #-}
ceilingDiv
  :: Integer
  -> Integer
  -> Integer
ceilingDiv a b
  | b == 0 =
      traceError "B1PrizePool: division by zero"

  | a <= 0 =
      0

  | b < 0 =
      traceError "B1PrizePool: invalid divisor"

  | otherwise =
      (a + b - 1) `divide` b

{-# OPAQUE oraclePriceFor #-}
oraclePriceFor
  :: [TxInInfo]
  -> PubKeyHash
  -> TxInfo
  -> BuiltinByteString
  -> BuiltinByteString
  -> Integer
oraclePriceFor [] _ _ _ _ =
  traceError "B1PrizePool: oracle missing"

oraclePriceFor
  (i:is)
  publisher
  info
  csBytes
  tnBytes =
  case decodeOracleDatum info (txInInfoResolved i) of
    Just od
      | odAssetPolicy od == csBytes
      && odAssetName od == tnBytes
      && odPublisher od == publisher
      && validOracleTimestamp
           (odTimestamp od)
           info ->
          odPrice od

    _ ->
      oraclePriceFor
        is
        publisher
        info
        csBytes
        tnBytes

-- | Compute total USDM-denominated value of a Value.
--
-- For ADA:
--   excludes min-UTxO,
--   then converts remaining ADA via oracle.
--
-- For non-ADA:
--   converts entire amount via oracle.
{-# INLINABLE totalUsdmValue #-}
totalUsdmValue
  :: TxInfo
  -> PubKeyHash
  -> Value
  -> Integer
totalUsdmValue info publisher val =
  let
    refs =
      txInfoReferenceInputs info

  in
    go
      refs
      (AssocMap.toList (getValue val))

  where
    go _ [] =
      0

    go refs ((cs, innerMap):rest) =
      goInner
        refs
        (unCurrencySymbol cs)
        (AssocMap.toList innerMap)
        + go refs rest

    goInner _ _ [] =
      0

    goInner
      refs
      csBytes
      ((tn, amt):rest) =
      let
        price =
          oraclePriceFor
            refs
            publisher
            info
            csBytes
            (unTokenName tn)

        economicAmt
          | csBytes == unCurrencySymbol adaSymbol
          && unTokenName tn == unTokenName adaToken =
              max
                0
                (amt - minUtxoLovelace)

          | otherwise =
              amt

      in
        ceilingDiv
          (economicAmt * price)
          precision
        + goInner
            refs
            csBytes
            rest

-- | Value the Pool while excluding its non-economic singleton NFT.
{-# INLINABLE poolUsdmValue #-}
poolUsdmValue
  :: TxInfo
  -> PubKeyHash
  -> BuiltinByteString
  -> BuiltinByteString
  -> Value
  -> Integer
poolUsdmValue
  info
  publisher
  poolPolicy
  poolName
  val =
  totalUsdmValue
    info
    publisher
    ( val
      - singleton
          (CurrencySymbol poolPolicy)
          (TokenName poolName)
          1
    )

-- | Compute recomputed USDM-denominated liquidity
--   of the PrizePool UTxO.
{-# INLINABLE recomputedLiquidity #-}
recomputedLiquidity
  :: TxInfo
  -> PubKeyHash
  -> Value
  -> Integer
recomputedLiquidity
  info
  publisher
  val =
  totalUsdmValue
    info
    publisher
    val

-- ============================================================
-- Own output helpers
-- ============================================================

{-# INLINABLE ownOutputValue #-}
ownOutputValue
  :: ScriptContext
  -> Value
ownOutputValue ctx =
  let
    info =
      scriptContextTxInfo ctx

    ownHash =
      ownScriptHash ctx

    go [] =
      traceError "B1PrizePool: no own output"

    go (o:os) =
      case addressCredential (txOutAddress o) of
        ScriptCredential h
          | h == ownHash ->
              txOutValue o

        _ ->
          go os

  in
    go (txInfoOutputs info)

-- | TicketIssued must be paired with the exact Ticket NFT mint
--   described by the new PrizeDatum in the same transaction.
{-# INLINABLE ticketMinted #-}
ticketMinted
  :: TxInfo
  -> BuiltinByteString
  -> BuiltinByteString
  -> Bool
ticketMinted
  info
  policyBytes
  nameBytes =
  valueOf
    (txInfoMint info)
    (CurrencySymbol policyBytes)
    (TokenName nameBytes)
    == 1

-- ============================================================
-- Validator
-- ============================================================

{-# INLINABLE mkValidator #-}
mkValidator
  :: ScriptHash
  -> PubKeyHash
  -> BuiltinByteString
  -> BuiltinByteString
  -> B1PrizePoolDatum
  -> B1PrizePoolAction
  -> ScriptContext
  -> Bool
mkValidator
  prizeHash
  oraclePublisher
  poolPolicy
  poolName
  datum
  action
  ctx =
  let
    info =
      scriptContextTxInfo ctx

    nextDatum =
      findSingleContinuingDatum ctx

  in
    traceIfFalse
      "B1PrizePool: solvency violated (pre)"
      (solvencyInvariant datum)

      && traceIfFalse
           "B1PrizePool: singleton token invalid"
           (singletonPoolTokenValid
             ctx
             poolPolicy
             poolName)

      && traceIfFalse
           "B1PrizePool: exactly one Pool input"
           (countOwnInputs ctx == 1)

      && case action of

        -- ==================================================
        -- FundTreasury
        -- ==================================================

        FundTreasury ->
          let
            ownOutVal =
              ownOutputValue ctx

            recalcLiq =
              recomputedLiquidity
                info
                oraclePublisher
                ownOutVal

          in
               traceIfFalse
                 "B1PrizePool: continuing output missing"
                 (isJust nextDatum)

            && case nextDatum of
                 Nothing ->
                   False

                 Just n ->
                      traceIfFalse
                        "B1PrizePool: accounting must match actual value"
                        (ppTotalLiquidity n == recalcLiq)

                   && traceIfFalse
                        "B1PrizePool: liquidity must increase"
                        (ppTotalLiquidity n > ppTotalLiquidity datum)

                   && ppPendingLiabilities n
                        == ppPendingLiabilities datum

                   && ppUnresolvedReserve n
                        == ppUnresolvedReserve datum

                   && ppUnresolvedTicketCount n
                        == ppUnresolvedTicketCount datum

                   && ppLockedJackpot n
                        == ppLockedJackpot datum

                   && ppJackpotThreshold n
                        == ppJackpotThreshold datum

                   && ppSuspendedClasses n
                        == ppSuspendedClasses datum

                   && ppPrizeHash n
                        == ppPrizeHash datum

                   && solvencyInvariant n

        -- ==================================================
        -- TicketIssued
        -- ==================================================

        -- Integer parameter = pdPriceUsdm from PrizeDatum.
        --
        -- The reserve is deterministic:
        --
        --   reserve += pdPriceUsdm
        --
        -- The redeemer cannot choose a different economic amount
        -- because it must equal the PrizeDatum value.
        TicketIssued priceUsdm ->

             traceIfFalse
               "B1PrizePool: price must be positive"
               (priceUsdm > 0)

          && traceIfFalse
               "B1PrizePool: continuing output missing"
               (isJust nextDatum)

          && case nextDatum of
               Nothing ->
                 False

               Just n ->
                 case findPrizeOutput info prizeHash of
                   Nothing ->
                     traceError
                       "B1PrizePool: no prize output"

                   Just pd ->
                        pdStatus pd == Pending

                     && pdPrizeAmount pd == 0

                     && pdTicketPolicy pd
                          /= emptyByteString

                     && pdTicketName pd
                          /= emptyByteString

                     -- C-02:
                     -- The actual Ticket NFT must be minted
                     -- in this same transaction.
                     && ticketMinted
                          info
                          (pdTicketPolicy pd)
                          (pdTicketName pd)

                     -- C-01:
                     -- Reserve amount is bound to the PrizeDatum.
                     && pdPriceUsdm pd
                          == priceUsdm

                     -- Ticket issuance does not change physical
                     -- pool liquidity.
                     && ppTotalLiquidity n
                          == ppTotalLiquidity datum

                     && ppPendingLiabilities n
                          == ppPendingLiabilities datum

                     && ppLockedJackpot n
                          == ppLockedJackpot datum

                     && ppJackpotThreshold n
                          == ppJackpotThreshold datum

                     && ppSuspendedClasses n
                          == ppSuspendedClasses datum

                     && ppPrizeHash n
                          == ppPrizeHash datum

                     -- One new unresolved ticket.
                     && ppUnresolvedTicketCount n
                          == ppUnresolvedTicketCount datum + 1

                     -- Reserve increases by the exact
                     -- ticket economic price.
                     && ppUnresolvedReserve n
                          == ppUnresolvedReserve datum + priceUsdm

                     && solvencyInvariant n

        -- ==================================================
        -- TicketRevealed
        -- ==================================================

        -- Integer parameter = pdPriceUsdm from consumed PrizeDatum.
        --
        -- payout:
        --   deterministic from PrizeDatum
        --
        -- reserveRelease:
        --   deterministic from pdPriceUsdm
        --
        -- Effective pool:
        --   payout <= effectivePool BEFORE reveal.
        TicketRevealed priceUsdm ->

             traceIfFalse
               "B1PrizePool: count must be positive"
               (ppUnresolvedTicketCount datum > 0)

          && traceIfFalse
               "B1PrizePool: continuing output missing"
               (isJust nextDatum)

          && case nextDatum of
               Nothing ->
                 False

               Just n ->
                 case findPrizeOutput info prizeHash of
                   Nothing ->
                     traceError
                       "B1PrizePool: no prize output"

                   Just outPd ->
                     let
                       payout =
                         pdPrizeAmount outPd

                       reserveRelease =
                         priceUsdm

                     in
                           traceIfFalse
                             "B1PrizePool: payout exceeds effective pool"
                             (payout <= effectivePool datum)

                       && traceIfFalse
                            "B1PrizePool: payout must be non-negative"
                            (payout >= 0)

                       && traceIfFalse
                            "B1PrizePool: price mismatch"
                            (pdPriceUsdm outPd == priceUsdm)

                       && traceIfFalse
                            "B1PrizePool: status must be Revealed"
                            (pdStatus outPd == Revealed)

                       && ppTotalLiquidity n
                            == ppTotalLiquidity datum

                       && ppLockedJackpot n
                            == ppLockedJackpot datum

                       && ppJackpotThreshold n
                            == ppJackpotThreshold datum

                       && ppSuspendedClasses n
                            == ppSuspendedClasses datum

                       && ppPrizeHash n
                            == ppPrizeHash datum

                       && ppUnresolvedTicketCount n
                            == ppUnresolvedTicketCount datum - 1

                       && ppUnresolvedReserve n
                            == ppUnresolvedReserve datum
                                 - reserveRelease

                       && ppPendingLiabilities n
                            == ppPendingLiabilities datum + payout

                       && solvencyInvariant n

        -- ==================================================
        -- TicketClaimed
        -- ==================================================

        TicketClaimed claimedAmount ->

             traceIfFalse
               "B1PrizePool: claimed amount must be positive"
               (claimedAmount > 0)

          && traceIfFalse
               "B1PrizePool: cannot claim more than pending"
               (claimedAmount <= ppPendingLiabilities datum)

          && traceIfFalse
               "B1PrizePool: continuing output missing"
               (isJust nextDatum)

          && case nextDatum of
               Nothing ->
                 False

               Just n ->
                 case findPrizeOutput info prizeHash of
                   Nothing ->
                     traceError
                       "B1PrizePool: no prize output"

                   Just pd ->
                     let
                       ticketCs =
                         pdTicketPolicy pd

                       ticketTn =
                         pdTicketName pd

                       maybeOwner =
                         ticketOwnerPkh
                           ticketCs
                           ticketTn
                           (txInfoInputs info)

                       ownerSigned =
                         case maybeOwner of
                           Just pkh ->
                             pkElem
                               pkh
                               (txInfoSignatories info)

                           Nothing ->
                             False

                       payoutPaid =
                         case maybeOwner of
                           Just pkh ->
                             payoutPaidUsdm
                               info
                               oraclePublisher
                               pkh
                               (pdPrizeAmount pd)
                               (txInfoOutputs info)

                           Nothing ->
                             False

                       poolInputUsdm =
                         poolUsdmValue
                           info
                           oraclePublisher
                           poolPolicy
                           poolName
                           (txOutValue
                             (ownInputResolved ctx))

                       poolOutputUsdm =
                         poolUsdmValue
                           info
                           oraclePublisher
                           poolPolicy
                           poolName
                           (ownOutputValue ctx)

                     in
                           traceIfFalse
                             "B1PrizePool: owner not signed"
                             ownerSigned

                       && traceIfFalse
                            "B1PrizePool: not claimed"
                            (pdStatus pd == Claimed)

                       && traceIfFalse
                            "B1PrizePool: payout mismatch"
                            (pdPrizeAmount pd == claimedAmount)

                       && traceIfFalse
                            "B1PrizePool: payout USDM value insufficient"
                            payoutPaid

                       && traceIfFalse
                            "B1PrizePool: physical pool value delta mismatch"
                            (poolInputUsdm - poolOutputUsdm == claimedAmount)

                       && ppUnresolvedReserve n
                            == ppUnresolvedReserve datum

                       && ppUnresolvedTicketCount n
                            == ppUnresolvedTicketCount datum

                       && ppLockedJackpot n
                            == ppLockedJackpot datum

                       && ppJackpotThreshold n
                            == ppJackpotThreshold datum

                       && ppSuspendedClasses n
                            == ppSuspendedClasses datum

                       && ppPrizeHash n
                            == ppPrizeHash datum

                       && ppTotalLiquidity n
                            == ppTotalLiquidity datum - claimedAmount

                       && ppPendingLiabilities n
                            == ppPendingLiabilities datum - claimedAmount

                       && solvencyInvariant n

        -- ==================================================
        -- TicketExpired
        -- ==================================================

        TicketExpired ->

             traceIfFalse
               "B1PrizePool: count must be positive"
               (ppUnresolvedTicketCount datum > 0)

          && traceIfFalse
               "B1PrizePool: continuing output missing"
               (isJust nextDatum)

          && case nextDatum of
               Nothing ->
                 False

               Just n ->
                 case findPrizeOutput info prizeHash of
                   Nothing ->
                     traceError
                       "B1PrizePool: no prize output"

                   Just pd ->
                     let
                       expiresAt =
                         pdExpiresAt pd

                       payout =
                         pdPrizeAmount pd

                       -- Deterministic reserve:
                       -- one ticket releases exactly its own
                       -- pdPriceUsdm reservation.
                       reservePerTicket =
                         pdPriceUsdm pd

                     in
                           traceIfFalse
                             "B1PrizePool: not expired"
                             (transactionAtOrAfter
                               expiresAt
                               info)

                       && traceIfFalse
                            "B1PrizePool: payout must be zero for unrevealed"
                            (payout == 0)

                       && traceIfFalse
                            "B1PrizePool: status must be Pending"
                            (pdStatus pd == Pending)

                       && ppTotalLiquidity n
                            == ppTotalLiquidity datum

                       && ppLockedJackpot n
                            == ppLockedJackpot datum

                       && ppJackpotThreshold n
                            == ppJackpotThreshold datum

                       && ppSuspendedClasses n
                            == ppSuspendedClasses datum

                       && ppPrizeHash n
                            == ppPrizeHash datum

                       && ppUnresolvedTicketCount n
                            == ppUnresolvedTicketCount datum - 1

                       && ppUnresolvedReserve n
                            == ppUnresolvedReserve datum
                                 - reservePerTicket

                       && ppPendingLiabilities n
                            == ppPendingLiabilities datum

                       && ppUnresolvedReserve n >= 0

                       && solvencyInvariant n

-- ============================================================
-- Untyped wrapper / compilation
-- ============================================================

{-# INLINABLE wrap #-}
wrap
  :: BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinUnit
wrap
  prizeHash
  oraclePublisher
  poolPolicy
  poolName
  d
  r
  ctx =
  check
    ( mkValidator
        (unsafeFromBuiltinData prizeHash)
        (unsafeFromBuiltinData oraclePublisher)
        (unsafeFromBuiltinData poolPolicy)
        (unsafeFromBuiltinData poolName)
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidatorFactory
  :: CompiledCode
       ( BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinUnit
       )
compiledValidatorFactory =
  $$(compile [|| wrap ||])