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
  , OracleDatum (..)
  , precision
  , minUtxoLovelace
  , maxOracleAge
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


-- | Precision for integer arithmetic. Oracle prices are scaled by this factor.
-- 1_000_000 ensures sufficient precision for sub-unit calculations.
{-# INLINABLE precision #-}
precision :: Integer
precision = 1000000

-- | Minimum UTxO ADA (1.6 ADA = 1_600_000 lovelace).
-- This ADA is NOT economic liquidity; it is a protocol requirement.
{-# INLINABLE minUtxoLovelace #-}
minUtxoLovelace :: Integer
minUtxoLovelace = 1600000

-- | Maximum oracle age in milliseconds (1 hour).
{-# INLINABLE maxOracleAge #-}
maxOracleAge :: Integer
maxOracleAge = 3600000


-- | Oracle price datum.
--
-- Published by an authorized publisher. Contains the price of an asset
-- in USDM sub-units, scaled by PRECISION (1_000_000).
--
-- The B1PrizePool validator reads this from a reference input and uses it
-- to compute the USDM-denominated value of assets in the PrizePool UTxO.
data OracleDatum = OracleDatum
  { odAssetPolicy :: BuiltinByteString
  -- ^ CurrencySymbol of the asset (raw bytes).
  , odAssetName   :: BuiltinByteString
  -- ^ TokenName of the asset (raw bytes).
  , odPrice       :: Integer
  -- ^ Price of 1 unit of asset in USDM sub-units, scaled by PRECISION.
  --   For ADA: price of 1 lovelace in USDM sub-units * PRECISION.
  --   For USDM: PRECISION (identity: 1 USDM sub-unit = 1 USDM sub-unit).
  , odTimestamp   :: Integer
  -- ^ POSIX time (ms) when the price was published.
  , odPublisher   :: PubKeyHash
  -- ^ Public key hash of the authorized publisher.
  }

PlutusTx.unstableMakeIsData ''OracleDatum


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
-- Accounting unit: ALL monetary fields are in USDM sub-units (1 USDM = 100).
-- The actual PrizePool UTxO may contain USDM tokens plus ADA required for
-- Cardano min-UTxO / fees, but ADA must not be confused with the USDM
-- economic accounting balance. The datum identifies the accounting asset
-- unambiguously as USDM sub-units.
--
-- unresolvedTicketCount must equal the number of tickets currently in
-- Pending/BeaconReady state (unrevealed). It is NOT derivable from
-- unresolvedReserve alone because reservePerTicket varies by class.
--
-- This datum lives on a single global PrizePool UTxO.
data B1PrizePoolDatum = B1PrizePoolDatum
  { ppTotalLiquidity     :: Integer
  -- ^ Total USDM-denominated liquidity held by the PrizePool.
  --   MUST represent the actual USDM value (not ADA lovelace).
  --   The UTxO may contain ADA for min-UTxO but this field tracks USDM.
  , ppPendingLiabilities :: Integer
  -- ^ Sum of crystallised, unclaimed winning payouts in USDM sub-units.
  , ppUnresolvedReserve  :: Integer
  -- ^ Reserve for unrevealed tickets in USDM sub-units.
  --   Computed deterministically from ticket pdPriceUsdm values.
  , ppUnresolvedTicketCount :: Integer
  -- ^ Number of currently unrevealed tickets (in Pending/BeaconReady).
  --   Must be >= 0 and consistent with unresolvedReserve.
  , ppLockedJackpot      :: Integer
  -- ^ Liquidity locked for jackpot in USDM sub-units (subtracted only
  --   when separately reserved). Not double-counted with liabilities.
  , ppJackpotThreshold   :: Integer
  -- ^ Effective pool level (USDM sub-units) above which jackpot is active.
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
-- TicketIssued: redeemer provides pdPriceUsdm. B1PrizePool computes
-- the reserve deterministically from pdPriceUsdm using the protocol's
-- canonical reserve rule. The redeemer-supplied priceUsdm must match
-- the pdPriceUsdm in the PrizeDatum output.
--
-- TicketRevealed: redeemer provides pdPriceUsdm. B1PrizePool verifies
-- the payout matches the PrizeDatum's pdPrizeAmount and computes
-- reserveRelease deterministically from pdPriceUsdm.
--
-- TicketClaimed: claimedAmount must match the crystallised payout.
-- Cannot claim more than once because status transitions to Claimed.
--
-- TicketExpired: B1PrizePool computes reserveRelease deterministically
-- from the consumed PrizeDatum's pdPriceUsdm. NOT an average across
-- unresolved tickets.
data B1PrizePoolAction
  = FundTreasury
  -- ^ Treasury deposits funds. Actual value increase verified on-chain.
  | TicketIssued Integer
  -- ^ New ticket minted. Integer = pdPriceUsdm from the PrizeDatum.
  --   Reserve is computed deterministically: reserve = pdPriceUsdm.
  | TicketRevealed Integer
  -- ^ Ticket revealed. Integer = pdPriceUsdm from the consumed PrizeDatum.
  --   payout is verified against PrizeDatum; reserveRelease is computed
  --   deterministically from pdPriceUsdm.
  | TicketClaimed Integer
  -- ^ Ticket claimed. claimedAmount > 0, matches crystallised payout.
  | TicketExpired
  -- ^ Ticket expired unrevealed. Decreases count and reserve by the
  --   deterministic reserve derived from the ticket's pdPriceUsdm.
  --   NOT an average across unresolved tickets.

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