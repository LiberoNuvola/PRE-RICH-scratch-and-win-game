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

-- ============================================================
-- Compiled code -> CBOR
-- ============================================================

compiledCborHex :: CompiledCode a -> Text
compiledCborHex code =
  TE.decodeUtf8
    . B16.encode
    . SBS.fromShort
    $ serialiseCompiledCode code

-- ============================================================
-- JSON writer
-- ============================================================

writeScriptJson
  :: FilePath
  -> Text
  -> Text
  -> IO ()
writeScriptJson path description cborHex = do
  let env =
        object
          [ "type"        .= ("PlutusScriptV2" :: Text)
          , "description" .= description
          , "cborHex"     .= cborHex
          ]

  BSL.writeFile
    path
    (Aeson.encode env)

  putStrLn
    ("wrote " <> path)

-- ============================================================
-- Export
-- ============================================================

main :: IO ()
main = do

  createDirectoryIfMissing
    True
    "plutus/out"

  -- ----------------------------------------------------------
  -- Treasury
  -- ----------------------------------------------------------

  writeScriptJson
    "plutus/out/treasury.plutus.json"
    "PreRich Treasury validator"
    (compiledCborHex Treasury.compiledValidator)

  -- ----------------------------------------------------------
  -- PrizeValidator factory
  -- ----------------------------------------------------------
  --
  -- Factory parameters are applied off-chain:
  --
  --   1. BeaconRegistry ScriptHash
  --   2. PrizeTable
  --   3. Oracle publisher PubKeyHash
  --
  -- PrizeValidator does NOT receive B1PrizePoolHash.
  -- The PrizeDatum contains pdPrizePoolHash.
  --

  writeScriptJson
    "plutus/out/prizeValidatorFactory.plutus.json"
    "PreRich Prize validator factory (apply BeaconRegistry ScriptHash, PrizeTable, oracle publisher off-chain)"
    (compiledCborHex
      PrizeValidator.compiledValidatorFactory)

  -- ----------------------------------------------------------
  -- CounterValidator
  -- ----------------------------------------------------------

  writeScriptJson
    "plutus/out/counterValidator.plutus.json"
    "PreRich Counter validator"
    (compiledCborHex
      CounterValidator.compiledValidator)

  -- ----------------------------------------------------------
  -- MintPolicy factory
  -- ----------------------------------------------------------
  --
  -- C-02 atomic sale parameters:
  --
  --   1. CounterValidator ScriptHash
  --   2. PrizeValidator ScriptHash
  --   3. BeaconRegistry ScriptHash
  --   4. Treasury ScriptHash
  --   5. B1PrizePool ScriptHash
  --
  -- All five parameters are applied OFF-CHAIN.
  --
  -- The resulting MintPolicy binds:
  --
  --   Ticket NFT mint
  --   Counter n -> n+1
  --   Pending PrizeDatum
  --   Treasury payment
  --   B1PrizePool reservation
  --
  -- to the SAME transaction.
  --

  writeScriptJson
    "plutus/out/mintPolicyFactory.plutus.json"
    "PreRich Mint policy factory (apply CounterHash, PrizeValidatorHash, BeaconRegistryHash, TreasuryHash, B1PrizePoolHash off-chain)"
    (compiledCborHex
      MintPolicy.compiledPolicyFactory)

  -- ----------------------------------------------------------
  -- BeaconRegistry
  -- ----------------------------------------------------------

  writeScriptJson
    "plutus/out/beaconRegistry.plutus.json"
    "PreRich BeaconRegistry validator (B1 authorized beacon publication, one UTxO per round)"
    (compiledCborHex
      BeaconRegistry.compiledValidator)

  -- ----------------------------------------------------------
  -- B1PrizePool factory
  -- ----------------------------------------------------------
  --
  -- Parameters:
  --
  --   1. PrizeValidator ScriptHash
  --   2. Oracle publisher PubKeyHash
  --   3. Pool singleton token policy
  --   4. Pool singleton token name
  --
  -- The singleton token ensures there is one protocol Pool state
  -- UTxO for the configured B1PrizePool instance.
  --

  writeScriptJson
    "plutus/out/b1PrizePoolFactory.plutus.json"
    "PreRich B1 PrizePool factory (apply PrizeValidator ScriptHash, oracle publisher, pool singleton token off-chain)"
    (compiledCborHex
      B1PrizePool.compiledValidatorFactory)

  putStrLn
    "Done. JSON scripts written to out/"