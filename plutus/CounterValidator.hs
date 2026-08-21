{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module CounterValidator where

import           Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx.Prelude         hiding (Semigroup(..), unless)
import qualified PlutusTx
import           Prelude                  (String)

-- The counter UTxO is the serialisation source for minted ticket NFTs.
-- It is intentionally simple: the datum is the current counter value, and any
-- valid spend must produce the next datum value at the same script address.
newtype CounterDatum = CounterDatum Integer
  deriving (Show)

PlutusTx.unstableMakeIsData ''CounterDatum
PlutusTx.makeLift ''CounterDatum

{-# INLINABLE mkValidator #-}
mkValidator :: CounterDatum -> BuiltinData -> ScriptContext -> Bool
mkValidator (CounterDatum current) _ ctx =
  let info = scriptContextTxInfo ctx
      ownInput = findOwnInput ctx
      ownAddress = case ownInput of
        Just i  -> txOutAddress (txInInfoResolved i)
        Nothing -> traceError "CounterValidator: missing own input"
      outputs = txInfoOutputs info
      hasNextCounter =
        any
          (\o ->
            txOutAddress o == ownAddress &&
            case txOutDatumHash o of
              Just dh ->
                case findDatum dh info of
                  Just d ->
                    case PlutusTx.fromBuiltinData (getDatum d) of
                      Just (CounterDatum next) -> next == current + 1
                      _ -> False
                  Nothing -> False
              Nothing -> False
          )
          outputs
  in traceIfFalse "CounterValidator: missing own input" (isJust ownInput) &&
     traceIfFalse "CounterValidator: next counter datum missing" hasNextCounter

validator :: Validator
validator = mkValidatorScript ($$(PlutusTx.compile [|| mkValidator ||]))

counterValidatorHash :: ValidatorHash
counterValidatorHash = PlutusV2.validatorHash validator

validatorScript :: Script
validatorScript = unValidatorScript validator
