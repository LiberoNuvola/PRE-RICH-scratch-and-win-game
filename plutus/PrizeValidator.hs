{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

module PrizeValidator
  ( mkValidator
  , compiledValidatorFactory
  ) where

import PlutusLedgerApi.V2
import PlutusLedgerApi.V2.Contexts
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup (..), unless)

import Beacon
  ( playerCommitment
  , deriveBeacon
  , deriveTicketSeed
  , deriveSymbolsSeed
  , encodeBeaconTarget
  , ticketCommitment
  , sameTarget
  , field
  )

import GameRules
  ( PrizeTable
  , classifyTier
  , prizeAmountForTier
  , generateSymbols
  )

import Types
  ( PrizeAction (..)
  , PrizeDatum (..)
  , PrizeStatus (..)
  , BeaconStatus (..)
  , BeaconTarget (..)
  , BeaconRegistryDatum (..)
  , B1PrizePoolDatum (..)
  )

-- ============================================================
-- Helpers
-- ============================================================

{-# INLINABLE claimAddress #-}
claimAddress :: PubKeyHash -> Address
claimAddress pkh =
  Address (PubKeyCredential pkh) Nothing

{-# INLINABLE ownScriptHash #-}
ownScriptHash :: ScriptContext -> ScriptHash
ownScriptHash ctx =
  case findOwnInput ctx of
    Just i ->
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h ->
          h
        _ ->
          traceError "Prize: own input is not script"
    Nothing ->
      traceError "Prize: missing own input"

{-# INLINABLE ownInputResolved #-}
ownInputResolved :: ScriptContext -> TxOut
ownInputResolved ctx =
  case findOwnInput ctx of
    Just i ->
      txInInfoResolved i
    Nothing ->
      traceError "Prize: missing own input"

{-# INLINABLE countOwnScriptInputs #-}
countOwnScriptInputs :: ScriptContext -> Integer
countOwnScriptInputs ctx =
  go (txInfoInputs (scriptContextTxInfo ctx))
  where
    thisHash = ownScriptHash ctx
    go [] = 0
    go (i:is) =
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h
          | h == thisHash ->
              1 + go is
        _ ->
          go is

{-# INLINABLE pkElem #-}
pkElem :: PubKeyHash -> [PubKeyHash] -> Bool
pkElem _ [] = False
pkElem x (y:ys) = x == y || pkElem x ys

{-# INLINABLE ticketOwnerPkh #-}
ticketOwnerPkh
  :: CurrencySymbol
  -> TokenName
  -> [TxInInfo]
  -> Maybe PubKeyHash
ticketOwnerPkh _ _ [] = Nothing
ticketOwnerPkh cs tn (i:is) =
  let resolved = txInInfoResolved i
  in
    if valueOf (txOutValue resolved) cs tn == 1
      then
        case addressCredential (txOutAddress resolved) of
          PubKeyCredential pkh ->
            Just pkh
          _ ->
            Nothing
      else
        ticketOwnerPkh cs tn is

{-# INLINABLE sumToAddress #-}
sumToAddress
  :: Address
  -> (Value -> Integer)
  -> [TxOut]
  -> Integer
sumToAddress _ _ [] = 0
sumToAddress addr pick (o:os) =
  if txOutAddress o == addr
    then pick (txOutValue o) + sumToAddress addr pick os
    else sumToAddress addr pick os

{-# INLINABLE continuingScriptOuts #-}
continuingScriptOuts :: ScriptHash -> [TxOut] -> [TxOut]
continuingScriptOuts _ [] = []
continuingScriptOuts h (o:os) =
  case addressCredential (txOutAddress o) of
    ScriptCredential h'
      | h' == h ->
          o : continuingScriptOuts h os
    _ ->
      continuingScriptOuts h os

{-# INLINABLE valuePreserved #-}
valuePreserved :: ScriptContext -> Bool
valuePreserved ctx =
  let
    ownVal = txOutValue (ownInputResolved ctx)
    ownHash = ownScriptHash ctx
    outs =
      continuingScriptOuts
        ownHash
        (txInfoOutputs (scriptContextTxInfo ctx))
  in
    case outs of
      [o] ->
        txOutValue o == ownVal
      _ ->
        False

{-# INLINABLE decodePrizeDatum #-}
decodePrizeDatum :: TxInfo -> TxOut -> Maybe PrizeDatum
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

{-# INLINABLE findSingleContinuing #-}
findSingleContinuing :: ScriptContext -> Maybe PrizeDatum
findSingleContinuing ctx =
  let
    info = scriptContextTxInfo ctx
    ownHash = ownScriptHash ctx
    isOwnScriptOut o =
      case addressCredential (txOutAddress o) of
        ScriptCredential h ->
          h == ownHash
        _ ->
          False
    go [] found = found
    go (o:os) found =
      if isOwnScriptOut o
        then
          case found of
            Just _ ->
              Nothing
            Nothing ->
              go os (decodePrizeDatum info o)
        else
          go os found
  in
    go (txInfoOutputs info) Nothing

{-# INLINABLE resultBinding #-}
resultBinding :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
resultBinding digest syms =
  sha2_256 (appendByteString (field digest) (field syms))

-- ============================================================
-- B1PrizePool cross-validation
-- ============================================================

{-# INLINABLE decodeB1PrizePoolDatum #-}
decodeB1PrizePoolDatum :: TxInfo -> TxOut -> Maybe B1PrizePoolDatum
decodeB1PrizePoolDatum info out =
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

{-# INLINABLE findB1PrizePoolOutput #-}
findB1PrizePoolOutput :: TxInfo -> BuiltinByteString -> Maybe B1PrizePoolDatum
findB1PrizePoolOutput info poolHashB = go (txInfoOutputs info)
  where
    poolHash = ScriptHash poolHashB
    go [] = Nothing
    go (o:os) =
      case addressCredential (txOutAddress o) of
        ScriptCredential h
          | h == poolHash ->
              case decodeB1PrizePoolDatum info o of
                Just d  -> Just d
                Nothing -> go os
        _ -> go os

{-# INLINABLE readPoolInput #-}
readPoolInput :: TxInfo -> BuiltinByteString -> B1PrizePoolDatum
readPoolInput info poolHashB = go (txInfoInputs info)
  where
    poolHash = ScriptHash poolHashB
    go [] = traceError "Prize: B1PrizePool input missing"
    go (i:is) =
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h
          | h == poolHash ->
              case decodeB1PrizePoolDatum info (txInInfoResolved i) of
                Just d  -> d
                Nothing -> go is
        _ -> go is

-- | Claim allowed only if tx validity range ends at or before expiresAt.
-- Uses POSIX time from txInfoValidRange (ms-compatible Integer compare).
{-# INLINABLE claimBeforeExpiry #-}
claimBeforeExpiry :: Integer -> TxInfo -> Bool
claimBeforeExpiry expiresAt info =
  case ivTo (txInfoValidRange info) of
    UpperBound (Finite t) _ ->
      getPOSIXTime t <= expiresAt
    _ ->
      False

{-# INLINABLE identityFieldsEq #-}
identityFieldsEq :: PrizeDatum -> PrizeDatum -> Bool
identityFieldsEq a b =
     pdTicketPolicy a == pdTicketPolicy b
  && pdTicketName a == pdTicketName b
  && pdPlayerCommitment a == pdPlayerCommitment b
  && pdPriceUsdm a == pdPriceUsdm b
  && pdCommitment a == pdCommitment b
  && pdGameVersion a == pdGameVersion b
  && pdTicketNonce a == pdTicketNonce b
  && pdPaymentPolicy a == pdPaymentPolicy b
  && pdPaymentName a == pdPaymentName b
  && sameTarget (pdBeaconTarget a) (pdBeaconTarget b)
  && pdPrizePoolHash a == pdPrizePoolHash b
  && pdIssuedAt a == pdIssuedAt b
  && pdExpiresAt a == pdExpiresAt b

-- ============================================================
-- Registry reference
-- ============================================================

{-# INLINABLE isRegistryRef #-}
isRegistryRef :: ScriptHash -> TxInInfo -> Bool
isRegistryRef regHash i =
  case addressCredential (txOutAddress (txInInfoResolved i)) of
    ScriptCredential h ->
      h == regHash
    _ ->
      False

{-# INLINABLE decodeRegistryDatum #-}
decodeRegistryDatum :: TxInfo -> TxOut -> Maybe BeaconRegistryDatum
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
readRegistry :: ScriptHash -> TxInfo -> Maybe BeaconRegistryDatum
readRegistry regHash info =
  go (txInfoReferenceInputs info)
  where
    go [] = Nothing
    go (i:is) =
      if isRegistryRef regHash i
        then decodeRegistryDatum info (txInInfoResolved i)
        else go is

-- ============================================================
-- SyncBeacon
-- ============================================================

{-# INLINABLE validateSyncBeacon #-}
validateSyncBeacon
  :: ScriptHash
  -> PrizeDatum
  -> ScriptContext
  -> Bool
validateSyncBeacon regHash datum ctx =
  let
    info = scriptContextTxInfo ctx
    target = pdBeaconTarget datum
  in
    case readRegistry regHash info of
      Nothing ->
        traceIfFalse "Prize: registry ref missing" False

      Just reg ->
        let
          nextOk =
            case findSingleContinuing ctx of
              Nothing ->
                False
              Just n ->
                   identityFieldsEq n datum
                && pdPrizeAmount n == pdPrizeAmount datum
                && pdStatus n == Pending
                && pdBeaconStatus n == BeaconReady
                && pdBeaconValue n == brBeaconValue reg
                && pdMcHash n == brMcHash reg
                && pdMateriosContext n == brMateriosContext reg
                && lengthOfByteString (pdResult n) == 0
                && pdPrizeTier n == 0
        in
             traceIfFalse "Prize: not pending sync" (pdStatus datum == Pending)
          && traceIfFalse "Prize: already synced" (pdBeaconStatus datum == BeaconPending)
          && traceIfFalse "Prize: registry not ready" (brStatus reg == BeaconReady)
          && traceIfFalse "Prize: round mismatch" (brRound reg == btRound target)
          && traceIfFalse "Prize: target mismatch" (sameTarget (brTarget reg) target)
          && traceIfFalse "Prize: empty registry R" (lengthOfByteString (brBeaconValue reg) > 0)
          && traceIfFalse "Prize: multi input" (countOwnScriptInputs ctx == 1)
          && traceIfFalse "Prize: value not preserved (sync)" (valuePreserved ctx)
          && traceIfFalse "Prize: bad sync continuing" nextOk

-- ============================================================
-- Reveal (allowed even after expiry — historical result)
-- ============================================================

{-# INLINABLE validateReveal #-}
validateReveal
  :: PrizeTable
  -> BuiltinByteString
  -> PrizeDatum
  -> BuiltinByteString
  -> ScriptContext
  -> Bool
validateReveal table prizePoolHash datum playerSecret ctx =
  let
    info = scriptContextTxInfo ctx
    target = pdBeaconTarget datum
    roundId = btRound target
    ticketId = pdTicketName datum
    beaconValue = pdBeaconValue datum

    expectedPlayerCommitment =
      playerCommitment roundId (pdTicketNonce datum) playerSecret

    ticketBinding =
      ticketCommitment
        ticketId
        (pdPlayerCommitment datum)
        (pdGameVersion datum)
        (pdTicketNonce datum)
        (pdPriceUsdm datum)
        (encodeBeaconTarget target)

    expectedR =
      deriveBeacon
        (btNetworkId target)
        (btRound target)
        (btMainchainRef target)
        (pdMcHash datum)
        (pdMateriosContext datum)
        (btVersion target)

    finalSeed =
      deriveTicketSeed
        roundId
        (pdTicketNonce datum)
        playerSecret
        beaconValue
        (pdGameVersion datum)

    symbolsSeed = deriveSymbolsSeed finalSeed
    expectedSymbols = generateSymbols symbolsSeed
    expectedResult =
      resultBinding (sha2_256 symbolsSeed) expectedSymbols
    tier = classifyTier expectedSymbols
    amountUsdm =
      prizeAmountForTier table tier (pdPriceUsdm datum)

    nextOk =
      case findSingleContinuing ctx of
        Nothing ->
          False
        Just n ->
             identityFieldsEq n datum
          && pdBeaconStatus n == BeaconReady
          && pdBeaconValue n == beaconValue
          && pdMcHash n == pdMcHash datum
          && pdMateriosContext n == pdMateriosContext datum
          && pdStatus n == Revealed
          && pdResult n == expectedResult
          && pdPrizeTier n == tier
          && pdPrizeAmount n == amountUsdm

    -- B1PrizePool cross-validation: pool accounting must be consistent
    -- with the crystallised payout in the PrizeDatum output.
    -- This ensures PrizeValidator and B1PrizePool update atomically.
    -- The exact reserveRelease is B1PrizePool's domain (redeemer-supplied);
    -- PrizeValidator verifies the fundamental accounting invariants.
    poolOk =
      case findB1PrizePoolOutput info prizePoolHash of
        Nothing ->
          traceIfFalse "Prize: B1PrizePool output missing" False
        Just poolOut ->
          let
            poolIn  = readPoolInput info prizePoolHash
            -- Reveal: payout moves from unresolvedReserve to pendingLiabilities.
            -- totalLiquidity unchanged; pool value unchanged.
            newReserve = ppUnresolvedReserve poolOut
            oldReserve = ppUnresolvedReserve poolIn
          in
               traceIfFalse "Prize: pool liabilities wrong"
                 (ppPendingLiabilities poolOut == ppPendingLiabilities poolIn + amountUsdm)
            && traceIfFalse "Prize: pool reserve must decrease"
                 (newReserve < oldReserve)
            && traceIfFalse "Prize: pool liquidity unchanged"
                 (ppTotalLiquidity poolOut == ppTotalLiquidity poolIn)
            && traceIfFalse "Prize: pool count wrong"
                 (ppUnresolvedTicketCount poolOut == ppUnresolvedTicketCount poolIn - 1)
  in
       traceIfFalse "Prize: already revealed" (pdStatus datum == Pending)
    && traceIfFalse "Prize: beacon not ready" (pdBeaconStatus datum == BeaconReady)
    && traceIfFalse "Prize: empty beacon" (lengthOfByteString beaconValue > 0)
    && traceIfFalse "Prize: beacon rederive mismatch" (beaconValue == expectedR)
    && traceIfFalse "Prize: bad player secret" (expectedPlayerCommitment == pdPlayerCommitment datum)
    && traceIfFalse "Prize: bad ticket commitment" (ticketBinding == pdCommitment datum)
    && traceIfFalse "Prize: bad symbols len" (lengthOfByteString expectedSymbols == 6)
    && traceIfFalse "Prize: multi input" (countOwnScriptInputs ctx == 1)
    && traceIfFalse "Prize: value not preserved (reveal)" (valuePreserved ctx)
    && traceIfFalse "Prize: bad reveal continuing" nextOk
    && traceIfFalse "Prize: pool accounting wrong" poolOk

-- ============================================================
-- Claim
-- Constitution: pay once, keep NFT (no mandatory burn), status → Claimed
-- ============================================================

{-# INLINABLE validateClaim #-}
validateClaim
  :: BuiltinByteString
  -> PrizeDatum
  -> ScriptContext
  -> Bool
validateClaim prizePoolHash datum ctx =
  let
    info = scriptContextTxInfo ctx
    ticketCs = CurrencySymbol (pdTicketPolicy datum)
    ticketTn = TokenName (pdTicketName datum)

    maybeOwner =
      ticketOwnerPkh ticketCs ticketTn (txInfoInputs info)

    ownerSigned =
      case maybeOwner of
        Just pkh ->
          pkElem pkh (txInfoSignatories info)
        Nothing ->
          False

    claimantAddr =
      case maybeOwner of
        Just pkh ->
          claimAddress pkh
        Nothing ->
          traceError "Prize: ticket not in pubkey UTxO"

    paymentPolicy = pdPaymentPolicy datum

    paid =
      if lengthOfByteString paymentPolicy == 0
        then
          sumToAddress
            claimantAddr
            (\v -> valueOf v adaSymbol adaToken)
            (txInfoOutputs info)
            >= pdPrizeAmount datum
        else
          sumToAddress
            claimantAddr
            (\v ->
              valueOf
                v
                (CurrencySymbol paymentPolicy)
                (TokenName (pdPaymentName datum)))
            (txInfoOutputs info)
            >= pdPrizeAmount datum

    -- Continuing UTxO marked Claimed; frozen economic fields immutable.
    nextOk =
      case findSingleContinuing ctx of
        Nothing ->
          False
        Just n ->
             identityFieldsEq n datum
          && pdBeaconStatus n == pdBeaconStatus datum
          && pdBeaconValue n == pdBeaconValue datum
          && pdMcHash n == pdMcHash datum
          && pdMateriosContext n == pdMateriosContext datum
          && pdStatus n == Claimed
          && pdResult n == pdResult datum
          && pdPrizeTier n == pdPrizeTier datum
          && pdPrizeAmount n == pdPrizeAmount datum

    -- B1PrizePool cross-validation: pool accounting must be consistent
    -- with the claimed payout. Claim reduces both totalLiquidity and
    -- pendingLiabilities by the exact crystallised payout.
    payout = pdPrizeAmount datum
    poolOk =
      case findB1PrizePoolOutput info prizePoolHash of
        Nothing ->
          traceIfFalse "Prize: B1PrizePool output missing" False
        Just poolOut ->
          let
            poolIn = readPoolInput info prizePoolHash
          in
               traceIfFalse "Prize: pool liquidity wrong"
                 (ppTotalLiquidity poolOut == ppTotalLiquidity poolIn - payout)
            && traceIfFalse "Prize: pool liabilities wrong"
                 (ppPendingLiabilities poolOut == ppPendingLiabilities poolIn - payout)
            && traceIfFalse "Prize: pool reserve unchanged"
                 (ppUnresolvedReserve poolOut == ppUnresolvedReserve poolIn)
            && traceIfFalse "Prize: pool count unchanged"
                 (ppUnresolvedTicketCount poolOut == ppUnresolvedTicketCount poolIn)
  in
       traceIfFalse "Prize: owner sig" ownerSigned
    && traceIfFalse "Prize: not revealed" (pdStatus datum == Revealed)
    && traceIfFalse "Prize: already claimed" (pdStatus datum /= Claimed)
    && traceIfFalse "Prize: multi input" (countOwnScriptInputs ctx == 1)
    && traceIfFalse "Prize: zero prize" (pdPrizeAmount datum > 0)
    && traceIfFalse "Prize: claim window closed" (claimBeforeExpiry (pdExpiresAt datum) info)
    && traceIfFalse "Prize: payout" paid
    && traceIfFalse "Prize: value not preserved (claim)" (valuePreserved ctx)
    && traceIfFalse "Prize: bad claim continuing" nextOk
    && traceIfFalse "Prize: pool accounting wrong" poolOk
    -- NFT burn is NOT required (constitution: keep after claim).

-- ============================================================
-- Entry
-- ============================================================

{-# INLINABLE mkValidator #-}
mkValidator
  :: ScriptHash
  -> ScriptHash
  -> PrizeTable
  -> PrizeDatum
  -> PrizeAction
  -> ScriptContext
  -> Bool
mkValidator regHash prizePoolHash table datum action ctx =
  let prizePoolBs = case prizePoolHash of ScriptHash bs -> bs
  in case action of
    SyncBeacon ->
      validateSyncBeacon regHash datum ctx
    Reveal playerSecret ->
      validateReveal table prizePoolBs datum playerSecret ctx
    Claim ->
      validateClaim prizePoolBs datum ctx

{-# INLINABLE wrap #-}
wrap
  :: ScriptHash
  -> ScriptHash
  -> PrizeTable
  -> BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinUnit
wrap regHash prizePoolHash table d r ctx =
  check
    (mkValidator
      regHash
      prizePoolHash
      table
      (unsafeFromBuiltinData d)
      (unsafeFromBuiltinData r)
      (unsafeFromBuiltinData ctx))

compiledValidatorFactory
  :: CompiledCode
       ( ScriptHash
         -> ScriptHash
         -> PrizeTable
         -> BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinUnit
       )
compiledValidatorFactory =
  $$(compile [|| wrap ||])