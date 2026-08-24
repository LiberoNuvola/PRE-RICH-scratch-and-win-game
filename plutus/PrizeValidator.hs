{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module PrizeValidator
  ( mkValidator
  , compiledValidator
  ) where

import           PlutusLedgerApi.V2
import           PlutusLedgerApi.V2.Contexts
import           PlutusTx
import           PlutusTx.Prelude            hiding (Semigroup (..), unless)
import           Types                       (PrizeDatum (..))

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
        _ -> traceError "PrizeValidator: own input not script"
    Nothing -> traceError "PrizeValidator: missing own input"

{-# INLINABLE countOwnScriptInputs #-}
countOwnScriptInputs :: ScriptContext -> Integer
countOwnScriptInputs ctx = go (txInfoInputs (scriptContextTxInfo ctx))
  where
    thisScriptHash = ownScriptHash ctx
    go [] = 0
    go (txIn:rest) =
      case addressCredential (txOutAddress (txInInfoResolved txIn)) of
        ScriptCredential vh
          | vh == thisScriptHash -> 1 + go rest
        _ -> go rest

{-# INLINABLE pkElem #-}
pkElem :: PubKeyHash -> [PubKeyHash] -> Bool
pkElem _ [] = False
pkElem x (y:ys) = x == y || pkElem x ys

{-# INLINABLE sumToClaimant #-}
sumToClaimant :: Address -> (Value -> Integer) -> [TxOut] -> Integer
sumToClaimant _ _ [] = 0
sumToClaimant addr pick (txOut:rest) =
  if txOutAddress txOut == addr
    then pick (txOutValue txOut) + sumToClaimant addr pick rest
    else sumToClaimant addr pick rest

{-# INLINABLE hasTicketInInputs #-}
hasTicketInInputs :: CurrencySymbol -> TokenName -> [TxInInfo] -> Bool
hasTicketInInputs _ _ [] = False
hasTicketInInputs cs tn (txIn:rest) =
  valueOf (txOutValue (txInInfoResolved txIn)) cs tn > 0
    || hasTicketInInputs cs tn rest

{-# INLINABLE mkValidator #-}
mkValidator :: PrizeDatum -> () -> ScriptContext -> Bool
mkValidator datum _ ctx =
  let info = scriptContextTxInfo ctx
      claimantPkh    = pdClaimantPkh datum
      signedOK       = pkElem claimantPkh (txInfoSignatories info)
      singleOwnInput = countOwnScriptInputs ctx == 1
      ticketCs = CurrencySymbol (pdTicketPolicy datum)
      ticketTn = TokenName (pdTicketName datum)
      hasTicket    = hasTicketInInputs ticketCs ticketTn (txInfoInputs info)
      ticketBurned = valueOf (txInfoMint info) ticketCs ticketTn == negate 1
      isAdaPayment = lengthOfByteString (pdPaymentPolicy datum) == 0
      ownValueCoversPrize =
        case findOwnInput ctx of
          Nothing -> False
          Just i  ->
            let v = txOutValue (txInInfoResolved i)
            in  if isAdaPayment
                  then valueOf v adaSymbol adaToken >= pdPrizeAmount datum
                  else
                    let payCs = CurrencySymbol (pdPaymentPolicy datum)
                        payTn = TokenName (pdPaymentName datum)
                    in  valueOf v payCs payTn >= pdPrizeAmount datum
      claimantAddr = claimAddress claimantPkh
      paysPrize =
        if isAdaPayment
          then
            sumToClaimant claimantAddr (\v -> valueOf v adaSymbol adaToken) (txInfoOutputs info)
              >= pdPrizeAmount datum
          else
            let payCs = CurrencySymbol (pdPaymentPolicy datum)
                payTn = TokenName (pdPaymentName datum)
            in  sumToClaimant claimantAddr (\v -> valueOf v payCs payTn) (txInfoOutputs info)
                  >= pdPrizeAmount datum
  in  traceIfFalse "Missing claimant signature" signedOK
        && traceIfFalse "Only one prize claim allowed per transaction" singleOwnInput
        && traceIfFalse "Prize UTxO does not cover declared amount" ownValueCoversPrize
        && traceIfFalse "Ticket not provided in inputs" hasTicket
        && traceIfFalse "Ticket must be burned in the claim tx" ticketBurned
        && traceIfFalse "Prize not paid to claimant" paysPrize

{-# INLINABLE wrap #-}
wrap :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit
wrap d r ctx =
  check
    ( mkValidator
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidator :: CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit)
compiledValidator = $$(compile [|| wrap ||])