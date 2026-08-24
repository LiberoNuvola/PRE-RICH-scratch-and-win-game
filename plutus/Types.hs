{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

module Types
  ( PrizeDatum (..)
  , PrizePoolDatum (..)
  , PrizePoolAction (..)
  , TreasuryDatum (..)
  , TreasuryAction (..)
  ) where

import           PlutusLedgerApi.V2
import           PlutusTx
import           PlutusTx.Prelude

data PrizeDatum = PrizeDatum
  { pdPrizeAmount   :: Integer
  , pdTicketPolicy  :: BuiltinByteString
  , pdTicketName    :: BuiltinByteString
  , pdPaymentPolicy :: BuiltinByteString
  , pdPaymentName   :: BuiltinByteString
  , pdClaimantPkh   :: PubKeyHash
  }

PlutusTx.unstableMakeIsData ''PrizeDatum

data PrizePoolDatum = PrizePoolDatum
  { ppPoolSize  :: Integer
  , ppNextIndex :: Integer
  , ppSeed      :: BuiltinByteString
  }

PlutusTx.unstableMakeIsData ''PrizePoolDatum

data PrizePoolAction = Claim Integer | Refill Integer

PlutusTx.unstableMakeIsData ''PrizePoolAction

data TreasuryDatum = TreasuryDatum
  { tdThreshold  :: Integer
  , tdPrizePkh   :: PubKeyHash
  , tdStakePkh   :: PubKeyHash
  , tdReservePkh :: PubKeyHash
  , tdRelayerPkh :: PubKeyHash
  , tdPrizePct   :: Integer
  , tdStakePct   :: Integer
  , tdReservePct :: Integer
  , tdRelayerPct :: Integer
  }

PlutusTx.unstableMakeIsData ''TreasuryDatum

data TreasuryAction = Distribute

PlutusTx.unstableMakeIsData ''TreasuryAction