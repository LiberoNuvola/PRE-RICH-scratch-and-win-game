{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module CounterValidator
  ( mkValidator
  , compiledValidator
  ) where

import           PlutusLedgerApi.V2
import           PlutusLedgerApi.V2.Contexts
import           PlutusTx
import           PlutusTx.Prelude            hiding (Semigroup (..), unless)

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

{-# INLINABLE listLength #-}
listLength :: [a] -> Integer
listLength []     = 0
listLength (_:xs) = 1 + listLength xs

{-# INLINABLE outsAtAddress #-}
outsAtAddress :: Address -> [TxOut] -> [TxOut]
outsAtAddress _ [] = []
outsAtAddress addr (o:os) =
  if txOutAddress o == addr
    then o : outsAtAddress addr os
    else outsAtAddress addr os

{-# INLINABLE nextCounterOuts #-}
nextCounterOuts :: TxInfo -> Integer -> [TxOut] -> [TxOut]
nextCounterOuts _ _ [] = []
nextCounterOuts info current (o:os) =
  case readIntegerDatum info o of
    Just next
      | next == current + 1 -> o : nextCounterOuts info current os
    _ -> nextCounterOuts info current os

{-# INLINABLE mkValidator #-}
mkValidator :: Integer -> () -> ScriptContext -> Bool
mkValidator current _ ctx =
  case findOwnInput ctx of
    Nothing -> traceError "CounterValidator: missing own input"
    Just i  ->
      let info          = scriptContextTxInfo ctx
          ownAddress    = txOutAddress (txInInfoResolved i)
          ownInLovelace = lovelaceOf (txOutValue (txInInfoResolved i))
          scriptOuts    = outsAtAddress ownAddress (txInfoOutputs info)
          nextOuts      = nextCounterOuts info current scriptOuts
          exactlyOneNext    = listLength nextOuts == 1
          noExtraScriptOuts = listLength scriptOuts == 1
          valuePreserved =
            case nextOuts of
              [o] -> lovelaceOf (txOutValue o) >= ownInLovelace
              _   -> False
      in  traceIfFalse "CounterValidator: expected exactly one n+1 counter output" exactlyOneNext
            && traceIfFalse "CounterValidator: unexpected extra script outputs" noExtraScriptOuts
            && traceIfFalse "CounterValidator: script value was drained" valuePreserved

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