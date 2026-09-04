{-# LANGUAGE OverloadedStrings #-}

module Main where

import qualified Data.Aeson             as Aeson
import           Data.Aeson             (object, (.=))
import qualified Data.ByteString.Base16 as B16
import qualified Data.ByteString.Lazy   as BSL
import qualified Data.ByteString.Short  as SBS
import           Data.Text              (Text)
import qualified Data.Text.Encoding     as TE
import           System.Directory       (createDirectoryIfMissing)

import           PlutusLedgerApi.Common (serialiseCompiledCode)
import           PlutusTx.Code          (CompiledCode)

import qualified BeaconRegistry
import qualified B1PrizePool
import qualified CounterValidator
import qualified MintPolicy
import qualified PrizeValidator
import qualified Treasury

compiledCborHex :: CompiledCode a -> Text
compiledCborHex code =
  TE.decodeUtf8
    . B16.encode
    . SBS.fromShort
    $ serialiseCompiledCode code

writeScriptJson :: FilePath -> Text -> Text -> IO ()
writeScriptJson path description cborHex = do
  let env =
        object
          [ "type"        .= ("PlutusScriptV2" :: Text)
          , "description" .= description
          , "cborHex"     .= cborHex
          ]

  BSL.writeFile path (Aeson.encode env)
  putStrLn ("wrote " <> path)

main :: IO ()
main = do
  createDirectoryIfMissing True "out"

  writeScriptJson
    "out/treasury.plutus.json"
    "PreRich Treasury validator"
    (compiledCborHex Treasury.compiledValidator)

  -- Factory:
  -- ScriptHash (BeaconRegistry) -> ScriptHash (B1PrizePool) -> PrizeTable -> script.
  -- Apply all three parameters OFF-CHAIN after the registry and pool are known.
  writeScriptJson
    "out/prizeValidatorFactory.plutus.json"
    "PreRich Prize validator factory (apply BeaconRegistry ScriptHash, B1PrizePool ScriptHash, PrizeTable off-chain)"
    (compiledCborHex PrizeValidator.compiledValidatorFactory)

  writeScriptJson
    "out/counterValidator.plutus.json"
    "PreRich Counter validator"
    (compiledCborHex CounterValidator.compiledValidator)

  -- Factory:
  -- CounterValidator Hash
  -- -> PrizeValidator Hash
  -- -> BeaconRegistry Hash
  -- -> sale PubKeyHash
  -- -> price Integer
  -- -> script.
  --
  -- All five parameters are applied OFF-CHAIN.
  writeScriptJson
    "out/mintPolicyFactory.plutus.json"
    "PreRich Mint policy factory (apply CounterHash, PrizeValidatorHash, BeaconRegistryHash off-chain)"
    (compiledCborHex MintPolicy.compiledPolicyFactory)

  writeScriptJson
    "out/beaconRegistry.plutus.json"
    "PreRich BeaconRegistry validator (light bridge, one UTxO per round)"
    (compiledCborHex BeaconRegistry.compiledValidator)

  writeScriptJson
    "out/b1PrizePoolFactory.plutus.json"
    "PreRich B1 PrizePool factory (apply PrizeValidatorScriptHash off-chain)"
    (compiledCborHex B1PrizePool.compiledValidatorFactory)

  putStrLn "Done. JSON scripts in plutus/out/"
