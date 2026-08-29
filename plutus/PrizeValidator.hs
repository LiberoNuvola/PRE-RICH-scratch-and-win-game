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

import GameRules (PrizeTable, classifyTier, prizeAmountForTier)
import Types (PrizeAction (..), PrizeDatum (..), PrizeStatus (..))

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

{-# INLINABLE pkElem #-}
pkElem :: PubKeyHash -> [PubKeyHash] -> Bool
pkElem _ [] = False
pkElem x (y:ys) = x == y || pkElem x ys

{-# INLINABLE ticketOwnerPkh #-}
ticketOwnerPkh :: CurrencySymbol -> TokenName -> [TxInInfo] -> Maybe PubKeyHash
ticketOwnerPkh _ _ [] = Nothing
ticketOwnerPkh cs tn (i:is) =
  let resolved = txInInfoResolved i
  in if valueOf (txOutValue resolved) cs tn == 1
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

{-# INLINABLE integerToBytes #-}
integerToBytes :: Integer -> BuiltinByteString
integerToBytes n
  | n < 0     = integerToBytes 0
  | n == 0    = consByteString 48 emptyByteString
  | otherwise = go n emptyByteString
  where
    go x acc
      | x == 0    = acc
      | otherwise =
          let q = divide x 10
              r = remainder x 10
              digit = consByteString (48 + r) emptyByteString
          in go q (appendByteString digit acc)

{-# INLINABLE field #-}
field :: BuiltinByteString -> BuiltinByteString
field bs = appendByteString (integerToBytes (lengthOfByteString bs)) bs

{-# INLINABLE ticketCommitment #-}
ticketCommitment
  :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
  -> BuiltinByteString -> Integer -> Integer -> BuiltinByteString
  -> BuiltinByteString
ticketCommitment ticketId playerSeed gameVersion opCommitment nonce priceUsdm versionExtra =
  sha2_256
    ( appendByteString (field ticketId)
    $ appendByteString (field playerSeed)
    $ appendByteString (field gameVersion)
    $ appendByteString (field opCommitment)
    $ appendByteString (field (integerToBytes nonce))
    $ appendByteString (field (integerToBytes priceUsdm))
      (field versionExtra)
    )

{-# INLINABLE opSeedCommitment #-}
opSeedCommitment :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
opSeedCommitment seed salt =
  sha2_256 (appendByteString (field seed) (field salt))

{-# INLINABLE ticketDigest #-}
ticketDigest
  :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
  -> Integer -> BuiltinByteString -> BuiltinByteString
ticketDigest seedOp playerSeed ticketId priceUsdm gameVersion =
  sha2_256
    ( appendByteString (field seedOp)
    $ appendByteString (field playerSeed)
    $ appendByteString (field ticketId)
    $ appendByteString (field (integerToBytes priceUsdm))
      (field gameVersion)
    )

{-# INLINABLE resultBinding #-}
resultBinding :: BuiltinByteString -> BuiltinByteString -> BuiltinByteString
resultBinding digest symbols =
  sha2_256 (appendByteString (field digest) (field symbols))

{-# INLINABLE decodePrizeDatum #-}
decodePrizeDatum :: TxInfo -> TxOut -> Maybe PrizeDatum
decodePrizeDatum info out =
  case txOutDatum out of
    OutputDatum d -> fromBuiltinData (getDatum d)
    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing
    NoOutputDatum -> Nothing

{-# INLINABLE findContinuingDatum #-}
findContinuingDatum
  :: PrizeTable -> PrizeDatum -> BuiltinByteString -> Integer -> Integer -> ScriptContext -> Bool
findContinuingDatum table oldDatum expectedResult expectedTier expectedAmountUsdm ctx =
  let
    info = scriptContextTxInfo ctx
    ownHash = ownScriptHash ctx
    checkOut o =
      case addressCredential (txOutAddress o) of
        ScriptCredential h -> h == ownHash
        _                  -> False
    go [] found = found
    go (o:os) found =
      if checkOut o
        then case found of
          Just _  -> Nothing
          Nothing -> go os (decodePrizeDatum info o)
        else go os found
  in
    case go (txInfoOutputs info) Nothing of
      Just next ->
           pdTicketPolicy next  == pdTicketPolicy oldDatum
        && pdTicketName next    == pdTicketName oldDatum
        && pdPlayerSeed next    == pdPlayerSeed oldDatum
        && pdOpCommitment next  == pdOpCommitment oldDatum
        && pdPriceUsdm next     == pdPriceUsdm oldDatum
        && pdCommitment next    == pdCommitment oldDatum
        && pdGameVersion next   == pdGameVersion oldDatum
        && pdTicketNonce next   == pdTicketNonce oldDatum
        && pdPaymentPolicy next == pdPaymentPolicy oldDatum
        && pdPaymentName next   == pdPaymentName oldDatum
        && pdStatus next == Revealed
        && pdResult next == expectedResult
        && pdPrizeTier next == expectedTier
        && expectedAmountUsdm == prizeAmountForTier table expectedTier (pdPriceUsdm oldDatum)
        && pdPrizeAmount next == pdPrizeAmount oldDatum
      Nothing -> False

{-# INLINABLE validateReveal #-}
validateReveal
  :: PrizeTable
  -> PrizeDatum
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> ScriptContext
  -> Bool
validateReveal table datum seedOp saltOp symbols ctx =
  let
    ticketId = pdTicketName datum
    opOk = opSeedCommitment seedOp saltOp == pdOpCommitment datum
    dig = ticketDigest seedOp (pdPlayerSeed datum) ticketId (pdPriceUsdm datum) (pdGameVersion datum)
    expectedResult = resultBinding dig symbols
    tier = classifyTier symbols
    amountUsdm = prizeAmountForTier table tier (pdPriceUsdm datum)
    expectedCommit =
      ticketCommitment
        ticketId
        (pdPlayerSeed datum)
        (pdGameVersion datum)
        (pdOpCommitment datum)
        (pdTicketNonce datum)
        (pdPriceUsdm datum)
        emptyByteString
    outputOk = findContinuingDatum table datum expectedResult tier amountUsdm ctx
  in
       traceIfFalse "Prize: already revealed" (pdStatus datum == Pending)
    && traceIfFalse "Prize: bad op seed" opOk
    && traceIfFalse "Prize: bad ticket commitment" (expectedCommit == pdCommitment datum)
    && traceIfFalse "Prize: bad symbols len" (lengthOfByteString symbols == 6)
    && traceIfFalse "Prize: bad continuing" outputOk

{-# INLINABLE validateClaim #-}
validateClaim :: PrizeDatum -> ScriptContext -> Bool
validateClaim datum ctx =
  let
    info = scriptContextTxInfo ctx
    ticketCs = CurrencySymbol (pdTicketPolicy datum)
    ticketTn = TokenName (pdTicketName datum)
    maybeOwner = ticketOwnerPkh ticketCs ticketTn (txInfoInputs info)
    ownerSigned = case maybeOwner of
      Just pkh -> pkElem pkh (txInfoSignatories info)
      Nothing  -> False
    claimantAddr = case maybeOwner of
      Just pkh -> claimAddress pkh
      Nothing  -> traceError "Prize: ticket not in pubkey UTxO"
    burned = ticketBurned ticketCs ticketTn (txInfoMint info)
    paymentPolicy = pdPaymentPolicy datum
    paid =
      if lengthOfByteString paymentPolicy == 0
        then sumToAddress claimantAddr (\v -> valueOf v adaSymbol adaToken) (txInfoOutputs info)
               >= pdPrizeAmount datum
        else sumToAddress claimantAddr
               (\v -> valueOf v (CurrencySymbol paymentPolicy) (TokenName (pdPaymentName datum)))
               (txInfoOutputs info)
               >= pdPrizeAmount datum
  in
       traceIfFalse "Prize: owner sig" ownerSigned
    && traceIfFalse "Prize: not revealed" (pdStatus datum == Revealed)
    && traceIfFalse "Prize: multi input" (countOwnScriptInputs ctx == 1)
    && traceIfFalse "Prize: zero prize" (pdPrizeAmount datum > 0)
    && traceIfFalse "Prize: burn" burned
    && traceIfFalse "Prize: payout" paid

{-# INLINABLE mkValidator #-}
mkValidator :: PrizeTable -> PrizeDatum -> PrizeAction -> ScriptContext -> Bool
mkValidator table datum action ctx =
  case action of
    Reveal seedOp saltOp symbols ->
      validateReveal table datum seedOp saltOp symbols ctx
    Claim ->
      validateClaim datum ctx

{-# INLINABLE wrap #-}
wrap :: PrizeTable -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit
wrap table d r ctx =
  check
    ( mkValidator
        table
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidatorFactory
  :: CompiledCode (PrizeTable -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit)
compiledValidatorFactory = $$(compile [|| wrap ||])