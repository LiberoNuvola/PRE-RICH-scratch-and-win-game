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

{-# INLINABLE pubKeyHashAddress #-}
pubKeyHashAddress :: PubKeyHash -> Address
pubKeyHashAddress pkh = Address (PubKeyCredential pkh) Nothing

{-# INLINABLE outputLovelaceToPkh #-}
outputLovelaceToPkh :: [TxOut] -> PubKeyHash -> Integer
outputLovelaceToPkh [] _ = 0
outputLovelaceToPkh (o:os) pkh =
  if txOutAddress o == pubKeyHashAddress pkh
    then valueLovelace (txOutValue o) + outputLovelaceToPkh os pkh
    else outputLovelaceToPkh os pkh

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
              + tdRelayerPct datum
          pctOk = sumPct == pctBasis
          prizeAmt   = percentOf totalIn (tdPrizePct datum) pctBasis
          stakeAmt   = percentOf totalIn (tdStakePct datum) pctBasis
          reserveAmt = percentOf totalIn (tdReservePct datum) pctBasis
          relayerAmt = percentOf totalIn (tdRelayerPct datum) pctBasis
          outputs = txInfoOutputs info
          paidTo pkh amt = outputLovelaceToPkh outputs pkh >= amt
      in  traceIfFalse "treasury: no own input" (isJust ownInput)
            && traceIfFalse "treasury: threshold not reached" thresholdOk
            && traceIfFalse "treasury: invalid percentage split" pctOk
            && traceIfFalse "treasury: prize payout missing" (paidTo (tdPrizePkh datum) prizeAmt)
            && traceIfFalse "treasury: stake payout missing" (paidTo (tdStakePkh datum) stakeAmt)
            && traceIfFalse "treasury: reserve payout missing" (paidTo (tdReservePkh datum) reserveAmt)
            && traceIfFalse "treasury: relayer payout missing" (paidTo (tdRelayerPkh datum) relayerAmt)

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