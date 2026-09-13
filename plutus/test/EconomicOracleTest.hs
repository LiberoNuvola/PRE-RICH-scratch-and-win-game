module Main where

import Control.Exception (SomeException, evaluate, try)
import qualified Data.ByteString.Char8 as ByteString
import Data.Monoid (mempty)
import System.Exit (exitFailure)

import PlutusLedgerApi.V1.Address (Address (..))
import PlutusLedgerApi.V1.Credential (Credential (..))
import PlutusLedgerApi.V1.Crypto (PubKeyHash (..))
import PlutusLedgerApi.V1.Scripts (Datum (..), TxId (..), TxOutRef (..))
import PlutusLedgerApi.V1.Time (POSIXTime (..), interval)
import PlutusLedgerApi.V1.Value (CurrencySymbol (..), TokenName (..), singleton)
import PlutusLedgerApi.V2.Contexts (TxInInfo (..), TxInfo (..))
import PlutusLedgerApi.V2.Tx (OutputDatum (..), TxOut (..))
import PlutusTx (toBuiltinData)
import qualified PlutusTx.AssocMap as AssocMap
import PlutusTx.Builtins (toBuiltin)
import PlutusTx.Prelude (BuiltinByteString)

import Economic (oraclePriceFor)
import Types (OracleDatum (..), OracleStateId (..))

data Case = Case
  { caseName :: String
  , caseReferences :: [TxInInfo]
  , caseExpectedPrice :: Maybe Integer
  }

main :: IO ()
main = do
  outcomes <- traverse runCase cases
  if and outcomes then pure () else exitFailure

runCase :: Case -> IO Bool
runCase testCase = do
  result <- try evaluatePrice :: IO (Either SomeException Integer)
  let passed = case caseExpectedPrice testCase of
        Just expected -> result == Right expected
        Nothing -> case result of
          Left _ -> True
          Right _ -> False
  putStrLn (prefix passed <> caseName testCase)
  pure passed
  where
    evaluatePrice =
      evaluate
        (oraclePriceFor
          (caseReferences testCase)
          oracleState
          authorizedPublisher
          (transactionInfo (caseReferences testCase))
          assetPolicy
          assetName)

prefix :: Bool -> String
prefix passed = if passed then "PASS " else "FAIL "

oracleState :: OracleStateId
oracleState = OracleStateId statePolicy stateName

statePolicy :: BuiltinByteString
statePolicy = bytes "oracle-state-policy"

stateName :: BuiltinByteString
stateName = bytes "oracle-state-token"

assetPolicy :: BuiltinByteString
assetPolicy = bytes "priced-asset-policy"

assetName :: BuiltinByteString
assetName = bytes "priced-asset-name"

authorizedPublisher :: PubKeyHash
authorizedPublisher = PubKeyHash (bytes "authorized-publisher")

otherPublisher :: PubKeyHash
otherPublisher = PubKeyHash (bytes "other-publisher")

now :: Integer
now = 10_000_000

price :: Integer
price = 1_000_000

bytes :: String -> BuiltinByteString
bytes = toBuiltin . ByteString.pack

transactionInfo :: [TxInInfo] -> TxInfo
transactionInfo references =
  TxInfo
    []
    references
    []
    mempty
    mempty
    []
    AssocMap.empty
    (interval (POSIXTime now) (POSIXTime now))
    []
    AssocMap.empty
    (TxId (bytes "test-transaction"))

referenceInput :: Integer -> TxOut -> TxInInfo
referenceInput index out =
  TxInInfo
    (TxOutRef (TxId (bytes "reference-transaction")) index)
    out

oracleOutputForAsset :: Integer -> BuiltinByteString -> BuiltinByteString -> BuiltinByteString -> BuiltinByteString -> PubKeyHash -> Integer -> Integer -> TxOut
oracleOutputForAsset nftAmount nftPolicy nftName datumPolicy datumName publisher timestamp oraclePrice =
  TxOut
    (Address (PubKeyCredential authorizedPublisher) Nothing)
    (singleton (CurrencySymbol nftPolicy) (TokenName nftName) nftAmount)
    (OutputDatum (Datum (toBuiltinData datum)))
    Nothing
  where
    datum =
      OracleDatum
        datumPolicy
        datumName
        oraclePrice
        timestamp
        publisher

oracleOutput :: Integer -> BuiltinByteString -> BuiltinByteString -> PubKeyHash -> Integer -> Integer -> TxOut
oracleOutput nftAmount nftPolicy nftName publisher timestamp oraclePrice =
  oracleOutputForAsset
    nftAmount
    nftPolicy
    nftName
    assetPolicy
    assetName
    publisher
    timestamp
    oraclePrice

correctOracleOutput :: TxOut
correctOracleOutput =
  oracleOutput 1 statePolicy stateName authorizedPublisher now price

cases :: [Case]
cases =
  [ Case "valid oracle state singleton and datum" [referenceInput 0 correctOracleOutput] (Just price)
  , Case "publisher-correct datum without singleton" [referenceInput 0 (oracleOutput 0 statePolicy stateName authorizedPublisher now price)] Nothing
  , Case "singleton with wrong policy" [referenceInput 0 (oracleOutput 1 (bytes "wrong-policy") stateName authorizedPublisher now price)] Nothing
  , Case "singleton with wrong token name" [referenceInput 0 (oracleOutput 1 statePolicy (bytes "wrong-name") authorizedPublisher now price)] Nothing
  , Case "datum on UTxO different from singleton" [referenceInput 0 (oracleOutputForAsset 1 statePolicy stateName (bytes "other-asset-policy") (bytes "other-asset-name") authorizedPublisher now price), referenceInput 1 (oracleOutput 0 statePolicy stateName authorizedPublisher now price)] Nothing
  , Case "wrong publisher" [referenceInput 0 (oracleOutput 1 statePolicy stateName otherPublisher now price)] Nothing
  , Case "future timestamp" [referenceInput 0 (oracleOutput 1 statePolicy stateName authorizedPublisher (now + 1) price)] Nothing
  , Case "timestamp beyond maximum age" [referenceInput 0 (oracleOutput 1 statePolicy stateName authorizedPublisher (now - 3_600_001) price)] Nothing
  , Case "negative price" [referenceInput 0 (oracleOutput 1 statePolicy stateName authorizedPublisher now (-1))] Nothing
  ]