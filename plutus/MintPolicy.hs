{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module MintPolicy
  ( mkPolicy
  , compiledPolicyFactory
  ) where

import           PlutusLedgerApi.V2
import           PlutusLedgerApi.V2.Contexts
import           PlutusTx
import           PlutusTx.Prelude            hiding (Semigroup (..), unless)

import           Beacon
  ( encodeBeaconTarget
  , sameTarget
  , ticketCommitment
  )

import           Types
  ( BeaconRegistryDatum (..)
  , BeaconStatus (..)
  , BeaconTarget (..)
  , PrizeDatum (..)
  , PrizeStatus (..)
  )

{-# INLINABLE integerToBuiltinByteString #-}
integerToBuiltinByteString :: Integer -> BuiltinByteString
integerToBuiltinByteString n
  | n < 0     = integerToBuiltinByteString 0
  | n == 0    = consByteString 48 emptyByteString
  | otherwise = go n emptyByteString
  where
    go x acc
      | x == 0    = acc
      | otherwise =
          let q     = divide x 10
              r     = remainder x 10
              digit = consByteString (48 + r) emptyByteString
          in go q (appendByteString digit acc)

{-# INLINABLE tokenNameFromInteger #-}
tokenNameFromInteger :: Integer -> TokenName
tokenNameFromInteger i =
  TokenName (integerToBuiltinByteString i)

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v =
  valueOf v adaSymbol adaToken

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
        Nothing ->
          Nothing

    NoOutputDatum ->
      Nothing

{-# INLINABLE listLength #-}
listLength :: [a] -> Integer
listLength []     = 0
listLength (_:xs) = 1 + listLength xs

{-# INLINABLE findCounterInputs #-}
findCounterInputs :: ScriptHash -> [TxInInfo] -> [TxInInfo]
findCounterInputs _ [] = []
findCounterInputs sh (txIn:rest) =
  case addressCredential (txOutAddress (txInInfoResolved txIn)) of
    ScriptCredential h
      | h == sh ->
          txIn : findCounterInputs sh rest
    _ ->
      findCounterInputs sh rest

{-# INLINABLE hasNextCounterOutput #-}
hasNextCounterOutput :: ScriptHash -> Integer -> TxInfo -> Bool
hasNextCounterOutput sh n info =
  listLength (go (txInfoOutputs info)) == 1
  where
    go [] = []
    go (out:rest) =
      case addressCredential (txOutAddress out) of
        ScriptCredential h
          | h == sh ->
              case readIntegerDatum info out of
                Just m
                  | m == n + 1 ->
                      out : go rest
                _ ->
                  go rest
        _ ->
          go rest

{-# INLINABLE ownMintEntries #-}
ownMintEntries
  :: CurrencySymbol
  -> Value
  -> [(CurrencySymbol, TokenName, Integer)]
ownMintEntries ownCs minted =
  go (flattenValue minted)
  where
    go [] = []
    go (e@(cs, _, _):rest) =
      if cs == ownCs
        then e : go rest
        else go rest

-- A valid burn under this policy must burn exactly one token belonging
-- to this currency symbol, in quantity -1.

{-# INLINABLE isExactSingleBurn #-}
isExactSingleBurn :: CurrencySymbol -> Value -> Bool
isExactSingleBurn ownCs minted =
  case ownMintEntries ownCs minted of
    [(cs, _, amt)] ->
      cs == ownCs && amt == negate 1
    _ ->
      False

{-# INLINABLE mintedExactlyOneSerial #-}
mintedExactlyOneSerial
  :: CurrencySymbol
  -> TokenName
  -> Value
  -> Bool
mintedExactlyOneSerial ownCs expectedName minted =
  case ownMintEntries ownCs minted of
    [(cs, tn, amt)] ->
      cs == ownCs
        && tn == expectedName
        && amt == 1
    _ ->
      False

-- ============================================================
-- Prize UTxO / BeaconRegistry checks
-- ============================================================

{-# INLINABLE decodePrizeDatum #-}
decodePrizeDatum :: TxInfo -> TxOut -> Maybe PrizeDatum
decodePrizeDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      fromBuiltinData (getDatum d)

    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing

    NoOutputDatum ->
      Nothing

-- Requires exactly one output to PrizeValidator with a decodable
-- PrizeDatum. This removes ambiguity about which Prize UTxO belongs
-- to the ticket mint.

{-# INLINABLE findSinglePrizeOutput #-}
findSinglePrizeOutput
  :: ScriptHash
  -> TxInfo
  -> Maybe PrizeDatum
findSinglePrizeOutput prizeHash info =
  go (txInfoOutputs info) Nothing
  where
    isPrizeOut o =
      case addressCredential (txOutAddress o) of
        ScriptCredential h ->
          h == prizeHash
        _ ->
          False

    go [] found =
      found

    go (o:os) found =
      if isPrizeOut o
        then
          case found of
            Just _ ->
              Nothing
            Nothing ->
              go os (decodePrizeDatum info o)
        else
          go os found

{-# INLINABLE decodeRegistryDatum #-}
decodeRegistryDatum
  :: TxInfo
  -> TxOut
  -> Maybe BeaconRegistryDatum
decodeRegistryDatum info out =
  case txOutDatum out of
    OutputDatum d ->
      fromBuiltinData (getDatum d)

    OutputDatumHash dh ->
      case findDatum dh info of
        Just d  -> fromBuiltinData (getDatum d)
        Nothing -> Nothing

    NoOutputDatum ->
      Nothing

{-# INLINABLE readRegistry #-}
readRegistry
  :: ScriptHash
  -> TxInfo
  -> Maybe BeaconRegistryDatum
readRegistry regHash info =
  go (txInfoReferenceInputs info)
  where
    isRegistryRef i =
      case addressCredential (txOutAddress (txInInfoResolved i)) of
        ScriptCredential h ->
          h == regHash
        _ ->
          False

    go [] =
      Nothing

    go (i:is)
      | isRegistryRef i =
          decodeRegistryDatum info (txInInfoResolved i)
      | otherwise =
          go is

{-# INLINABLE newPrizeDatumValid #-}
newPrizeDatumValid
  :: ScriptHash
  -> ScriptHash
  -> CurrencySymbol
  -> TokenName
  -> ScriptContext
  -> Bool
newPrizeDatumValid
  prizeHash
  regHash
  ownCs
  expectedName
  ctx =
    let
      info = scriptContextTxInfo ctx

      CurrencySymbol ownCsBytes =
        ownCs

      TokenName expectedNameBytes =
        expectedName

    in
      case findSinglePrizeOutput prizeHash info of
        Nothing ->
          False

        Just pd ->
          let
            target =
              pdBeaconTarget pd

            ticketBoundOk =
                 pdTicketPolicy pd == ownCsBytes
              && pdTicketName pd == expectedNameBytes

            commitmentOk =
              pdCommitment pd
                == ticketCommitment
                     expectedNameBytes
                     (pdPlayerCommitment pd)
                     (pdGameVersion pd)
                     (pdTicketNonce pd)
                     (pdPriceUsdm pd)
                     (encodeBeaconTarget target)

            freshStateOk =
                 pdStatus pd == Pending
              && pdBeaconStatus pd == BeaconPending
              && pdPrizeTier pd == 0
              && lengthOfByteString (pdResult pd) == 0
              && lengthOfByteString (pdBeaconValue pd) == 0
              && lengthOfByteString (pdMcHash pd) == 0
              && lengthOfByteString (pdMateriosContext pd) == 0

            roundNotYetRevealedOk =
              case readRegistry regHash info of
                Nothing ->
                  False

                Just reg ->
                     sameTarget (brTarget reg) target
                  && brRound reg == btRound target
                  && brStatus reg == BeaconPending

          in
               ticketBoundOk
            && commitmentOk
            && freshStateOk
            && roundNotYetRevealedOk

-- | Mint policy for PRE-RICH serial NFT tickets.
--
-- B1 architecture: buyer pays Treasury (protocol-controlled), not a personal
-- wallet. The MintPolicy does NOT validate the payment destination — that is
-- enforced by the Treasury validator. The MintPolicy only validates:
--   1. Exactly one serial NFT minted with correct name
--   2. Counter UTxO advanced n → n+1
--   3. PrizeDatum output is valid (fresh state, correct commitment)
--   4. BeaconRegistry round not yet revealed
--
-- Payment to Treasury is a separate transaction that must occur before or
-- atomically with the mint. See Game-Economy.md §9 and §10.
--
-- Constitutional requirement: no player payment may be routed through a
-- team-controlled personal wallet (Game-Economy.md §9).
{-# INLINABLE mkPolicy #-}
mkPolicy
  :: ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> ()
  -> ScriptContext
  -> Bool
mkPolicy
  counterHash
  prizeHash
  regHash
  _
  ctx
  | isExactSingleBurn ownCs minted =
      True

  | otherwise =
      case findCounterInputs counterHash (txInfoInputs info) of
        [txIn] ->
          case readIntegerDatum info (txInInfoResolved txIn) of
            Nothing ->
              traceError "invalid or missing counter datum"

            Just n ->
              let
                expectedName =
                  tokenNameFromInteger n

                mintOk =
                  mintedExactlyOneSerial
                    ownCs
                    expectedName
                    minted

                counterAdvanced =
                  hasNextCounterOutput
                    counterHash
                    n
                    info

                prizeOk =
                  newPrizeDatumValid
                    prizeHash
                    regHash
                    ownCs
                    expectedName
                    ctx

              in
                   traceIfFalse
                     "expected exactly one serial NFT with correct name"
                     mintOk

                && traceIfFalse
                     "counter UTxO was not advanced to n+1"
                     counterAdvanced

                && traceIfFalse
                     "prize utxo invalid or round already revealed"
                     prizeOk

        [] ->
          traceError "counter input not found"

        _ ->
          traceError "expected exactly one counter input"

  where
    info =
      scriptContextTxInfo ctx

    ownCs =
      ownCurrencySymbol ctx

    minted =
      txInfoMint info

{-# INLINABLE wrap #-}
wrap
  :: ScriptHash
  -> ScriptHash
  -> ScriptHash
  -> BuiltinData
  -> BuiltinData
  -> BuiltinUnit
wrap counterHash prizeHash regHash r ctx =
  check
    ( mkPolicy
        counterHash
        prizeHash
        regHash
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledPolicyFactory
  :: CompiledCode
       ( ScriptHash
         -> ScriptHash
         -> ScriptHash
         -> BuiltinData
         -> BuiltinData
         -> BuiltinUnit
       )
compiledPolicyFactory =
  $$(compile [|| wrap ||])
