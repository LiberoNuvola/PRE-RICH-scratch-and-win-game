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

import Types
  ( B1PrizePoolDatum (..)
  , B1PrizePoolAction (..)
  , PrizeDatum (..)
  , PrizeStatus (..)
  )

-- ============================================================
-- Helpers
-- ============================================================

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v = valueOf v adaSymbol adaToken

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
jackpotActive d = effectivePool d >= ppJackpotThreshold d

{-# INLINABLE ownInputResolved #-}
ownInputResolved :: ScriptContext -> TxOut
ownInputResolved ctx =
  case findOwnInput ctx of
    Just i  -> txInInfoResolved i
    Nothing -> traceError "B1PrizePool: missing own input"

{-# INLINABLE findSingleContinuingDatum #-}
findSingleContinuingDatum :: ScriptContext -> Maybe B1PrizePoolDatum
findSingleContinuingDatum ctx =
  let
    info = scriptContextTxInfo ctx
    ownHash =
      case addressCredential (txOutAddress (ownInputResolved ctx)) of
        ScriptCredential h -> h
        _ -> traceError "B1PrizePool: own input not script"
    isOwnScriptOut o =
      case addressCredential (txOutAddress o) of
        ScriptCredential h -> h == ownHash
        _ -> False
    go [] found = found
    go (o:os) found =
      if isOwnScriptOut o
        then case found of
               Just _  -> Nothing
               Nothing ->
                 case txOutDatum o of
                   OutputDatum d ->
                     case fromBuiltinData (getDatum d) of
                       Just (d' :: B1PrizePoolDatum) -> go os (Just d')
                       Nothing -> Nothing
                   OutputDatumHash dh ->
                     case findDatum dh info of
                       Just d ->
                         case fromBuiltinData (getDatum d) of
                           Just (d' :: B1PrizePoolDatum) -> go os (Just d')
                           Nothing -> Nothing
                       Nothing -> Nothing
                   NoOutputDatum -> Nothing
        else go os found
  in
    go (txInfoOutputs info) Nothing

{-# INLINABLE ownOutputLovelace #-}
ownOutputLovelace :: ScriptContext -> Integer
ownOutputLovelace ctx =
  let
    info = scriptContextTxInfo ctx
    ownHash =
      case addressCredential (txOutAddress (ownInputResolved ctx)) of
        ScriptCredential h -> h
        _ -> traceError "B1PrizePool: own input not script"
    go [] = 0
    go (o:os) =
      case addressCredential (txOutAddress o) of
        ScriptCredential h
          | h == ownHash ->
              valueLovelace (txOutValue o) + go os
        _ -> go os
  in
    go (txInfoOutputs info)

-- | Decode a PrizeDatum from a TxOut whose address matches the given ScriptHash.
{-# INLINABLE decodePrizeDatumAt #-}
decodePrizeDatumAt :: TxInfo -> ScriptHash -> TxOut -> Maybe PrizeDatum
decodePrizeDatumAt info sh out =
  case addressCredential (txOutAddress out) of
    ScriptCredential h
      | h == sh ->
          case txOutDatum out of
            OutputDatum d -> fromBuiltinData (getDatum d)
            OutputDatumHash dh ->
              case findDatum dh info of
                Just d  -> fromBuiltinData (getDatum d)
                Nothing -> Nothing
            NoOutputDatum -> Nothing
    _ -> Nothing

-- | Find a single output to the PrizeValidator with a decodable PrizeDatum.
{-# INLINABLE findPrizeOutput #-}
findPrizeOutput :: TxInfo -> ScriptHash -> Maybe PrizeDatum
findPrizeOutput info prizeHash =
  go (txInfoOutputs info) Nothing
  where
    go [] found = found
    go (o:os) found =
      case decodePrizeDatumAt info prizeHash o of
        Nothing -> go os found
        Just pd ->
          case found of
            Nothing -> go os (Just pd)
            Just _  -> Nothing  -- multiple prize outputs = invalid

-- | Find owner of ticket NFT among inputs.
{-# INLINABLE ticketOwnerPkh #-}
ticketOwnerPkh :: BuiltinByteString -> BuiltinByteString -> [TxInInfo] -> Maybe PubKeyHash
ticketOwnerPkh _ _ [] = Nothing
ticketOwnerPkh cs bs (i:is) =
  let resolved = txInInfoResolved i
      val = txOutValue resolved
      cs' = CurrencySymbol cs
      tn' = TokenName bs
  in if valueOf val cs' tn' == 1
       then case addressCredential (txOutAddress resolved) of
              PubKeyCredential pkh -> Just pkh
              _ -> Nothing
       else ticketOwnerPkh cs bs is

-- | Check that payout was paid to the given address.
{-# INLINABLE payoutPaidTo #-}
payoutPaidTo :: PubKeyHash -> Integer -> [TxOut] -> Bool
payoutPaidTo _ _ [] = False
payoutPaidTo pkh amt (o:os) =
  let addr = txOutAddress o
      matches = case addressCredential addr of
        PubKeyCredential h -> h == pkh
        _ -> False
  in if matches
       then valueLovelace (txOutValue o) >= amt
       else payoutPaidTo pkh amt os

-- | Check if tx validity range ends at or before expiresAt.
{-# INLINABLE claimBeforeExpiry #-}
claimBeforeExpiry :: Integer -> TxInfo -> Bool
claimBeforeExpiry expiresAt info =
  case ivTo (txInfoValidRange info) of
    UpperBound (Finite t) _ -> getPOSIXTime t <= expiresAt
    _ -> False

-- ============================================================
-- Validator
-- ============================================================

{-# INLINABLE mkValidator #-}
mkValidator
  :: ScriptHash
  -> B1PrizePoolDatum
  -> B1PrizePoolAction
  -> ScriptContext
  -> Bool
mkValidator prizeHash datum action ctx =
  let
    info = scriptContextTxInfo ctx
    nextDatum = findSingleContinuingDatum ctx
    inputLovelace = valueLovelace (txOutValue (ownInputResolved ctx))
  in
    traceIfFalse "B1PrizePool: solvency violated (pre)" (solvencyInvariant datum)
      && case action of

    -- FundTreasury: verify actual ADA increase.
    -- No PrizeDatum check needed — purely accounting.
    FundTreasury ->
      let
        outputLovelace = ownOutputLovelace ctx
        actualIncrease = outputLovelace - inputLovelace
      in
           traceIfFalse "B1PrizePool: fund must increase value" (actualIncrease > 0)
        && traceIfFalse "B1PrizePool: continuing output missing" (isJust nextDatum)
        && case nextDatum of
             Nothing -> False
             Just n  ->
                  ppPendingLiabilities n == ppPendingLiabilities datum
               && ppUnresolvedReserve n == ppUnresolvedReserve datum
               && ppUnresolvedTicketCount n == ppUnresolvedTicketCount datum
               && ppLockedJackpot n == ppLockedJackpot datum
               && ppJackpotThreshold n == ppJackpotThreshold datum
               && ppSuspendedClasses n == ppSuspendedClasses datum
               && ppPrizeHash n == ppPrizeHash datum
               && ppTotalLiquidity n == ppTotalLiquidity datum + actualIncrease
               && solvencyInvariant n

    -- TicketIssued: validate PrizeDatum output, increase count+reserve.
    TicketIssued reservePerTicket ->
         traceIfFalse "B1PrizePool: reserve must be positive" (reservePerTicket > 0)
      && traceIfFalse "B1PrizePool: continuing output missing" (isJust nextDatum)
      && traceIfFalse "B1PrizePool: continuing output missing" (isJust nextDatum)
      && case nextDatum of
           Nothing -> False
           Just n  ->
                case findPrizeOutput info prizeHash of
                  Nothing -> traceError "B1PrizePool: no prize output"
                  Just pd ->
                       pdStatus pd == Pending
                    && pdPrizeAmount pd == 0
                    && pdTicketPolicy pd /= emptyByteString
                    && pdTicketName pd /= emptyByteString
                    && ppTotalLiquidity n == ppTotalLiquidity datum
                    && ppPendingLiabilities n == ppPendingLiabilities datum
                    && ppLockedJackpot n == ppLockedJackpot datum
                    && ppJackpotThreshold n == ppJackpotThreshold datum
                    && ppSuspendedClasses n == ppSuspendedClasses datum
                    && ppPrizeHash n == ppPrizeHash datum
                    && ppUnresolvedTicketCount n == ppUnresolvedTicketCount datum + 1
                    && ppUnresolvedReserve n == ppUnresolvedReserve datum + reservePerTicket
                    && solvencyInvariant n

    -- TicketRevealed: validate PrizeDatum transition, update reserve+liabilities.
    TicketRevealed reserveRelease payout ->
         traceIfFalse "B1PrizePool: reserve release must be non-negative" (reserveRelease >= 0)
      && traceIfFalse "B1PrizePool: payout must be non-negative" (payout >= 0)
      && traceIfFalse "B1PrizePool: count must be positive" (ppUnresolvedTicketCount datum > 0)
      && traceIfFalse "B1PrizePool: continuing output missing" (isJust nextDatum)
      && case nextDatum of
           Nothing -> False
           Just n  ->
                case findPrizeOutput info prizeHash of
                  Nothing -> traceError "B1PrizePool: no prize output"
                  Just pd ->
                       pdStatus pd == Revealed
                    && pdPrizeAmount pd == payout
                    && ppTotalLiquidity n == ppTotalLiquidity datum
                    && ppLockedJackpot n == ppLockedJackpot datum
                    && ppJackpotThreshold n == ppJackpotThreshold datum
                    && ppSuspendedClasses n == ppSuspendedClasses datum
                    && ppPrizeHash n == ppPrizeHash datum
                    && ppUnresolvedTicketCount n == ppUnresolvedTicketCount datum - 1
                    && ppUnresolvedReserve n == ppUnresolvedReserve datum - reserveRelease
                    && ppPendingLiabilities n == ppPendingLiabilities datum + payout
                    && solvencyInvariant n

    -- TicketClaimed: validate owner sig, PrizeDatum transition, payout, reduce liabilities.
    TicketClaimed claimedAmount ->
         traceIfFalse "B1PrizePool: claimed amount must be positive" (claimedAmount > 0)
      && traceIfFalse "B1PrizePool: cannot claim more than pending" (claimedAmount <= ppPendingLiabilities datum)
      && traceIfFalse "B1PrizePool: continuing output missing" (isJust nextDatum)
      && case nextDatum of
           Nothing -> False
           Just n  ->
                case findPrizeOutput info prizeHash of
                  Nothing -> traceError "B1PrizePool: no prize output"
                  Just pd ->
                    let
                      ticketCs = pdTicketPolicy pd
                      ticketTn = pdTicketName pd
                      maybeOwner = ticketOwnerPkh ticketCs ticketTn (txInfoInputs info)
                      ownerSigned = case maybeOwner of
                        Just pkh -> pkh `elem` txInfoSignatories info
                        Nothing  -> False
                      payoutPaid = case maybeOwner of
                        Just pkh -> payoutPaidTo pkh (pdPrizeAmount pd) (txInfoOutputs info)
                        Nothing  -> False
                    in
                         traceIfFalse "B1PrizePool: owner not signed" ownerSigned
                      && traceIfFalse "B1PrizePool: not claimed" (pdStatus pd == Claimed)
                      && traceIfFalse "B1PrizePool: payout mismatch" (pdPrizeAmount pd == claimedAmount)
                      && traceIfFalse "B1PrizePool: payout not received" payoutPaid
                      && ppUnresolvedReserve n == ppUnresolvedReserve datum
                      && ppUnresolvedTicketCount n == ppUnresolvedTicketCount datum
                      && ppLockedJackpot n == ppLockedJackpot datum
                      && ppJackpotThreshold n == ppJackpotThreshold datum
                      && ppSuspendedClasses n == ppSuspendedClasses datum
                      && ppPrizeHash n == ppPrizeHash datum
                      && ppTotalLiquidity n == ppTotalLiquidity datum - claimedAmount
                      && ppPendingLiabilities n == ppPendingLiabilities datum - claimedAmount
                      && solvencyInvariant n

    -- TicketExpired: validate expiry, decrease count+reserve consistently.
    -- reservePerTicket = ppUnresolvedReserve datum / ppUnresolvedTicketCount datum
    -- when count > 0. The off-chain must provide a consistent release.
    TicketExpired ->
         traceIfFalse "B1PrizePool: count must be positive" (ppUnresolvedTicketCount datum > 0)
      && traceIfFalse "B1PrizePool: continuing output missing" (isJust nextDatum)
      && case nextDatum of
           Nothing -> False
           Just n  ->
                case findPrizeOutput info prizeHash of
                  Nothing -> traceError "B1PrizePool: no prize output"
                  Just pd ->
                    let
                      expiresAt = pdExpiresAt pd
                      payout = pdPrizeAmount pd
                      expired = claimBeforeExpiry expiresAt info
                      reservePerTicket =
                        if ppUnresolvedTicketCount datum > 0
                          then ppUnresolvedReserve datum `divide` ppUnresolvedTicketCount datum
                          else 0
                    in
                         traceIfFalse "B1PrizePool: not expired" (not expired)
                      && traceIfFalse "B1PrizePool: payout must be zero for unrevealed" (payout == 0)
                      && traceIfFalse "B1PrizePool: status must be Pending" (pdStatus pd == Pending)
                      && ppTotalLiquidity n == ppTotalLiquidity datum
                      && ppLockedJackpot n == ppLockedJackpot datum
                      && ppJackpotThreshold n == ppJackpotThreshold datum
                      && ppSuspendedClasses n == ppSuspendedClasses datum
                      && ppPrizeHash n == ppPrizeHash datum
                      && ppUnresolvedTicketCount n == ppUnresolvedTicketCount datum - 1
                      && ppUnresolvedReserve n == ppUnresolvedReserve datum - reservePerTicket
                      && ppPendingLiabilities n == ppPendingLiabilities datum
                      && ppUnresolvedReserve n >= 0
                      && solvencyInvariant n

{-# INLINABLE wrap #-}
wrap :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit
wrap prizeHash d r ctx =
  check
    ( mkValidator
        (unsafeFromBuiltinData prizeHash)
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidatorFactory
  :: CompiledCode
       (BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit)
compiledValidatorFactory = $$(compile [|| wrap ||])
