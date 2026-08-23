{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module CounterValidator where

import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           PlutusTx
import           PlutusTx.Prelude         hiding (Semigroup (..), unless)

-- Datum = contatore corrente (Integer puro, compatibile con lucid Data.to(n)).
-- Spend valido solo se:
--   1) esiste esattamente un output allo stesso script con datum n+1
--   2) i lovelace bloccati sullo script non diminuiscono

{-# INLINABLE readIntegerDatum #-}
readIntegerDatum :: TxInfo -> TxOut -> Maybe Integer
readIntegerDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      case fromBuiltinData (getDatum d) of
        Just (n :: Integer) -> Just n
        Nothing             -> Nothing
    OutputDatumHash dh ->
      case findDatum dh info of
        Just d ->
          case fromBuiltinData (getDatum d) of
            Just (n :: Integer) -> Just n
            Nothing             -> Nothing
        Nothing -> Nothing
    NoOutputDatum -> Nothing

{-# INLINABLE lovelaceOf #-}
lovelaceOf :: Value -> Integer
lovelaceOf v = valueOf v adaSymbol adaToken

{-# INLINABLE mkValidator #-}
mkValidator :: Integer -> () -> ScriptContext -> Bool
mkValidator current _ ctx =
  let info = scriptContextTxInfo ctx
  in case findOwnInput ctx of
       Nothing -> traceError "CounterValidator: missing own input"
       Just i  ->
         let ownAddress    = txOutAddress (txInInfoResolved i)
             ownInLovelace = lovelaceOf (txOutValue (txInInfoResolved i))

             scriptOuts =
               filter (\o -> txOutAddress o == ownAddress) (txInfoOutputs info)

             nextCounterOuts =
               filter
                 (\o ->
                     case readIntegerDatum info o of
                       Just next -> next == current + 1
                       Nothing   -> False
                 )
                 scriptOuts

             exactlyOneNext = length nextCounterOuts == 1
             noExtraScriptOuts = length scriptOuts == 1

             valuePreserved =
               case nextCounterOuts of
                 [o] -> lovelaceOf (txOutValue o) >= ownInLovelace
                 _   -> False

         in  traceIfFalse "CounterValidator: expected exactly one n+1 counter output" exactlyOneNext
               && traceIfFalse "CounterValidator: unexpected extra script outputs" noExtraScriptOuts
               && traceIfFalse "CounterValidator: script value was drained" valuePreserved

validator :: Validator
validator =
  mkValidatorScript
    $$(compile [|| mkUntypedValidator mkValidator ||])

counterValidatorHash :: ValidatorHash
counterValidatorHash = validatorHash validator
validatorScript :: Script
validatorScript = unValidatorScript validator
```

migliorati ulteriormente, credo
