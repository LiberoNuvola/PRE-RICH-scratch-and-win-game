{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module PrizeValidator where

-- Validator del prize UTxO.
-- Claim valido solo se:
--   1) firmato dal claimant
--   2) esattamente un input di questo script nella tx (un claim per tx)
--   3) il prize UTxO contiene almeno l'importo dichiarato nel datum
--   4) il ticket e' negli input
--   5) il ticket viene bruciato (mint == -1)
--   6) il premio viene pagato al claimant

import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           PlutusTx
import           PlutusTx.Prelude         hiding (Semigroup (..), unless)

data PrizeDatum = PrizeDatum
  { pdPrizeAmount   :: Integer
  , pdTicketPolicy  :: BuiltinByteString
  , pdTicketName    :: BuiltinByteString
  , pdPaymentPolicy :: BuiltinByteString -- empty = ADA
  , pdPaymentName   :: BuiltinByteString
  , pdClaimantPkh   :: PubKeyHash
  }

PlutusTx.unstableMakeIsData ''PrizeDatum
PlutusTx.makeLift ''PrizeDatum

{-# INLINABLE claimAddress #-}
claimAddress :: PubKeyHash -> Address
claimAddress pkh = Address (PubKeyCredential pkh) Nothing

{-# INLINABLE countOwnScriptInputs #-}
countOwnScriptInputs :: ScriptContext -> Integer
countOwnScriptInputs ctx =
  let thisScriptHash = ownHash ctx  -- rinominato per non fare shadowing di
                                     -- Contexts.ownHash (che altrimenti
                                     -- diventerebbe auto-ricorsivo e non
                                     -- tiperebbe)
      info = scriptContextTxInfo ctx
  in  foldr
        (\txIn acc ->
            case addressCredential (txOutAddress (txInInfoResolved txIn)) of
              ScriptCredential vh
                | vh == thisScriptHash -> acc + 1
              _ -> acc
        )
        0
        (txInfoInputs info)

{-# INLINABLE mkValidator #-}
mkValidator :: PrizeDatum -> () -> ScriptContext -> Bool
mkValidator datum _ ctx =
  let info = scriptContextTxInfo ctx

      claimantPkh = pdClaimantPkh datum
      signedOK    = claimantPkh `elem` txInfoSignatories info

      -- Un solo prize claim per transazione: impedisce di aggregare piu'
      -- prize UTxO di questo stesso script nella stessa tx e far coprire
      -- a un unico output condiviso piu' premi contemporaneamente.
      singleOwnInput = countOwnScriptInputs ctx == 1

      ticketCs = CurrencySymbol (pdTicketPolicy datum)
      ticketTn = TokenName (pdTicketName datum)

      containsTicket val = valueOf val ticketCs ticketTn > 0

      hasTicket =
        any
          (\txIn -> containsTicket (txOutValue (txInInfoResolved txIn)))
          (txInfoInputs info)

      ticketBurned =
        valueOf (txInfoMint info) ticketCs ticketTn == negate 1

      isAdaPayment = lengthOfByteString (pdPaymentPolicy datum) == 0

      -- Il prize UTxO deve contenere davvero il premio dichiarato nel datum,
      -- non solo dichiararlo a parole.
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

      sumAdaToClaimant =
        foldr
          (\txOut acc ->
              if txOutAddress txOut == claimantAddr
                then acc + valueOf (txOutValue txOut) adaSymbol adaToken
                else acc
          )
          0
          (txInfoOutputs info)

      sumAssetToClaimant =
        let payCs = CurrencySymbol (pdPaymentPolicy datum)
            payTn = TokenName (pdPaymentName datum)
        in  foldr
              (\txOut acc ->
                  if txOutAddress txOut == claimantAddr
                    then acc + valueOf (txOutValue txOut) payCs payTn
                    else acc
              )
              0
              (txInfoOutputs info)

      paysPrize =
        if isAdaPayment
          then sumAdaToClaimant >= pdPrizeAmount datum
          else sumAssetToClaimant >= pdPrizeAmount datum

  in  traceIfFalse "Missing claimant signature" signedOK
        && traceIfFalse "Only one prize claim allowed per transaction" singleOwnInput
        && traceIfFalse "Prize UTxO does not cover declared amount" ownValueCoversPrize
        && traceIfFalse "Ticket not provided in inputs" hasTicket
        && traceIfFalse "Ticket must be burned in the claim tx" ticketBurned
        && traceIfFalse "Prize not paid to claimant" paysPrize

validator :: Validator
validator =
  mkValidatorScript
    $$(compile [|| mkUntypedValidator mkValidator ||])

valHash :: ValidatorHash
valHash = validatorHash validator

scrAddress :: Address
scrAddress = scriptHashAddress valHash
