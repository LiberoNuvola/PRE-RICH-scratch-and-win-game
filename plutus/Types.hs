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
  , B1PrizePoolDatum (..)
  , B1PrizePoolAction (..)
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
  -- | ScriptHash of the B1PrizePool validator.
  --   Used to locate and validate the PrizePool UTxO in the same transaction
  --   for atomicity: PrizeValidator cross-checks pool accounting on reveal/claim.
  , pdPrizePoolHash    :: BuiltinByteString
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


-- | B1 PrizePool singleton datum.
--
-- Tracks effective pool accounting. The economic invariant is:
--   pendingLiabilities + unresolvedReserve + lockedJackpot <= totalLiquidity
--   i.e. effectivePool >= 0
--
-- JackpotActive is derived: effectivePool >= jackpotThreshold.
--
-- unresolvedTicketCount must equal the number of tickets currently in
-- Pending/BeaconReady state (unrevealed). It is NOT derivable from
-- unresolvedReserve alone because reservePerTicket varies by class.
--
-- This datum lives on a single global PrizePool UTxO.
data B1PrizePoolDatum = B1PrizePoolDatum
  { ppTotalLiquidity     :: Integer
  -- ^ Total ADA held by the PrizePool (lovelace).
  --   MUST equal the actual lovelace in the PrizePool UTxO.
  , ppPendingLiabilities :: Integer
  -- ^ Sum of crystallised, unclaimed winning payouts (lovelace).
  , ppUnresolvedReserve  :: Integer
  -- ^ Reserve for unrevealed tickets: count * reservePerTicket.
  , ppUnresolvedTicketCount :: Integer
  -- ^ Number of currently unrevealed tickets (in Pending/BeaconReady).
  --   Must be >= 0 and consistent with unresolvedReserve.
  , ppLockedJackpot      :: Integer
  -- ^ Liquidity locked for jackpot (subtracted only when separately reserved).
  , ppJackpotThreshold   :: Integer
  -- ^ Effective pool level above which jackpot is active.
  , ppSuspendedClasses   :: Integer
  -- ^ Bitmask of suspended ticket classes.
  --   Bit 0 = Genesis (1 USDM), bit 1 = Class 1 (2 USDM), ..., bit 7 = 100 USDM.
  --   1 = suspended, 0 = active.
  --   Higher classes are suspended first as solvency drops.
  , ppPrizeHash          :: ScriptHash
  -- ^ ScriptHash of the PrizeValidator.
  --   Used to locate and validate PrizeDatum outputs in ticket actions.
  }

PlutusTx.unstableMakeIsData ''B1PrizePoolDatum


-- | Actions that modify the PrizePool accounting state.
--
-- FundTreasury: NO amount parameter. The actual ADA increase is verified
-- by comparing the PrizePool UTxO input value to the output value.
-- This prevents the datum from declaring an amount that doesn't match
-- the actual transfer.
--
-- TicketIssued: reservePerTicket is provided and must be > 0.
--
-- TicketRevealed: reserveRelease per ticket, payout from crystallised
-- PrizeDatum (must be >= 0; 0 for losses).
--
-- TicketClaimed: claimedAmount must match the crystallised payout.
-- Cannot claim more than once because status transitions to Claimed.
--
-- TicketExpired: reserveRelease per ticket, must be > 0 for unrevealed
-- tickets that have passed expiry.
data B1PrizePoolAction
  = FundTreasury
  -- ^ Treasury deposits funds. Actual value increase verified on-chain.
  | TicketIssued Integer
  -- ^ New ticket minted. reservePerTicket > 0. Increases count and reserve.
  | TicketRevealed Integer Integer
  -- ^ Ticket revealed. reserveRelease >= 0, payout >= 0.
  | TicketClaimed Integer
  -- ^ Ticket claimed. claimedAmount > 0, matches crystallised payout.
  | TicketExpired
  -- ^ Ticket expired unrevealed. Decreases count and reserve by
  --   reservePerTicket derived from the ticket's priceUsdm.

PlutusTx.unstableMakeIsData ''B1PrizePoolAction


-- | Treasury distribution datum.
--
-- B1 requirement: destinations MUST be protocol-controlled script addresses,
-- NOT personal PKH wallets. Each destination is a ScriptHash of the
-- validator that controls that protocol category.
--
-- The Treasury validator verifies that outputs go to addresses whose
-- credential is ScriptCredential matching the specified hash.
data TreasuryDatum = TreasuryDatum
  { tdThreshold       :: Integer
  , tdPrizeScriptHash :: ScriptHash
  -- ^ ScriptHash of the PrizePool validator (receives prize allocation).
  , tdStakeScriptHash :: ScriptHash
  -- ^ ScriptHash of the Stake validator (receives stake allocation).
  , tdReserveScriptHash :: ScriptHash
  -- ^ ScriptHash of the Reserve validator (receives reserve allocation).
  , tdMaintenanceScriptHash :: ScriptHash
  -- ^ ScriptHash of the Maintenance validator (receives maintenance allocation).
  , tdPrizePct   :: Integer
  , tdStakePct   :: Integer
  , tdReservePct :: Integer
  , tdMaintenancePct :: Integer
  }

PlutusTx.unstableMakeIsData ''TreasuryDatum


data TreasuryAction = Distribute

PlutusTx.unstableMakeIsData ''TreasuryAction