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
  , field
  , integerToBytes
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
  )

-- ============================================================
-- Address / script helpers
-- ============================================================

{-# INLINABLE claimAddress #-}
claimAddress :: PubKeyHash -> Address
claimAddress pkh = Address (PubKeyCredential pkh) Nothing

{-# INLINABLE ownScriptHash #-}
ownScriptHash :: ScriptContext -> ScriptHash
ownScriptHash ctx =
  case findOwnInput ctx of
    Just i ->
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h -> h
        _                  -> traceError "Prize: own input is not script"
    Nothing ->
      traceError "Prize: missing own input"

{-# INLINABLE ownInputResolved #-}
ownInputResolved :: ScriptContext -> TxOut
ownInputResolved ctx =
  case findOwnInput ctx of
    Just i  -> txInInfoResolved i
    Nothing -> traceError "Prize: missing own input"

{-# INLINABLE countOwnScriptInputs #-}
countOwnScriptInputs :: ScriptContext -> Integer
countOwnScriptInputs ctx = go (txInfoInputs (scriptContextTxInfo ctx))
  where
    thisHash = ownScriptHash ctx
    go [] = 0
    go (i:is) =
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h | h == thisHash -> 1 + go is
        _                                  -> go is

{-# INLINABLE countScriptOutsAt #-}
countScriptOutsAt :: ScriptHash -> [TxOut] -> Integer
countScriptOutsAt _ [] = 0
countScriptOutsAt h (o:os) =
  case addressCredential (txOutAddress o) of
    ScriptCredential h' | h' == h -> 1 + countScriptOutsAt h os
    _                             -> countScriptOutsAt h os

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
  in  if valueOf (txOutValue resolved) cs tn == 1
        then case addressCredential (txOutAddress resolved) of
               PubKeyCredential pkh -> Just pkh
               _                    -> Nothing
        else ticketOwnerPkh cs tn is

{-# INLINABLE ticketBurned #-}
ticketBurned :: CurrencySymbol -> TokenName -> Value -> Bool
ticketBurned cs tn minted = valueOf minted cs tn == negate 1

{-# INLINABLE sumToAddress #-}
sumToAddress :: Address -> (Value -> Integer) -> [TxOut] -> Integer
sumToAddress _ _ [] = 0
sumToAddress addr pick (o:os) =
  if txOutAddress o == addr
    then pick (txOutValue o) + sumToAddress addr pick os
    else sumToAddress addr pick os

-- ============================================================
-- Value lock (Sync / Reveal): exact conservation
-- ============================================================

{-# INLINABLE continuingScriptOuts #-}
continuingScriptOuts :: ScriptHash -> [TxOut] -> [TxOut]
continuingScriptOuts _ [] = []
continuingScriptOuts h (o:os) =
  case addressCredential (txOutAddress o) of
    ScriptCredential h' | h' == h -> o : continuingScriptOuts h os
    _                             -> continuingScriptOuts h os

-- | Exactly one continuing output at this script, with identical Value
-- (ADA + every native asset, same quantities). Prevents any drain or
-- asset substitution during SyncBeacon / Reveal.
{-# INLINABLE valuePreserved #-}
valuePreserved :: ScriptContext -> Bool
valuePreserved ctx =
  let ownVal  = txOutValue (ownInputResolved ctx)
      ownHash = ownScriptHash ctx
      outs    = continuingScriptOuts ownHash (txInfoOutputs (scriptContextTxInfo ctx))
  in  case outs of
        [o] -> txOutValue o == ownVal
        _   -> False

-- ============================================================
-- Datum decoding
-- ============================================================

{-# INLINABLE decodePrizeDatum #-}
decodePrizeDatum :: TxInfo -> TxOut -> Maybe PrizeDatum
decodePrizeDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      fromBuiltinData (getDatum d)
    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing
    NoOutputDatum ->
      Nothing

{-# INLINABLE sameTarget #-}
sameTarget :: BeaconTarget -> BeaconTarget -> Bool
sameTarget a b =
     btNetworkId a == btNetworkId b
  && btRound a == btRound b
  && btMainchainRef a == btMainchainRef b
  && btVersion a == btVersion b

{-# INLINABLE findSingleContinuing #-}
findSingleContinuing :: ScriptContext -> Maybe PrizeDatum
findSingleContinuing ctx =
  let
    info    = scriptContextTxInfo ctx
    ownHash = ownScriptHash ctx
    isOwnScriptOut o =
      case addressCredential (txOutAddress o) of
        ScriptCredential h -> h == ownHash
        _                  -> False
    go [] found = found
    go (o:os) found =
      if isOwnScriptOut o
        then case found of
               Just _  -> Nothing
               Nothing -> go os (decodePrizeDatum info o)
        else go os found
  in
    go (txInfoOutputs info) Nothing

-- ============================================================
-- Commitments / binding
-- ============================================================

{-# INLINABLE ticketCommitment #-}
ticketCommitment
  :: BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
ticketCommitment ticketId playerCommitmentValue gameVersion nonce priceUsdm beaconTargetEnc =
  sha2_256
    ( appendByteString (field "PRE-RICH/TICKET/V2")
    $ appendByteString (field ticketId)
    $ appendByteString (field playerCommitmentValue)
    $ appendByteString (field gameVersion)
    $ appendByteString (field (integerToBytes nonce))
    $ appendByteString (field (integerToBytes priceUsdm))
      (field beaconTargetEnc)
    )

{-# INLINABLE resultBinding #-}
resultBinding :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
resultBinding digest syms =
  sha2_256 (appendByteString (field digest) (field syms))

-- ============================================================
-- Registry reference input
-- ============================================================

{-# INLINABLE isRegistryRef #-}
isRegistryRef :: ScriptHash -> TxInInfo -> Bool
isRegistryRef regHash i =
  case addressCredential (txOutAddress (txInInfoResolved i)) of
    ScriptCredential h -> h == regHash
    _                  -> False

{-# INLINABLE decodeRegistryDatum #-}
decodeRegistryDatum :: TxInfo -> TxOut -> Maybe BeaconRegistryDatum
decodeRegistryDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      fromBuiltinData (getDatum d)
    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing
    NoOutputDatum ->
      Nothing

{-# INLINABLE readRegistry #-}
readRegistry :: ScriptHash -> TxInfo -> Maybe BeaconRegistryDatum
readRegistry regHash info = go (txInfoReferenceInputs info)
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
    info   = scriptContextTxInfo ctx
    target = pdBeaconTarget datum
  in
    case readRegistry regHash info of
      Nothing ->
        traceIfFalse "Prize: registry ref missing" False
      Just reg ->
        let
          nextOk =
            case findSingleContinuing ctx of
              Nothing -> False
              Just n  ->
                   pdTicketPolicy n == pdTicketPolicy datum
                && pdTicketName n == pdTicketName datum
                && pdPlayerCommitment n == pdPlayerCommitment datum
                && pdPriceUsdm n == pdPriceUsdm datum
                && pdCommitment n == pdCommitment datum
                && pdGameVersion n == pdGameVersion datum
                && pdTicketNonce n == pdTicketNonce datum
                && pdPrizeAmount n == pdPrizeAmount datum
                && pdPaymentPolicy n == pdPaymentPolicy datum
                && pdPaymentName n == pdPaymentName datum
                && pdStatus n == Pending
                && sameTarget (pdBeaconTarget n) target
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
-- Reveal
-- ============================================================

{-# INLINABLE validateReveal #-}
validateReveal
  :: PrizeTable
  -> PrizeDatum
  -> BuiltinByteString
  -> ScriptContext
  -> Bool
validateReveal table datum playerSecret ctx =
  let
    target      = pdBeaconTarget datum
    roundId     = btRound target
    ticketId    = pdTicketName datum
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

    symbolsSeed     = deriveSymbolsSeed finalSeed
    expectedSymbols = generateSymbols symbolsSeed
    expectedResult  = resultBinding (sha2_256 symbolsSeed) expectedSymbols
    tier            = classifyTier expectedSymbols
    amountUsdm      = prizeAmountForTier table tier (pdPriceUsdm datum)

    nextOk =
      case findSingleContinuing ctx of
        Nothing -> False
        Just n  ->
             pdTicketPolicy n == pdTicketPolicy datum
          && pdTicketName n == pdTicketName datum
          && pdPlayerCommitment n == pdPlayerCommitment datum
          && pdPriceUsdm n == pdPriceUsdm datum
          && pdCommitment n == pdCommitment datum
          && pdGameVersion n == pdGameVersion datum
          && pdTicketNonce n == pdTicketNonce datum
          && pdPaymentPolicy n == pdPaymentPolicy datum
          && pdPaymentName n == pdPaymentName datum
          && sameTarget (pdBeaconTarget n) target
          && pdBeaconStatus n == BeaconReady
          && pdBeaconValue n == beaconValue
          && pdMcHash n == pdMcHash datum
          && pdMateriosContext n == pdMateriosContext datum
          && pdStatus n == Revealed
          && pdResult n == expectedResult
          && pdPrizeTier n == tier
          && pdPrizeAmount n == amountUsdm
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

-- ============================================================
-- Claim
-- ============================================================

{-# INLINABLE validateClaim #-}
validateClaim :: PrizeDatum -> ScriptContext -> Bool
validateClaim datum ctx =
  let
    info       = scriptContextTxInfo ctx
    ownHash    = ownScriptHash ctx
    ticketCs   = CurrencySymbol (pdTicketPolicy datum)
    ticketTn   = TokenName (pdTicketName datum)
    maybeOwner = ticketOwnerPkh ticketCs ticketTn (txInfoInputs info)
    ownerSigned =
      case maybeOwner of
        Just pkh -> pkElem pkh (txInfoSignatories info)
        Nothing  -> False
    claimantAddr =
      case maybeOwner of
        Just pkh -> claimAddress pkh
        Nothing  -> traceError "Prize: ticket not in pubkey UTxO"
    burned = ticketBurned ticketCs ticketTn (txInfoMint info)
    paymentPolicy = pdPaymentPolicy datum
    paid =
      if lengthOfByteString paymentPolicy == 0
        then
          sumToAddress claimantAddr
            (\v -> valueOf v adaSymbol adaToken)
            (txInfoOutputs info)
            >= pdPrizeAmount datum
        else
          sumToAddress claimantAddr
            (\v ->
              valueOf v
                (CurrencySymbol paymentPolicy)
                (TokenName (pdPaymentName datum))
            )
            (txInfoOutputs info)
            >= pdPrizeAmount datum
    scriptClosed =
      countScriptOutsAt ownHash (txInfoOutputs info) == 0
  in
       traceIfFalse "Prize: owner sig" ownerSigned
    && traceIfFalse "Prize: not revealed" (pdStatus datum == Revealed)
    && traceIfFalse "Prize: multi input" (countOwnScriptInputs ctx == 1)
    && traceIfFalse "Prize: zero prize" (pdPrizeAmount datum > 0)
    && traceIfFalse "Prize: burn" burned
    && traceIfFalse "Prize: payout" paid
    && traceIfFalse "Prize: must close script utxo" scriptClosed

-- ============================================================
-- Entry
-- ============================================================

{-# INLINABLE mkValidator #-}
mkValidator
  :: ScriptHash
  -> PrizeTable
  -> PrizeDatum
  -> PrizeAction
  -> ScriptContext
  -> Bool
mkValidator regHash table datum action ctx =
  case action of
    SyncBeacon ->
      validateSyncBeacon regHash datum ctx
    Reveal playerSecret ->
      validateReveal table datum playerSecret ctx
    Claim ->
      validateClaim datum ctx

{-# INLINABLE wrap #-}
wrap
  :: ScriptHash
  -> PrizeTable
  -> BuiltinData
  -> BuiltinData
  -> BuiltinData
  -> BuiltinUnit
wrap regHash table d r ctx =
  check
    ( mkValidator
        regHash
        table
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidatorFactory
  :: CompiledCode
       ( ScriptHash
         -> PrizeTable
         -> BuiltinData
         -> BuiltinData
         -> BuiltinData
         -> BuiltinUnit
       )
compiledValidatorFactory = $$(compile [|| wrap ||])