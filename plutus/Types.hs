{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE DerivingStrategies  #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell     #-}
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

-- | Ticket / prize economic state (constitution state machine).
--
-- Pending   = UNREVEALED (no result fields meaningful)
-- Revealed  = result + payout crystallized (win or loss)
-- Claimed   = economic right exercised once; NFT may still exist
--
-- Loss is Revealed with pdPrizeAmount == 0 (claim rejected by amount > 0).
data PrizeStatus
  = Pending
  | Revealed
  | Claimed

instance Eq PrizeStatus where
  {-# INLINABLE (==) #-}
  Pending  == Pending  = True
  Revealed == Revealed = True
  Claimed  == Claimed  = True
  _        == _        = False

PlutusTx.unstableMakeIsData ''PrizeStatus


data BeaconStatus
  = BeaconPending
  | BeaconReady

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


data GameRoundCommitment = GameRoundCommitment
  { grcGameId          :: BuiltinByteString
  , grcRound           :: Integer
  , grcConfigHash      :: BuiltinByteString
  , grcProtocolVersion :: BuiltinByteString
  , grcCommitmentHash  :: BuiltinByteString
  }

PlutusTx.unstableMakeIsData ''GameRoundCommitment


-- | B1 registry: publisher-authorized beacon. Not B3.
data BeaconRegistryDatum = BeaconRegistryDatum
  { brRound           :: Integer
  , brTarget          :: BeaconTarget
  , brStatus          :: BeaconStatus
  , brBeaconValue     :: BuiltinByteString
  , brMcHash          :: BuiltinByteString
  , brMateriosContext :: BuiltinByteString
  , brRelayerPkh      :: PubKeyHash
  }

PlutusTx.unstableMakeIsData ''BeaconRegistryDatum


data BeaconRegistryAction
  = RegistryPublish BuiltinByteString BuiltinByteString

PlutusTx.unstableMakeIsData ''BeaconRegistryAction


-- | Prize / ticket economic datum.
--
-- Pre-reveal (Pending): result/tier/amount MUST be empty or zero and MUST NOT
-- leak outcome. Post-reveal: amount and result are frozen.
--
-- pdIssuedAt / pdExpiresAt: POSIX milliseconds (Integer). Claim allowed only
-- while tx validity upper bound is <= pdExpiresAt (see PrizeValidator).
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
  , pdBeaconStatus     :: BeaconStatus
  , pdBeaconValue      :: BuiltinByteString
  , pdMcHash           :: BuiltinByteString
  , pdMateriosContext  :: BuiltinByteString
  -- | POSIX time (ms) at mint / issuance. Immutable after create.
  , pdIssuedAt         :: Integer
  -- | POSIX time (ms). Immutable. Claim window ends here.
  , pdExpiresAt        :: Integer
  }

PlutusTx.unstableMakeIsData ''PrizeDatum


-- | SyncBeacon: copy R from registry ref input.
--   Reveal playerSecret
--   Claim: pay once, keep NFT, status → Claimed (no mandatory burn)
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