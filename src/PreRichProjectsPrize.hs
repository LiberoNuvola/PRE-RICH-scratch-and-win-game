{-# LANGUAGE DataKinds #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE TypeFamilies #-}

module PreRichProjectsPrize where

import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           PlutusTx
import           PlutusTx.Prelude
import           Prelude (Show, String)
import           GHC.Generics (Generic)

-- | Informazioni su un progetto Cardano che deposita token come montepremi
--   (può essere esteso con regole personalizzate, scadenze, ecc.)
data ProjectInfo = ProjectInfo
    { projectOwner   :: PubKeyHash
    , policyId       :: CurrencySymbol
    , assetName      :: TokenName
    , prizeAmount    :: Integer
    , customRules    :: BuiltinByteString -- JSON o testo libero
    } deriving (Show, Generic)

PlutusTx.unstableMakeIsData ''ProjectInfo

-- | Redeemer per azioni sul contratto
--   Register: registra un nuovo progetto e deposita il premio
--   Claim: riscatta il premio se si possiede un biglietto vincente
--   Refund: rimborso al progetto (es. se annullato)
data PrizeAction = Register | Claim | Refund
    deriving Show

PlutusTx.unstableMakeIsData ''PrizeAction

-- | Validatore principale
{-# INLINABLE mkValidator #-}
mkValidator :: ProjectInfo -> PrizeAction -> ScriptContext -> Bool
mkValidator info action ctx =
    case action of
        Register ->
            -- Controlla che il deposito sia corretto e che il progetto sia registrato
            traceIfFalse "Deposit mismatch" correctDeposit
        Claim ->
            -- Controlla che il vincitore presenti il biglietto NFT corretto
            traceIfFalse "Winner does not own ticket NFT" winnerOwnsTicket &&
            traceIfFalse "Prize amount mismatch" correctPrizeAmount
        Refund ->
            -- Solo il projectOwner può richiedere il rimborso
            traceIfFalse "Only project owner can refund" onlyOwner
  where
    infoIn = findOwnInput ctx
    txInfo = scriptContextTxInfo ctx
    ownAddr = case infoIn of
        Just i  -> txOutAddress $ txInInfoResolved i
        Nothing -> traceError "No input found"
    -- Controlla che il deposito sia esattamente il premio dichiarato
    correctDeposit =
        let expected = singleton (policyId info) (assetName info) (prizeAmount info)
            paidIn   = valuePaidTo txInfo (projectOwner info)
        in valueOf paidIn (policyId info) (assetName info) == prizeAmount info
    -- Controlla che il vincitore abbia il biglietto NFT (mock: qui solo controllo asset, da estendere)
    winnerOwnsTicket =
        let nfts = [ (cs, tn, amt) | (cs, tn, amt) <- flattenValue (valuePaidTo txInfo (txInfoSignatories txInfo !! 0)), amt == 1 ]
        in any (\(cs,_,_) -> cs == policyId info) nfts
    -- Controlla che il premio pagato sia corretto
    correctPrizeAmount =
        let paid = valuePaidTo txInfo (txInfoSignatories txInfo !! 0)
        in valueOf paid (policyId info) (assetName info) == prizeAmount info
    -- Solo il projectOwner può richiedere rimborso
    onlyOwner =
        let signers = txInfoSignatories txInfo
        in projectOwner info `elem` signers

-- | Boilerplate
validator :: ProjectInfo -> PrizeAction -> ScriptContext -> Bool
validator = mkValidator

compiledValidator :: CompiledCode (ProjectInfo -> PrizeAction -> ScriptContext -> Bool)
compiledValidator = $$(PlutusTx.compile [|| validator ||])

-- | Helper per esportazione su-chain
validatorScript :: ProjectInfo -> Validator
validatorScript info = mkValidatorScript $$(PlutusTx.compile [|| mkValidator ||]) `PlutusTx.applyCode` PlutusTx.liftCode info

-- | Per test e deploy: esporta lo script in formato serializzato
