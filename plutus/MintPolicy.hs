{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

module MintPolicy
  ( mkPolicy
  , compiledPolicyFactory
  ) where

import PlutusLedgerApi.V2
import PlutusLedgerApi.V2.Contexts
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup (..), unless)

import qualified PlutusTx.AssocMap as AssocMap

import Beacon
  ( encodeBeaconTarget
  , sameTarget
  , ticketCommitment
  )

import Types
  ( BeaconRegistryDatum (..)
  , BeaconStatus (..)
  , B1PrizePoolDatum (..)
  , BeaconTarget (..)
  , PrizeDatum (..)
  , PrizeStatus (..)
  )

-- ============================================================
-- Generic helpers
-- ============================================================

{-# INLINABLE integerToBuiltinByteString #-}
integerToBuiltinByteString :: Integer -> BuiltinByteString
integerToBuiltinByteString n =
  consByteString n emptyByteString

{-# INLINABLE tokenNameFromInteger #-}
tokenNameFromInteger :: Integer -> TokenName
tokenNameFromInteger n =
  TokenName (integerToBuiltinByteString n)

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v =
  valueOf v adaSymbol adaToken

{-# INLINABLE listLength #-}
listLength :: [a] -> Integer
listLength [] = 0
listLength (_:xs) =
  1 + listLength xs

-- ============================================================
-- Counter helpers
-- ============================================================

{-# INLINABLE readIntegerDatum #-}
readIntegerDatum :: TxInfo -> TxOut -> Maybe Integer
readIntegerDatum info out =
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

{-# INLINABLE findCounterInputs #-}
findCounterInputs :: ScriptHash -> [TxInInfo] -> [TxInInfo]
findCounterInputs _ [] = []
findCounterInputs sh (txIn:rest) =
  case addressCredential (txOutAddress (txInInfoResolved txIn)) of
    ScriptCredential h
      | h == sh ->
          txIn : findCounterInputs sh rest
    _ ->
      findCounterInputs sh rest

{-# INLINABLE hasNextCounterOutput #-}
hasNextCounterOutput
  :: ScriptHash
  -> Integer
  -> TxInfo
  -> Bool
hasNextCounterOutput counterHash n info =
  go (txInfoOutputs info)
  where
    go [] =
      False

    go (o:os) =
      case addressCredential (txOutAddress o) of
        ScriptCredential h
          | h == counterHash ->
              case readIntegerDatum info o of
                Just nextN ->
                  nextN == n + 1
                Nothing ->
                  False

        _ ->
          go os

-- ============================================================
-- Mint helpers
-- ============================================================

{-# INLINABLE ownMintEntries #-}
ownMintEntries :: CurrencySymbol -> Value -> [(TokenName, Integer)]
ownMintEntries cs v =
  case AssocMap.lookup cs (getValue v) of
    Nothing ->
      []

    Just tokens ->
      AssocMap.toList tokens

{-# INLINABLE mintedExactlyOneSerial #-}
mintedExactlyOneSerial
  :: CurrencySymbol
  -> TokenName
  -> Value
  -> Bool
mintedExactlyOneSerial ownCs expectedName minted =
  case ownMintEntries ownCs minted of
    [(name, amount)] ->
         name == expectedName
      && amount == 1

    _ ->
      False

{-# INLINABLE isExactSingleBurn #-}
isExactSingleBurn
  :: CurrencySymbol
  -> Value
  -> Bool
isExactSingleBurn ownCs minted =
  case ownMintEntries ownCs minted of
    [(_, amount)] ->
      amount == (-1)

    _ ->
      False

-- ============================================================
-- PrizeDatum decoding
-- ============================================================

{-# INLINABLE decodePrizeDatum #-}
decodePrizeDatum
  :: TxInfo
  -> TxOut
  -> Maybe PrizeDatum
decodePrizeDatum info out =
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

{-# INLINABLE findSinglePrizeOutput #-}
findSinglePrizeOutput
  :: ScriptHash
  -> TxInfo
  -> Maybe PrizeDatum
findSinglePrizeOutput prizeHash info =
  go (txInfoOutputs info) Nothing
  where
    go [] found =
      found

    go (o:os) found =
      case addressCredential (txOutAddress o) of
        ScriptCredential h
          | h == prizeHash ->
              case found of
                Just _ ->
                  Nothing

                Nothing ->
                  case decodePrizeDatum info o of
                    Just pd ->
                      go os (Just pd)

                    Nothing ->
                      Nothing

        _ ->
          go os found

-- ============================================================
-- Beacon registry
-- ============================================================

{-# INLINABLE decodeRegistryDatum #-}
decodeRegistryDatum
  :: TxInfo
  -> TxOut
  -> Maybe BeaconRegistryDatum
decodeRegistryDatum info out =
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

{-# INLINABLE readRegistry #-}
readRegistry
  :: ScriptHash
  -> TxInfo
  -> Maybe BeaconRegistryDatum
readRegistry regHash info =
  go (txInfoReferenceInputs info)
  where
    isRegistryRef i =
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h ->
          h == regHash

        _ ->
          False

    go [] =
      Nothing

    go (i:is)
      | isRegistryRef i =
          decodeRegistryDatum info (txInInfoResolved i)

      | otherwise =
          go is

-- ============================================================
-- PrizeDatum creation validation
-- ============================================================

{-# INLINABLE newPrizeDatumValid #-}
newPrizeDatumValid
  :: ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> CurrencySymbol
  -> TokenName
  -> ScriptContext
  -> Bool
newPrizeDatumValid
  prizeHash
  regHash
  b1PrizePoolHash
  ownCs
  expectedName
  ctx =
    let
      info = scriptContextTxInfo ctx

      CurrencySymbol ownCsBytes =
        ownCs

      ScriptHash b1PrizePoolHashBytes =
        b1PrizePoolHash

      TokenName expectedNameBytes =
        expectedName
    in
      case findSinglePrizeOutput prizeHash info of
        Nothing ->
          False

        Just pd ->
          let
            target = pdBeaconTarget pd

            ticketBoundOk =
              pdTicketPolicy pd == ownCsBytes
                && pdTicketName pd == expectedNameBytes

            poolBoundOk =
              pdPrizePoolHash pd == b1PrizePoolHashBytes

            commitmentOk =
              pdCommitment pd
                == ticketCommitment
                     expectedNameBytes
                     (pdPlayerCommitment pd)
                     (pdGameVersion pd)
                     (pdTicketNonce pd)
                     (pdPriceUsdm pd)
                     (encodeBeaconTarget target)

            freshStateOk =
              pdStatus pd == Pending
                && pdBeaconStatus pd == BeaconPending
                && pdPrizeTier pd == 0
                && lengthOfByteString (pdResult pd) == 0
                && lengthOfByteString (pdBeaconValue pd) == 0
                && lengthOfByteString (pdMcHash pd) == 0

            roundNotYetRevealedOk =
              case readRegistry regHash info of
                Nothing ->
                  False

                Just reg ->
                     sameTarget (brTarget reg) target
                  && brRound reg == btRound target
                  && brStatus reg == BeaconPending

          in
               ticketBoundOk
            && poolBoundOk
            && commitmentOk
            && freshStateOk
            && roundNotYetRevealedOk

-- ============================================================
-- C-02 atomic sale checks
-- ============================================================

-- Current B1 launch settlement:
--
--   1 ADA = 1,000,000 lovelace
--
-- This is the settlement amount used by the current Preprod sale flow.
-- It is deliberately NOT treated as the USDM economic price.
--
-- pdPriceUsdm remains the canonical economic ticket price.
-- General ADA/USDM oracle valuation belongs to the later C-03
-- multi-asset settlement work.
{-# INLINABLE ticketPaymentLovelace #-}
ticketPaymentLovelace :: Integer
ticketPaymentLovelace =
  1000000

-- ============================================================
-- Treasury payment
-- ============================================================

{-# INLINABLE singleScriptOutputLovelace #-}
singleScriptOutputLovelace
  :: ScriptHash
  -> TxInfo
  -> Maybe Integer
singleScriptOutputLovelace sh info =
  go (txInfoOutputs info) Nothing
  where
    go [] found =
      found

    go (o:os) found =
      case addressCredential (txOutAddress o) of
        ScriptCredential h
          | h == sh ->
              case found of
                Just _ ->
                  Nothing

                Nothing ->
                  go os (Just (valueLovelace (txOutValue o)))

        _ ->
          go os found

{-# INLINABLE atomicTreasuryPaymentValid #-}
atomicTreasuryPaymentValid
  :: ScriptHash
  -> TxInfo
  -> Bool
atomicTreasuryPaymentValid treasuryHash info =
  case singleScriptOutputLovelace treasuryHash info of
    Just amount ->
      amount == ticketPaymentLovelace

    Nothing ->
      False

-- ============================================================
-- B1PrizePool atomic reservation
-- ============================================================

{-# INLINABLE decodePoolDatumAt #-}
decodePoolDatumAt
  :: TxInfo
  -> ScriptHash
  -> TxOut
  -> Maybe B1PrizePoolDatum
decodePoolDatumAt info sh out =
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

{-# INLINABLE findSinglePoolInput #-}
findSinglePoolInput
  :: ScriptHash
  -> TxInfo
  -> Maybe (B1PrizePoolDatum, Value)
findSinglePoolInput sh info =
  go (txInfoInputs info) Nothing
  where
    go [] found =
      found

    go (i:is) found =
      case decodePoolDatumAt info sh (txInInfoResolved i) of
        Nothing ->
          go is found

        Just pd ->
          case found of
            Nothing ->
              go is
                (Just
                  ( pd
                  , txOutValue (txInInfoResolved i)
                  )
                )

            Just _ ->
              Nothing

{-# INLINABLE findSinglePoolOutput #-}
findSinglePoolOutput
  :: ScriptHash
  -> TxInfo
  -> Maybe (B1PrizePoolDatum, Value)
findSinglePoolOutput sh info =
  go (txInfoOutputs info) Nothing
  where
    go [] found =
      found

    go (o:os) found =
      case decodePoolDatumAt info sh o of
        Nothing ->
          go os found

        Just pd ->
          case found of
            Nothing ->
              go os
                (Just
                  ( pd
                  , txOutValue o
                  )
                )

            Just _ ->
              Nothing

{-# INLINABLE atomicPoolReservationValid #-}
atomicPoolReservationValid
  :: ScriptHash
  -> Integer
  -> TxInfo
  -> Bool
atomicPoolReservationValid poolHash priceUsdm info =
  case findSinglePoolInput poolHash info of
    Nothing ->
      False

    Just (before, beforeValue) ->
      case findSinglePoolOutput poolHash info of
        Nothing ->
          False

        Just (after, afterValue) ->
             beforeValue == afterValue
          && ppTotalLiquidity after
               == ppTotalLiquidity before
          && ppPendingLiabilities after
               == ppPendingLiabilities before
          && ppUnresolvedReserve after
               == ppUnresolvedReserve before + priceUsdm
          && ppUnresolvedTicketCount after
               == ppUnresolvedTicketCount before + 1
          && ppLockedJackpot after
               == ppLockedJackpot before
          && ppJackpotThreshold after
               == ppJackpotThreshold before
          && ppSuspendedClasses after
               == ppSuspendedClasses before
          && ppPrizeHash after
               == ppPrizeHash before

-- ============================================================
-- Main mint policy
-- ============================================================

-- | Mint policy for PRE-RICH serial NFT tickets.
--
-- B1 atomic-sale requirement:
--
-- The SAME transaction must contain:
--
--   1. counter n -> n+1
--   2. exactly one Ticket NFT mint
--   3. creation of the Pending PrizeDatum
--   4. payment to the protocol Treasury
--   5. B1PrizePool TicketIssued reservation
--
-- The policy verifies the transaction structure itself.
-- Therefore the frontend cannot be the security boundary.
--
-- Burn:
--
-- A single exact burn of one ticket NFT remains permitted.
-- Burn handling is intentionally separate from the sale path.
{-# INLINABLE mkPolicy #-}
mkPolicy
  :: ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> ()
  -> ScriptContext
  -> Bool
mkPolicy
  counterHash
  prizeHash
  regHash
  treasuryHash
  b1PrizePoolHash
  _
  ctx
  | isExactSingleBurn ownCs minted =
      True

  | otherwise =
      case findCounterInputs counterHash (txInfoInputs info) of

        [txIn] ->
          case readIntegerDatum info (txInInfoResolved txIn) of

            Nothing ->
              traceError
                "MintPolicy: invalid or missing counter datum"

            Just n ->
              let
                expectedName =
                  tokenNameFromInteger n

                mintOk =
                  mintedExactlyOneSerial
                    ownCs
                    expectedName
                    minted

                counterAdvanced =
                  hasNextCounterOutput
                    counterHash
                    n
                    info

                prizeOk =
                  newPrizeDatumValid
                    prizeHash
                    regHash
                    b1PrizePoolHash
                    ownCs
                    expectedName
                    ctx

                treasuryOk =
                  atomicTreasuryPaymentValid
                    treasuryHash
                    info

                poolOk =
                  case findSinglePrizeOutput prizeHash info of
                    Nothing ->
                      False

                    Just pd ->
                      atomicPoolReservationValid
                        b1PrizePoolHash
                        (pdPriceUsdm pd)
                        info

              in
                   traceIfFalse
                     "expected exactly one serial NFT with correct name"
                     mintOk

                && traceIfFalse
                     "counter UTxO was not advanced to n+1"
                     counterAdvanced

                && traceIfFalse
                     "prize utxo invalid or round already revealed"
                     prizeOk

                && traceIfFalse
                     "Treasury payment missing or incorrect"
                     treasuryOk

                && traceIfFalse
                     "B1PrizePool reservation missing or incorrect"
                     poolOk

        [] ->
          traceError
            "MintPolicy: counter input not found"

        _ ->
          traceError
            "MintPolicy: expected exactly one counter input"

  where
    info =
      scriptContextTxInfo ctx

    ownCs =
      ownCurrencySymbol ctx

    minted =
      txInfoMint info

-- ============================================================
-- Untyped wrapper / compilation
-- ============================================================

{-# INLINABLE wrap #-}
wrap
  :: ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> BuiltinData
  -> BuiltinData
  -> BuiltinUnit
wrap
  counterHash
  prizeHash
  regHash
  treasuryHash
  b1PrizePoolHash
  r
  ctx =
  check
    ( mkPolicy
        counterHash
        prizeHash
        regHash
        treasuryHash
        b1PrizePoolHash
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledPolicyFactory
  :: CompiledCode
       ( ScriptHash
         -> ScriptHash
         -> ScriptHash
         -> ScriptHash
         -> ScriptHash
         -> BuiltinData
         -> BuiltinData
         -> BuiltinUnit
       )
compiledPolicyFactory =
  $$(compile [|| wrap ||])