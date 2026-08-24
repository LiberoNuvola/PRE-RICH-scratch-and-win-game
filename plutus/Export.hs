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

import qualified CounterValidator
import qualified MintPolicy
import qualified PrizePool
import qualified PrizeValidator
import qualified Treasury

compiledCborHex :: CompiledCode a -> Text
compiledCborHex code =
  TE.decodeUtf8 . B16.encode . SBS.fromShort $ serialiseCompiledCode code

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

  writeScriptJson
    "out/prizeValidator.plutus.json"
    "PreRich Prize validator"
    (compiledCborHex PrizeValidator.compiledValidator)

  writeScriptJson
    "out/counterValidator.plutus.json"
    "PreRich Counter validator"
    (compiledCborHex CounterValidator.compiledValidator)

  writeScriptJson
    "out/prizePool.plutus.json"
    "PreRich PrizePool validator"
    (compiledCborHex PrizePool.compiledValidator)

  writeScriptJson
    "out/mintPolicyFactory.plutus.json"
    "PreRich Mint policy factory (apply ScriptHash, PubKeyHash, Integer off-chain)"
    (compiledCborHex MintPolicy.compiledPolicyFactory)

  putStrLn "Done. File JSON in plutus/out/"