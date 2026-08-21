{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module Treasury where

import           Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx.Prelude         hiding (Semigroup(..), unless)
import qualified PlutusTx
import           Prelude                  (String)

-- Datum: treasury policy parameters for a single distribution cycle.
data TreasuryDatum = TreasuryDatum
  { tdThreshold   :: Integer
  , tdPrizePkh    :: PubKeyHash
  , tdStakePkh    :: PubKeyHash
  , tdReservePkh  :: PubKeyHash
  , tdRelayerPkh  :: PubKeyHash
  , tdPrizePct    :: Integer
  , tdStakePct    :: Integer
  , tdReservePct  :: Integer
  , tdRelayerPct  :: Integer
  }
  deriving (Show)

PlutusTx.unstableMakeIsData ''TreasuryDatum
PlutusTx.makeLift ''TreasuryDatum

data TreasuryAction = Distribute
  deriving (Show)

PlutusTx.unstableMakeIsData ''TreasuryAction
PlutusTx.makeLift ''TreasuryAction

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v = valueOf v adaSymbol adaToken

{-# INLINABLE percentOf #-}
percentOf :: Integer -> Integer -> Integer -> Integer
percentOf total pct basis = (total * pct) `divide` basis

{-# INLINABLE pubKeyHashAddress #-}
pubKeyHashAddress :: PubKeyHash -> Address
pubKeyHashAddress pkh = Address (PubKeyCredential pkh) Nothing

{-# INLINABLE outputLovelaceToPkh #-}
outputLovelaceToPkh :: [TxOut] -> PubKeyHash -> Integer
outputLovelaceToPkh outs pkh =
  foldr (
    o acc ->
      if txOutAddress o == pubKeyHashAddress pkh
        then acc + valueLovelace (txOutValue o)
        else acc
  ) 0 outs

{-# INLINABLE mkValidator #-}
mkValidator :: TreasuryDatum -> TreasuryAction -> ScriptContext -> Bool
mkValidator datum action ctx =
  case action of
    Distribute ->
      let info = scriptContextTxInfo ctx
          ownInput = findOwnInput ctx
          totalIn = case ownInput of
            Just i  -> valueLovelace (txOutValue (txInInfoResolved i))
            Nothing -> 0
          thresholdOk = totalIn >= tdThreshold datum
          pctBasis = 10000
          sumPct = tdPrizePct datum + tdStakePct datum + tdReservePct datum + tdRelayerPct datum
          pctOk = sumPct == pctBasis
          prizeAmt = percentOf totalIn (tdPrizePct datum) pctBasis
          stakeAmt = percentOf totalIn (tdStakePct datum) pctBasis
          reserveAmt = percentOf totalIn (tdReservePct datum) pctBasis
          relayerAmt = percentOf totalIn (tdRelayerPct datum) pctBasis
          outputs = txInfoOutputs info
          paidTo pkh amt = outputLovelaceToPkh outputs pkh >= amt
      in traceIfFalse "treasury: no own input" (isJust ownInput) &&
         traceIfFalse "treasury: threshold not reached" thresholdOk &&
         traceIfFalse "treasury: invalid percentage split" pctOk &&
         traceIfFalse "treasury: prize payout missing" (paidTo (tdPrizePkh datum) prizeAmt) &&
         traceIfFalse "treasury: stake payout missing" (paidTo (tdStakePkh datum) stakeAmt) &&
         traceIfFalse "treasury: reserve payout missing" (paidTo (tdReservePkh datum) reserveAmt) &&
         traceIfFalse "treasury: relayer payout missing" (paidTo (tdRelayerPkh datum) relayerAmt)

validator :: Validator
validator = mkValidatorScript $$(PlutusTx.compile [|| mkValidator ||])

treasuryValidatorHash :: ValidatorHash
treasuryValidatorHash = PlutusV2.validatorHash validator

validatorScript :: Script
validatorScript = unValidatorScript validator
