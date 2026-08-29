{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DerivingStrategies  #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
{-# LANGUAGE ViewPatterns        #-}

module Types
  ( PrizeStatus (..)
  , PrizeDatum (..)
  , PrizeAction (..)
  , PrizePoolDatum (..)
  , PrizePoolAction (..)
  , TreasuryDatum (..)
  , TreasuryAction (..)
  ) where

import PlutusLedgerApi.V2
import PlutusTx
import PlutusTx.Prelude

data PrizeStatus = Pending | Revealed

instance Eq PrizeStatus where
  {-# INLINABLE (==) #-}
  Pending  == Pending  = True
  Revealed == Revealed = True
  _        == _        = False

PlutusTx.unstableMakeIsData ''PrizeStatus

data PrizeDatum = PrizeDatum
  { pdTicketPolicy  :: BuiltinByteString
  , pdTicketName    :: BuiltinByteString
  , pdPlayerSeed    :: BuiltinByteString
  , pdOpCommitment  :: BuiltinByteString
  , pdPriceUsdm     :: Integer
  , pdCommitment    :: BuiltinByteString
  , pdGameVersion   :: BuiltinByteString
  , pdTicketNonce   :: Integer
  , pdPrizeAmount   :: Integer
  , pdPaymentPolicy :: BuiltinByteString
  , pdPaymentName   :: BuiltinByteString
  , pdStatus        :: PrizeStatus
  , pdRevealHash    :: BuiltinByteString
  , pdResult        :: BuiltinByteString
  , pdPrizeTier     :: Integer
  }

PlutusTx.unstableMakeIsData ''PrizeDatum

data PrizeAction
  = Reveal
      BuiltinByteString
      BuiltinByteString
      BuiltinByteString
  | Claim

PlutusTx.unstableMakeIsData ''PrizeAction

data PrizePoolDatum = PrizePoolDatum
  { ppPoolSize       :: Integer
  , ppNextIndex      :: Integer
  , ppSeed           :: BuiltinByteString
  , ppNextCommitment :: BuiltinByteString
  , ppRound          :: Integer
  }

PlutusTx.unstableMakeIsData ''PrizePoolDatum

data PrizePoolAction
  = ClaimIndex Integer
  | Refill Integer
  | RevealSeed
      BuiltinByteString
      BuiltinByteString
      BuiltinByteString

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