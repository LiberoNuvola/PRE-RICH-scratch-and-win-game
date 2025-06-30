{-# LANGUAGE DataKinds #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE OverloadedStrings #-}

module PreRichBatchSplit where

import           PlutusTx.Prelude
import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           PlutusTx
import           Prelude (Show)

-- Parametri: indirizzi destinatari e admin
data SplitParams = SplitParams
    { spPrizePool :: PubKeyHash
    , spTeam      :: PubKeyHash
    , spCosts     :: PubKeyHash
    , spBuyback   :: PubKeyHash
    , spStaking   :: PubKeyHash
    , spAdmin     :: PubKeyHash
    }
PlutusTx.makeLift ''SplitParams

{-# INLINABLE mkValidator #-}
mkValidator :: SplitParams -> () -> () -> ScriptContext -> Bool
mkValidator params _ _ ctx =
    traceIfFalse "Not signed by admin" signedByAdmin &&
    traceIfFalse "Wrong split" correctSplit
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

    -- Solo l'admin può distribuire
    signedByAdmin :: Bool
    signedByAdmin = txSignedBy info (spAdmin params)

    -- Calcola la quota totale uscente dallo script
    valueInScript :: Integer
    valueInScript = case findOwnInput ctx of
        Just i  -> valueOf (txOutValue $ txInInfoResolved i) adaSymbol adaToken
        Nothing -> 0

    -- Calcola le quote
    prizePoolAmt = valueInScript `divide` 2
    rest         = valueInScript - prizePoolAmt
    eachShare    = rest `divide` 4

    -- Verifica che ogni destinatario riceva la quota giusta
    correctSplit :: Bool
    correctSplit =
        valuePaidTo info (spPrizePool params) >= prizePoolAmt &&
        valuePaidTo info (spTeam params)      >= eachShare &&
        valuePaidTo info (spCosts params)     >= eachShare &&
        valuePaidTo info (spBuyback params)   >= eachShare &&
        valuePaidTo info (spStaking params)   >= (rest - 3 * eachShare)

{-# INLINABLE divide #-}
divide :: Integer -> Integer -> Integer
divide x y = x `quot` y

{-# INLINABLE valuePaidTo #-}
valuePaidTo :: TxInfo -> PubKeyHash -> Integer
valuePaidTo info pkh =
    let outs = [ txOutValue o | o <- txInfoOutputs info, txOutAddress o == pubKeyHashAddress pkh ]
    in sum [ valueOf v adaSymbol adaToken | v <- outs ]

{-# INLINABLE pubKeyHashAddress #-}
pubKeyHashAddress :: PubKeyHash -> Address
pubKeyHashAddress pkh = Address (PubKeyCredential pkh) Nothing

-- Boilerplate Plutus V2 omitted for brevity