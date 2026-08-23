{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}

module MintPolicy where

-- Minting policy per NFT seriali legati a un counter on-chain.
--
-- Parametri:
--   1) ValidatorHash del CounterValidator
--   2) PubKeyHash che deve ricevere il pagamento
--   3) prezzo minimo in lovelace
--
-- Path mint:
--   - esattamente un input counter
--   - esattamente +1 token con TokenName = decimal ASCII di n
--   - nessun altro asset mintato sotto questa policy
--   - counter avanzato a n+1
--   - pagamento >= priceLovelace al salePkh
--
-- Path burn (pure burn):
--   - sotto questa policy solo amount negativi
--   - usato dal claim in PrizeValidator

import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           PlutusTx
import           PlutusTx.Prelude         hiding (Semigroup (..), unless)

{-# INLINABLE integerToBuiltinByteString #-}
integerToBuiltinByteString :: Integer -> BuiltinByteString
integerToBuiltinByteString n
  | n < 0     = integerToBuiltinByteString 0
  | n == 0    = consByteString 48 emptyByteString
  | otherwise = go n emptyByteString
  where
    go 0 acc = acc
    go x acc =
      let (q, r) = quotRem x 10
          digit  = consByteString (48 + r) emptyByteString
      in  go q (appendByteString digit acc)

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
    NoOutputDatum -> Nothing

{-# INLINABLE findCounterInputs #-}
findCounterInputs :: ValidatorHash -> [TxInInfo] -> [TxInInfo]
findCounterInputs vhash =
  filter
    (\txIn ->
        case addressCredential (txOutAddress (txInInfoResolved txIn)) of
          ScriptCredential vh -> vh == vhash
          _                   -> False
    )

{-# INLINABLE hasNextCounterOutput #-}
hasNextCounterOutput :: ValidatorHash -> Integer -> TxInfo -> Bool
hasNextCounterOutput vhash n info =
  length matches == 1
  where
    matches =
      filter
        (\out ->
            case addressCredential (txOutAddress out) of
              ScriptCredential vh
                | vh == vhash ->
                    case readIntegerDatum info out of
                      Just m  -> m == n + 1
                      Nothing -> False
              _ -> False
        )
        (txInfoOutputs info)

{-# INLINABLE lovelacePaidTo #-}
lovelacePaidTo :: PubKeyHash -> [TxOut] -> Integer
lovelacePaidTo pkh =
  foldl'
    (\tot out ->
        case addressCredential (txOutAddress out) of
          PubKeyCredential outPkh
            | outPkh == pkh -> tot + valueLovelace (txOutValue out)
          _ -> tot
    )
    0

{-# INLINABLE ownMintEntries #-}
ownMintEntries :: CurrencySymbol -> Value -> [(CurrencySymbol, TokenName, Integer)]
ownMintEntries ownCs minted =
  [ e | e@(cs, _, _) <- flattenValue minted, cs == ownCs ]

{-# INLINABLE isPureBurn #-}
isPureBurn :: CurrencySymbol -> Value -> Bool
isPureBurn ownCs minted =
  case ownMintEntries ownCs minted of
    [] -> False
    xs -> all (\(_, _, amt) -> amt < 0) xs

{-# INLINABLE mintedExactlyOneSerial #-}
mintedExactlyOneSerial :: CurrencySymbol -> TokenName -> Value -> Bool
mintedExactlyOneSerial ownCs expectedName minted =
  case ownMintEntries ownCs minted of
    [(cs, tn, amt)] -> cs == ownCs && tn == expectedName && amt == 1
    _               -> False

{-# INLINABLE mkPolicy #-}
mkPolicy :: ValidatorHash -> PubKeyHash -> Integer -> () -> ScriptContext -> Bool
mkPolicy vhash salePkh priceLovelace _ ctx
  | isPureBurn ownCs minted = True
  | otherwise =
      case findCounterInputs vhash (txInfoInputs info) of
        [txIn] ->
          case readIntegerDatum info (txInInfoResolved txIn) of
            Nothing -> traceError "invalid or missing counter datum"
            Just n ->
              let expectedName    = tokenNameFromInteger n
                  mintOk          = mintedExactlyOneSerial ownCs expectedName minted
                  counterAdvanced = hasNextCounterOutput vhash n info
                  paidEnough      = lovelacePaidTo salePkh (txInfoOutputs info) >= priceLovelace
              in  traceIfFalse "expected exactly one serial NFT with correct name" mintOk
                    && traceIfFalse "counter UTxO was not advanced to n+1" counterAdvanced
                    && traceIfFalse "sale payment insufficient" paidEnough
        []  -> traceError "counter input not found"
        _   -> traceError "expected exactly one counter input"
  where
    info   = scriptContextTxInfo ctx
    ownCs  = ownCurrencySymbol ctx
    minted = txInfoMint info

policyCompiled :: ValidatorHash -> PubKeyHash -> Integer -> MintingPolicy
policyCompiled vh salePkh price =
  mkMintingPolicyScript
    ( $$(compile [|| \vh' pkh' price' -> mkUntypedMintingPolicy (mkPolicy vh' pkh' price') ||])
        `applyCode` liftCode vh
        `applyCode` liftCode salePkh
        `applyCode` liftCode price
    )

plutusScript :: ValidatorHash -> PubKeyHash -> Integer -> Script
plutusScript vh salePkh price =
  unMintingPolicyScript (policyCompiled vh salePkh price)
