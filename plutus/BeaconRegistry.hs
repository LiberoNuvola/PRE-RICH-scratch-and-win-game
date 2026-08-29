{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

-- | Light bridge: one UTxO per PRE-RICH round.
-- Publish once: R = deriveBeacon(target, mcHash, materiosContext).
-- Tickets reference this UTxO; they never invent R alone.

module BeaconRegistry
  ( mkValidator
  , compiledValidator
  ) where

import PlutusLedgerApi.V2
import PlutusLedgerApi.V2.Contexts
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup (..), unless)

import Beacon (deriveBeacon)
import Types
  ( BeaconRegistryDatum (..)
  , BeaconRegistryAction (..)
  , BeaconStatus (..)
  , BeaconTarget (..)
  )

{-# INLINABLE ownAddress #-}
ownAddress :: ScriptContext -> Address
ownAddress ctx =
  case findOwnInput ctx of
    Just i  -> txOutAddress (txInInfoResolved i)
    Nothing -> traceError "Registry: missing own input"

{-# INLINABLE countOwnInputs #-}
countOwnInputs :: Address -> [TxInInfo] -> Integer
countOwnInputs _ [] = 0
countOwnInputs addr (i:is) =
  if txOutAddress (txInInfoResolved i) == addr
    then 1 + countOwnInputs addr is
    else countOwnInputs addr is

{-# INLINABLE decodeReg #-}
decodeReg :: TxInfo -> TxOut -> Maybe BeaconRegistryDatum
decodeReg info out =
  case txOutDatum out of
    OutputDatum d -> fromBuiltinData (getDatum d)
    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing
    NoOutputDatum -> Nothing

{-# INLINABLE findSingleContinuing #-}
findSingleContinuing :: Address -> TxInfo -> Maybe BeaconRegistryDatum
findSingleContinuing addr info = go (txInfoOutputs info) Nothing
  where
    go [] acc = acc
    go (o:os) acc =
      if txOutAddress o == addr
        then case acc of
               Just _  -> Nothing
               Nothing ->
                 case decodeReg info o of
                   Just d  -> go os (Just d)
                   Nothing -> Nothing
        else go os acc

{-# INLINABLE sameTarget #-}
sameTarget :: BeaconTarget -> BeaconTarget -> Bool
sameTarget a b =
     btNetworkId a == btNetworkId b
  && btRound a == btRound b
  && btMainchainRef a == btMainchainRef b
  && btVersion a == btVersion b

{-# INLINABLE validatePublish #-}
validatePublish
  :: BeaconRegistryDatum
  -> BuiltinByteString
  -> BuiltinByteString
  -> ScriptContext
  -> Bool
validatePublish datum mcHash materiosContext ctx =
  let
    info = scriptContextTxInfo ctx
    addr = ownAddress ctx
    target = brTarget datum
    expectedR =
      deriveBeacon
        (btNetworkId target)
        (btRound target)
        (btMainchainRef target)
        mcHash
        materiosContext
        (btVersion target)
    next = findSingleContinuing addr info
  in
       traceIfFalse "Registry: not pending" (brStatus datum == BeaconPending)
    && traceIfFalse "Registry: empty mcHash" (lengthOfByteString mcHash > 0)
    && traceIfFalse "Registry: empty context" (lengthOfByteString materiosContext > 0)
    && traceIfFalse "Registry: multi input" (countOwnInputs addr (txInfoInputs info) == 1)
    && case next of
         Nothing -> traceIfFalse "Registry: no continuing" False
         Just n  ->
              sameTarget (brTarget n) target
           && brStatus n == BeaconReady
           && brBeaconValue n == expectedR
           && brMcHash n == mcHash
           && brMateriosContext n == materiosContext
           && brRound n == brRound datum

{-# INLINABLE mkValidator #-}
mkValidator
  :: BeaconRegistryDatum
  -> BeaconRegistryAction
  -> ScriptContext
  -> Bool
mkValidator datum action ctx =
  case action of
    RegistryPublish mcHash materiosContext ->
      validatePublish datum mcHash materiosContext ctx

{-# INLINABLE wrap #-}
wrap :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit
wrap d r ctx =
  check
    ( mkValidator
        (unsafeFromBuiltinData d)
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledValidator
  :: CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> BuiltinUnit)
compiledValidator = $$(compile [|| wrap ||])