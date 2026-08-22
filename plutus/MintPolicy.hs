
{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings   #-}

module MintPolicy where

-- Minting policy that enforces serial NFTs using an on-chain counter UTxO.
-- The policy expects the `ValidatorHash` of the counter script as parameter.
-- Behaviour:
--  - tx must consume the counter validator UTxO with datum `n`
--  - tx must mint exactly one token whose `TokenName` encodes `n`
--  - tx must produce a new counter UTxO at the same validator address with datum `n+1`
--  - tx must pay at least `priceLovelace` to the sale PubKeyHash

import           Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx.Prelude          hiding (Semigroup(..), unless)
import qualified PlutusTx
import           Prelude                   (String)

{-# INLINABLE tokenNameFromInteger #-}
-- Convert an Integer counter to a TokenName (BuiltinByteString).
tokenNameFromInteger :: Integer -> TokenName
tokenNameFromInteger i = TokenName (integerToBuiltinByteString i)

{-# INLINABLE integerToBuiltinByteString #-}
integerToBuiltinByteString :: Integer -> BuiltinByteString
integerToBuiltinByteString i =
  let s = integerToString i
  in toBuiltin (stringToBuiltinByteString s)

{-# INLINABLE stringToBuiltinByteString #-}
stringToBuiltinByteString :: String -> BuiltinByteString
stringToBuiltinByteString s = toBuiltin (encodeUtf8 s)

{-# INLINABLE integerToString #-}
integerToString :: Integer -> String
integerToString i = fromBuiltin (intToBuiltin i)

-- The above helpers are placeholders: adapt to the actual utilities
-- available in your Plutus version.

{-# INLINABLE valueLovelace #-}
valueLovelace :: Value -> Integer
valueLovelace v = valueOf v adaSymbol adaToken

{-# INLINABLE findCounterInput #-}
findCounterInput :: ValidatorHash -> [TxInInfo] -> Maybe TxInInfo
findCounterInput vhash = find isCounterInput
  where
    isCounterInput txIn = case addressCredential (txOutAddress (txInInfoResolved txIn)) of
      ScriptCredential vh -> vh == vhash
      _                   -> False

{-# INLINABLE readCounterDatum #-}
readCounterDatum :: TxInfo -> TxOut -> Maybe Integer
readCounterDatum info out = do
  dh <- txOutDatumHash out
  d  <- findDatum dh info
  PlutusTx.fromBuiltinData (getDatum d)

{-# INLINABLE hasNextCounterOutput #-}
hasNextCounterOutput :: ValidatorHash -> Integer -> TxInfo -> Bool
hasNextCounterOutput vhash n info = any isNextCounter (txInfoOutputs info)
  where
    isNextCounter out =
      case addressCredential (txOutAddress out) of
        ScriptCredential vh | vh == vhash ->
          case readCounterDatum info out of
            Just m  -> m == n + 1
            Nothing -> False
        _ -> False

{-# INLINABLE lovelacePaidTo #-}
lovelacePaidTo :: PubKeyHash -> [TxOut] -> Integer
lovelacePaidTo pkh = foldl' accumulate 0
  where
    accumulate tot out =
      case addressCredential (txOutAddress out) of
        PubKeyCredential outPkh | outPkh == pkh -> tot + valueLovelace (txOutValue out)
        _                                       -> tot

{-# INLINABLE mintedExpectedToken #-}
mintedExpectedToken :: CurrencySymbol -> TokenName -> Value -> Bool
mintedExpectedToken ownCs expectedName minted =
  length matches == 1
  where
    matches = filter matchOne (flattenValue minted)
    matchOne (cs, tn, amt) = cs == ownCs && tn == expectedName && amt == 1

{-# INLINABLE isPureBurn #-}
-- A "pure burn": every entry minted under our own currency symbol has a
-- negative amount (i.e. this tx only destroys tickets, never creates any).
-- This is what allows PrizeValidator to burn a ticket on claim without
-- satisfying the serial-mint/counter rules below, which only apply to minting.
isPureBurn :: CurrencySymbol -> Value -> Bool
isPureBurn ownCs minted =
  case ownEntries of
    [] -> False
    xs -> all (\(_, _, amt) -> amt < 0) xs
  where
    ownEntries = [ e | e@(cs, _, _) <- flattenValue minted, cs == ownCs ]

{-# INLINABLE mkPolicy #-}
-- The policy expects three parameters:
--  1) the `ValidatorHash` of the counter script
--  2) the `PubKeyHash` (sale address) that must receive the required payment
--  3) the minimum price in lovelace that must be paid to the sale address
mkPolicy :: ValidatorHash -> PubKeyHash -> Integer -> BuiltinData -> ScriptContext -> Bool
mkPolicy vhash salePkh priceLovelace _ ctx
  | isPureBurn (ownCurrencySymbol ctx) (txInfoMint info) = True
  | otherwise =
  case findCounterInput vhash (txInfoInputs info) of
    Nothing -> traceError "counter input not found"
    Just txIn ->
      case readCounterDatum info (txInInfoResolved txIn) of
        Nothing -> traceError "invalid or missing counter datum"
        Just n ->
          let expectedName  = tokenNameFromInteger n
              mintOk         = mintedExpectedToken (ownCurrencySymbol ctx) expectedName (txInfoMint info)
              counterAdvanced = hasNextCounterOutput vhash n info
              paidEnough      = lovelacePaidTo salePkh (txInfoOutputs info) >= priceLovelace
          in traceIfFalse "expected exactly one serial NFT with correct name" mintOk &&
             traceIfFalse "counter UTxO was not advanced to n+1" counterAdvanced &&
             traceIfFalse "sale payment insufficient" paidEnough
  where
    info = scriptContextTxInfo ctx

policyCompiled :: ValidatorHash -> PubKeyHash -> Integer -> MintingPolicy
policyCompiled vh salePkh price =
  mkMintingPolicyScript
    (PlutusV2.mkUntypedMintingPolicy $ mkPolicy vh salePkh price)

plutusScript :: ValidatorHash -> PubKeyHash -> Integer -> Script
plutusScript vh salePkh price = unMintingPolicyScript $ policyCompiled vh salePkh price

-- NOTE: PlutusTx.makeLift instances for `ValidatorHash` and `PubKeyHash` are required
PlutusTx.makeLift ''ValidatorHash
PlutusTx.makeLift ''PubKeyHash
