{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DerivingStrategies  #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell    #-}
{-# LANGUAGE ViewPatterns        #-}

module Types
  ( PrizeStatus (..)
  , BeaconStatus (..)
  , BeaconTarget (..)
  , BeaconRegistryDatum (..)
  , BeaconRegistryAction (..)
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

data BeaconStatus = BeaconPending | BeaconReady

instance Eq BeaconStatus where
  {-# INLINABLE (==) #-}
  BeaconPending == BeaconPending = True
  BeaconReady   == BeaconReady   = True
  _             == _             = False

PlutusTx.unstableMakeIsData ''BeaconStatus

data BeaconTarget = BeaconTarget
  { btNetworkId    :: Integer
  , btRound        :: Integer
  , btMainchainRef :: BuiltinByteString
  , btVersion      :: BuiltinByteString
  }

PlutusTx.unstableMakeIsData ''BeaconTarget

-- | One registry UTxO per PRE-RICH round.
-- The relayer is the trusted publisher/attestor for the external
-- Materios receipt represented by mcHash + materiosContext.
data BeaconRegistryDatum = BeaconRegistryDatum
  { brRound            :: Integer
  , brTarget           :: BeaconTarget
  , brStatus           :: BeaconStatus
  , brBeaconValue      :: BuiltinByteString
  , brMcHash            :: BuiltinByteString
  , brMateriosContext  :: BuiltinByteString
  , brRelayerPkh       :: PubKeyHash
  }

PlutusTx.unstableMakeIsData ''BeaconRegistryDatum

data BeaconRegistryAction
  = RegistryPublish BuiltinByteString BuiltinByteString

PlutusTx.unstableMakeIsData ''BeaconRegistryAction

data PrizeDatum = PrizeDatum
  { pdTicketPolicy     :: BuiltinByteString
  , pdTicketName       :: BuiltinByteString
  , pdPlayerCommitment :: BuiltinByteString
  , pdPriceUsdm        :: Integer
  , pdCommitment       :: BuiltinByteString
  , pdGameVersion      :: BuiltinByteString
  , pdTicketNonce      :: Integer
  , pdPrizeAmount      :: Integer
  , pdPaymentPolicy    :: BuiltinByteString
  , pdPaymentName      :: BuiltinByteString
  , pdStatus           :: PrizeStatus
  , pdResult           :: BuiltinByteString
  , pdPrizeTier        :: Integer
  , pdBeaconTarget     :: BeaconTarget

  -- | Must match registry for this round after publish.
  , pdBeaconStatus     :: BeaconStatus
  , pdBeaconValue      :: BuiltinByteString
  , pdMcHash           :: BuiltinByteString
  , pdMateriosContext  :: BuiltinByteString
  }

PlutusTx.unstableMakeIsData ''PrizeDatum

-- | SyncBeacon: copy R from registry reference input (no redeemer entropy).
--   Reveal playerSecret
--   Claim
data PrizeAction
  = SyncBeacon
  | Reveal BuiltinByteString
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
  | RevealSeed BuiltinByteString BuiltinByteString BuiltinByteString

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