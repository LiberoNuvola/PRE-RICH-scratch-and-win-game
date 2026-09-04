{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module Treasury
  ( mkValidator
  , compiledValidator
  ) where

import           PlutusLedgerApi.V2
import           PlutusLedgerApi.V2.Contexts
import           PlutusTx
import           PlutusTx.Prelude            hiding (Semigroup (..), unless)
import           Types                       (TreasuryAction (..), TreasuryDatum (..))

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v = valueOf v adaSymbol adaToken

{-# INLINABLE percentOf #-}
percentOf :: Integer -> Integer -> Integer -> Integer
percentOf total pct basis = (total * pct) `divide` basis

-- | Check that lovelace paid to an address matching a ScriptHash.
{-# INLINABLE paidToScriptHash #-}
paidToScriptHash :: [TxOut] -> ScriptHash -> Integer -> Bool
paidToScriptHash [] _ _ = False
paidToScriptHash (o:os) sh amt =
  let addr = txOutAddress o
      matches =
        case addressCredential addr of
          ScriptCredential h -> h == sh
          _ -> False
  in if matches
       then valueLovelace (txOutValue o) >= amt
       else paidToScriptHash os sh amt

{-# INLINABLE mkValidator #-}
mkValidator :: TreasuryDatum -> TreasuryAction -> ScriptContext -> Bool
mkValidator datum action ctx =
  case action of
    Distribute ->
      let info = scriptContextTxInfo ctx
          ownInput = findOwnInput ctx
          totalIn =
            case ownInput of
              Just i  -> valueLovelace (txOutValue (txInInfoResolved i))
              Nothing -> 0
          thresholdOk = totalIn >= tdThreshold datum
          pctBasis = 10000
          sumPct =
            tdPrizePct datum
              + tdStakePct datum
              + tdReservePct datum
              + tdMaintenancePct datum
          pctOk = sumPct == pctBasis
          prizeAmt   = percentOf totalIn (tdPrizePct datum) pctBasis
          stakeAmt   = percentOf totalIn (tdStakePct datum) pctBasis
          reserveAmt = percentOf totalIn (tdReservePct datum) pctBasis
          maintAmt   = percentOf totalIn (tdMaintenancePct datum) pctBasis
          outputs = txInfoOutputs info
      in  traceIfFalse "treasury: no own input" (isJust ownInput)
            && traceIfFalse "treasury: threshold not reached" thresholdOk
            && traceIfFalse "treasury: invalid percentage split" pctOk
            && traceIfFalse "treasury: prize payout missing (script)"
                (paidToScriptHash outputs (tdPrizeScriptHash datum) prizeAmt)
            && traceIfFalse "treasury: stake payout missing (script)"
                (paidToScriptHash outputs (tdStakeScriptHash datum) stakeAmt)
            && traceIfFalse "treasury: reserve payout missing (script)"
                (paidToScriptHash outputs (tdReserveScriptHash datum) reserveAmt)
            && traceIfFalse "treasury: maintenance payout missing (script)"
                (paidToScriptHash outputs (tdMaintenanceScriptHash datum) maintAmt)

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
