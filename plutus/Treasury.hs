{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module Treasury where

import           Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts
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
  foldr (\o acc ->
    if txOutAddress o == pubKeyHashAddress pkh
      then acc + valueLovelace (txOutValue o)
      else acc
  ) 0 outs

-- Somma i lovelace di TUTTI gli UTxO provenienti da questo stesso script
-- che vengono spesi in questa transazione, non solo il singolo UTxO che
-- ha innescato questa esecuzione del validator. Necessario perche' il
-- treasury reale accumula molti piccoli UTxO (una fee per acquisto ticket),
-- e il relayer li raccoglie e li spende tutti insieme in un'unica tx di
-- distribuzione.
{-# INLINABLE ownScriptInputsTotalLovelace #-}
ownScriptInputsTotalLovelace :: ScriptContext -> Integer
ownScriptInputsTotalLovelace ctx =
  let thisScriptHash = ownHash ctx
      info = scriptContextTxInfo ctx
  in  foldr
        (\txIn acc ->
            case addressCredential (txOutAddress (txInInfoResolved txIn)) of
              ScriptCredential vh
                | vh == thisScriptHash ->
                    acc + valueLovelace (txOutValue (txInInfoResolved txIn))
              _ -> acc
        )
        0
        (txInfoInputs info)

{-# INLINABLE mkValidator #-}
mkValidator :: TreasuryDatum -> TreasuryAction -> ScriptContext -> Bool
mkValidator datum action ctx =
  case action of
    Distribute ->
      let info = scriptContextTxInfo ctx
          totalIn = ownScriptInputsTotalLovelace ctx
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
      in traceIfFalse "treasury: threshold not reached" thresholdOk &&
         traceIfFalse "treasury: invalid percentage split" pctOk &&
         traceIfFalse "treasury: prize payout missing" (paidTo (tdPrizePkh datum) prizeAmt) &&
         traceIfFalse "treasury: stake payout missing" (paidTo (tdStakePkh datum) stakeAmt) &&
         traceIfFalse "treasury: reserve payout missing" (paidTo (tdReservePkh datum) reserveAmt) &&
         traceIfFalse "treasury: relayer payout missing" (paidTo (tdRelayerPkh datum) relayerAmt)

validator :: Validator
validator = mkValidatorScript $$(PlutusTx.compile [|| mkUntypedValidator mkValidator ||])

treasuryValidatorHash :: ValidatorHash
treasuryValidatorHash = PlutusV2.validatorHash validator

validatorScript :: Script
validatorScript = unValidatorScript validator
