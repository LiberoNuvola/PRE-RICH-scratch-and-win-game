{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module PrizePool
  ( mkValidator
  , compiledValidator
  ) where

import           PlutusLedgerApi.V2
import           PlutusLedgerApi.V2.Contexts
import           PlutusTx
import           PlutusTx.Prelude            hiding (Semigroup (..), unless)
import           Types                       (PrizePoolAction (..), PrizePoolDatum (..))

{-# INLINABLE bsToInteger #-}
bsToInteger :: BuiltinByteString -> Integer
bsToInteger bs = go 0 0
  where
    len = lengthOfByteString bs
    go i acc
      | i >= len  = acc
      | otherwise = go (i + 1) ((acc * 256) + indexByteString bs i)

{-# INLINABLE selectedIndex #-}
selectedIndex :: BuiltinByteString -> Integer -> Integer
selectedIndex seed poolSize =
  if poolSize <= 0
    then 0
    else remainder (bsToInteger (sha2_256 seed)) poolSize

{-# INLINABLE hasScriptOutput #-}
hasScriptOutput :: Address -> [TxOut] -> Bool
hasScriptOutput _ [] = False
hasScriptOutput addr (o:os) =
  txOutAddress o == addr || hasScriptOutput addr os

{-# INLINABLE mkValidator #-}
mkValidator :: PrizePoolDatum -> PrizePoolAction -> ScriptContext -> Bool
mkValidator datum action ctx =
  let info = scriptContextTxInfo ctx
      ownInput = findOwnInput ctx
      ownAddress =
        case ownInput of
          Just i  -> txOutAddress (txInInfoResolved i)
          Nothing -> traceError "PrizePool: no input"
      outputs = txInfoOutputs info
      scriptOutputExists = hasScriptOutput ownAddress outputs
      poolSizeOk = ppPoolSize datum > 0
      selected = selectedIndex (ppSeed datum) (ppPoolSize datum)
  in case action of
       Claim idx ->
         traceIfFalse "PrizePool: no input" (isJust ownInput)
           && traceIfFalse "PrizePool: invalid pool size" poolSizeOk
           && traceIfFalse "PrizePool: invalid target index" (idx >= 0 && idx < ppPoolSize datum)
           && traceIfFalse "PrizePool: index must match current next index" (idx == ppNextIndex datum)
           && traceIfFalse "PrizePool: selected index must stay consistent" (selected == ppNextIndex datum)
           && traceIfFalse "PrizePool: script output missing" scriptOutputExists
       Refill idx ->
         traceIfFalse "PrizePool: no input" (isJust ownInput)
           && traceIfFalse "PrizePool: invalid pool size" poolSizeOk
           && traceIfFalse "PrizePool: invalid refill index" (idx >= 0 && idx < ppPoolSize datum)
           && traceIfFalse "PrizePool: refill output missing" scriptOutputExists
           && traceIfFalse "PrizePool: next index out of range"
                (ppNextIndex datum >= 0 && ppNextIndex datum < ppPoolSize datum)

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