{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module PrizePool where

import           Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx.Prelude         hiding (Semigroup(..), unless)
import qualified PlutusTx
import           Prelude                  (String)

-- Prize pool datum: maintain deterministic selection and allow refill operations.
data PrizePoolDatum = PrizePoolDatum
  { ppPoolSize  :: Integer
  , ppNextIndex :: Integer
  , ppSeed      :: BuiltinByteString
  }
  deriving (Show)

PlutusTx.unstableMakeIsData ''PrizePoolDatum
PlutusTx.makeLift ''PrizePoolDatum

data PrizePoolAction = Claim Integer | Refill Integer
  deriving (Show)

PlutusTx.unstableMakeIsData ''PrizePoolAction
PlutusTx.makeLift ''PrizePoolAction

{-# INLINABLE selectedIndex #-}
selectedIndex :: BuiltinByteString -> Integer -> Integer
selectedIndex seed poolSize =
  if poolSize <= 0
    then 0
    else (lengthOfByteString seed) `mod` poolSize

{-# INLINABLE mkValidator #-}
mkValidator :: PrizePoolDatum -> PrizePoolAction -> ScriptContext -> Bool
mkValidator datum action ctx =
  let info = scriptContextTxInfo ctx
      ownInput = findOwnInput ctx
      ownAddress = case ownInput of
        Just i -> txOutAddress (txInInfoResolved i)
        Nothing -> traceError "PrizePool: no input"
      outputs = txInfoOutputs info
      scriptOutputExists = any (\o -> txOutAddress o == ownAddress) outputs
      poolSizeOk = ppPoolSize datum > 0
      nextIndexOk = ppNextIndex datum >= 0 && ppNextIndex datum < ppPoolSize datum
      selected = selectedIndex (ppSeed datum) (ppPoolSize datum)
  in case action of
       Claim idx ->
         traceIfFalse "PrizePool: no input" (isJust ownInput) &&
         traceIfFalse "PrizePool: invalid pool size" poolSizeOk &&
         traceIfFalse "PrizePool: invalid target index" (idx >= 0 && idx < ppPoolSize datum) &&
         traceIfFalse "PrizePool: index must match current next index" (idx == ppNextIndex datum) &&
         traceIfFalse "PrizePool: selected index must stay consistent" (selected == ppNextIndex datum) &&
         traceIfFalse "PrizePool: script output missing" scriptOutputExists

       Refill idx ->
         traceIfFalse "PrizePool: no input" (isJust ownInput) &&
         traceIfFalse "PrizePool: invalid pool size" poolSizeOk &&
         traceIfFalse "PrizePool: invalid refill index" (idx >= 0 && idx < ppPoolSize datum) &&
         traceIfFalse "PrizePool: refill output missing" scriptOutputExists &&
         traceIfFalse "PrizePool: next index out of range" (ppNextIndex datum >= 0 && ppNextIndex datum < ppPoolSize datum)

validator :: Validator
validator = mkValidatorScript ($$(PlutusTx.compile [|| mkValidator ||]))

prizePoolValidatorHash :: ValidatorHash
prizePoolValidatorHash = PlutusV2.validatorHash validator

scriptAddress :: Address
scriptAddress = scriptHashAddress prizePoolValidatorHash
