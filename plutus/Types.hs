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
  , GameRoundCommitment (..)
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

-- | Canonical commitment binding a PRE-RICH game round to its
-- configuration and protocol version.
--
-- This is deliberately NOT a randomness source and does NOT contain
-- Materios data. It is an integrity/binding primitive used to establish
-- the canonical identity of a game round before beacon derivation.
data GameRoundCommitment = GameRoundCommitment
  { grcGameId          :: BuiltinByteString
  , grcRound           :: Integer
  , grcConfigHash      :: BuiltinByteString
  , grcProtocolVersion :: BuiltinByteString
  , grcCommitmentHash  :: BuiltinByteString
  }

PlutusTx.unstableMakeIsData ''GameRoundCommitment

-- | One registry UTxO per PRE-RICH round.
-- The relayer is currently the trusted publisher/attestor for the external
-- Materios receipt represented by mcHash + materiosContext.
--
-- IMPORTANT:
-- This remains the current registry model for now. The GameRoundCommitment
-- is introduced first as a separate primitive. The registry will be changed
-- in a later step so that external Materios data cannot define the canonical
-- round/beacon input without an authenticated Cardano anchor.
data BeaconRegistryDatum = BeaconRegistryDatum
  { brRound           :: Integer
  , brTarget          :: BeaconTarget
  , brStatus          :: BeaconStatus
  , brBeaconValue     :: BuiltinByteString
  , brMcHash           :: BuiltinByteString
  , brMateriosContext :: BuiltinByteString
  , brRelayerPkh      :: PubKeyHash
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
