{-# LANGUAGE OverloadedStrings #-}

-- Export.hs
--
-- Compila i quattro/cinque script Plutus e scrive il CBOR hex di ciascuno
-- in un file JSON minimale (stesso "shape" del formato TextEnvelope prodotto
-- da cardano-cli: { "type": ..., "description": ..., "cborHex": ... }).
-- Questi file vengono poi letti da relayer.js / claimFlow.ts / mint.ts per
-- allegare davvero i validator alle transazioni con Lucid
-- (`attachSpendingValidator` / `attachMintingPolicy`), invece di spendere
-- gli UTxO degli script senza mai referenziare lo script stesso.
--
-- Uso (dalla cartella plutus/):
--   cabal run export-scripts -- <salePkhHex> <priceLovelace>
--
-- NOTA IMPORTANTE (non verificato con un compilatore in questo ambiente):
-- questo file segue il pattern standard usato in molti tutorial Plutus
-- (serialise del validator + incapsulamento CBOR), ma va compilato e
-- testato sul tuo ambiente reale prima di fidarsi ciecamente dell'output.
-- Se `cabal build` segnala errori di import mancanti, il problema piu'
-- probabile e' che serva aggiungere dipendenze extra a build-depends nel
-- file .cabal (vedi il diff del .cabal fornito insieme a questo file).

module Main where

import qualified Data.Aeson                as Aeson
import           Data.Aeson                (object, (.=))
import qualified Data.ByteString.Base16    as B16
import qualified Data.ByteString.Lazy      as BSL
import           Data.Text                 (Text)
import qualified Data.Text                 as T
import qualified Data.Text.Encoding        as TE
import           Codec.Serialise           (serialise)
import           System.Environment        (getArgs)
import           System.Exit               (die)

import           Plutus.V2.Ledger.Api      (Script, unValidatorScript, unMintingPolicyScript,
                                             PubKeyHash (..))
import qualified PlutusTx.Builtins         as Builtins

import qualified Treasury
import qualified PrizeValidator
import qualified CounterValidator
import qualified PrizePool
import qualified MintPolicy

-- Converte uno Script Plutus nell'hex esadecimale da mettere in "cborHex".
scriptCborHex :: Script -> Text
scriptCborHex script =
  TE.decodeUtf8 . B16.encode . BSL.toStrict $ serialise script

writeScriptJson :: FilePath -> Text -> Text -> IO ()
writeScriptJson path description cborHex = do
  let env = object
        [ "type"        .= ("PlutusScriptV2" :: Text)
        , "description" .= description
        , "cborHex"     .= cborHex
        ]
  BSL.writeFile path (Aeson.encode env)
  putStrLn ("wrote " <> path)

-- Costruisce un PubKeyHash da una stringa hex passata da riga di comando.
pkhFromHex :: String -> PubKeyHash
pkhFromHex hex = PubKeyHash (Builtins.toBuiltin (fst (B16.decode (TE.encodeUtf8 (T.pack hex)))))

main :: IO ()
main = do
  args <- getArgs
  case args of
    [salePkhHex, priceStr] -> do
      let price = read priceStr :: Integer
          salePkh = pkhFromHex salePkhHex
          counterVh = CounterValidator.counterValidatorHash

      -- Script non parametrizzati: si esportano cosi' come sono.
      writeScriptJson
        "out/treasury.plutus.json"
        "PreRich Treasury validator"
        (scriptCborHex (unValidatorScript Treasury.validator))

      writeScriptJson
        "out/prizeValidator.plutus.json"
        "PreRich Prize validator"
        (scriptCborHex (unValidatorScript PrizeValidator.validator))

      writeScriptJson
        "out/counterValidator.plutus.json"
        "PreRich Counter validator"
        (scriptCborHex (unValidatorScript CounterValidator.validator))

      writeScriptJson
        "out/prizePool.plutus.json"
        "PreRich PrizePool validator"
        (scriptCborHex (unValidatorScript PrizePool.validator))

      -- MintPolicy e' parametrizzato: va applicato con i parametri reali
      -- (hash del CounterValidator gia' esportato sopra, PubKeyHash del
      -- venditore, e prezzo in lovelace) prima di essere esportato.
      writeScriptJson
        "out/mintPolicy.plutus.json"
        "PreRich Mint policy (applied)"
        (scriptCborHex (unMintingPolicyScript (MintPolicy.policyCompiled counterVh salePkh price)))

      putStrLn "Done. I file .json sono in plutus/out/ - usa il campo cborHex in Lucid."
    _ -> die "Uso: cabal run export-scripts -- <salePkhHex> <priceLovelace>"
