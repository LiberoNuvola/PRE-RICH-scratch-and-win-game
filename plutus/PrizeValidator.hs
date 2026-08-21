{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module PrizeValidator where

-- Minimal Plutus V2 validator skeleton for prize UTxO.
-- Datum: information about prize (assetId, amount, ticket policy etc).
-- Redeemer: claim attempt. Validator checks that the claimant presents (consumes) the corresponding ticket token
-- and that the tx is signed by the claimant address.

import           Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts as Contexts
import qualified Plutus.V1.Ledger.Value    as V
import           Plutus.V1.Ledger.Value    (Value)
import           Plutus.V1.Ledger.Ada      as Ada
import           Plutus.V1.Ledger.Credential (Credential(..))
import           PlutusTx.Prelude         hiding (Semigroup(..), unless)
import qualified PlutusTx
import           Prelude                  (String)

data PrizeDatum = PrizeDatum
    { pdAssetId         :: BuiltinByteString
    , pdPrizeAmount     :: Integer
    , pdTicketPolicy    :: BuiltinByteString
    , pdTicketName      :: BuiltinByteString
    , pdPaymentPolicy   :: BuiltinByteString
    , pdPaymentName     :: BuiltinByteString
    , pdClaimantPkh     :: PubKeyHash
    }

PlutusTx.unstableMakeIsData ''PrizeDatum

{-# INLINABLE claimAddress #-}
claimAddress :: PubKeyHash -> Address
claimAddress pkh = Address (PubKeyCredential pkh) Nothing

{-# INLINABLE mkValidator #-}
mkValidator :: PrizeDatum -> BuiltinData -> ScriptContext -> Bool
mkValidator datum _ ctx =
    let
        info :: TxInfo
        info = scriptContextTxInfo ctx

        claimantPkh :: PubKeyHash
        claimantPkh = pdClaimantPkh datum

        signatories :: [PubKeyHash]
        signatories = txInfoSignatories info

        signedOK :: Bool
        signedOK = elem claimantPkh signatories

        containsTicket :: Value -> Bool
        containsTicket val = let
            cs = CurrencySymbol (pdTicketPolicy datum)
            tn = TokenName (pdTicketName datum)
            amt = V.valueOf val cs tn
          in amt > 0

        hasTicket :: Bool
        hasTicket = any (\txInInfo -> containsTicket (txOutValue $ txInInfoResolved txInInfo)) (txInfoInputs info)

        claimantAddress :: Address
        claimantAddress = claimAddress claimantPkh

        sumAdaToClaimant :: Integer
        sumAdaToClaimant = foldr (\txOut acc ->
                if txOutAddress txOut == claimantAddress
                    then acc + V.valueOf (txOutValue txOut) Ada.adaSymbol Ada.adaToken
                    else acc
            ) 0 (txInfoOutputs info)

        sumAssetToClaimant :: Integer
        sumAssetToClaimant = let
                cs = CurrencySymbol (pdPaymentPolicy datum)
                tn = TokenName (pdPaymentName datum)
            in foldr (\txOut acc ->
                    if txOutAddress txOut == claimantAddress
                        then acc + V.valueOf (txOutValue txOut) cs tn
                        else acc
                ) 0 (txInfoOutputs info)

        isAdaPayment :: Bool
        isAdaPayment = lengthOfByteString (pdPaymentPolicy datum) == 0

        paysPrize :: Bool
        paysPrize = if isAdaPayment
            then sumAdaToClaimant >= pdPrizeAmount datum
            else sumAssetToClaimant >= pdPrizeAmount datum

    in
        traceIfFalse "Missing claimant signature" signedOK &&
        traceIfFalse "Ticket not provided in inputs" hasTicket &&
        traceIfFalse "Prize not paid to claimant" paysPrize

validator :: Validator
validator = mkValidatorScript ($$(PlutusTx.compile [|| mkValidator ||]))

valHash :: ValidatorHash
valHash = validatorHash validator

scrAddress :: Address
scrAddress = scriptHashAddress valHash
