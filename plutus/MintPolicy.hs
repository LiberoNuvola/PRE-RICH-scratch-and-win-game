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
          in  go q (consByteString (48 + r) emptyByteString `appendByteString` acc)

{-# INLINABLE tokenNameFromInteger #-}
tokenNameFromInteger :: Integer -> TokenName
tokenNameFromInteger i = TokenName (integerToBuiltinByteString i)

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v = valueOf v adaSymbol adaToken

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
      | h == sh -> txIn : findCounterInputs sh rest
    _ -> findCounterInputs sh rest

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
                  | m == n + 1 -> out : go rest
                _ -> go rest
        _ -> go rest

{-# INLINABLE lovelacePaidTo #-}
lovelacePaidTo :: PubKeyHash -> [TxOut] -> Integer
lovelacePaidTo _ [] = 0
lovelacePaidTo pkh (out:rest) =
  case addressCredential (txOutAddress out) of
    PubKeyCredential outPkh
      | outPkh == pkh ->
          valueLovelace (txOutValue out)
            + lovelacePaidTo pkh rest
    _ ->
      lovelacePaidTo pkh rest

{-# INLINABLE ownMintEntries #-}
ownMintEntries
  :: CurrencySymbol
  -> Value
  -> [(CurrencySymbol, TokenName, Integer)]
ownMintEntries ownCs minted = go (flattenValue minted)
  where
    go [] = []
    go (e@(cs, _, _):rest) =
      if cs == ownCs
        then e : go rest
        else go rest

-- | A valid burn under this policy must burn exactly one token
-- belonging to this currency symbol, in quantity -1.
--
-- This deliberately rejects:
--   * burning zero tokens;
--   * burning multiple token names;
--   * burning multiple copies;
--   * burning multiple ticket NFTs in one transaction.
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

{-# INLINABLE mkPolicy #-}
mkPolicy
  :: ScriptHash
  -> PubKeyHash
  -> Integer
  -> ()
  -> ScriptContext
  -> Bool
mkPolicy sh salePkh priceLovelace _ ctx
  | isExactSingleBurn ownCs minted =
      True

  | otherwise =
      case findCounterInputs sh (txInfoInputs info) of
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
                    sh
                    n
                    info

                paidEnough =
                  lovelacePaidTo
                    salePkh
                    (txInfoOutputs info)
                    >= priceLovelace

              in
                   traceIfFalse
                     "expected exactly one serial NFT with correct name"
                     mintOk

                && traceIfFalse
                     "counter UTxO was not advanced to n+1"
                     counterAdvanced

                && traceIfFalse
                     "sale payment insufficient"
                     paidEnough

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
  -> PubKeyHash
  -> Integer
  -> BuiltinData
  -> BuiltinData
  -> BuiltinUnit
wrap sh pkh price r ctx =
  check
    ( mkPolicy
        sh
        pkh
        price
        (unsafeFromBuiltinData r)
        (unsafeFromBuiltinData ctx)
    )

compiledPolicyFactory
  :: CompiledCode
       ( ScriptHash
         -> PubKeyHash
         -> Integer
         -> BuiltinData
         -> BuiltinData
         -> BuiltinUnit
       )
compiledPolicyFactory =
  $$(compile [|| wrap ||])