{-# LANGUAGE DataKinds #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell #-}

-- | Explicit compatibility boundary between legacy B1 and canonical V3.
--
-- This module is intentionally Cardano-facing because B1 contains ScriptHash.
-- The Kernel never imports this module.
module B1LegacyAdapter
  ( LegacyProjectionError (..)
  , legacyB1ToV3
  , v3ToLegacyB1
  , legacyAggregateMatchesV3
  , legacyProjectionIsLossless
  , legacySuspendedMask
  ) where

import PlutusLedgerApi.V2
import PlutusTx
import PlutusTx.Prelude

import Types
  ( B1PrizePoolDatum (..)
  )
import EconomicStateV3

data LegacyProjectionError
  = LegacyHasUnresolvedTickets
  | LegacyMissingClassComposition
  | LegacyMissingSafetyCapital
  | LegacyMissingReserveProtection
  | LegacyMissingMandatoryFutureCosts
  | LegacyMissingHistoricalControl
  | LegacyMissingJackpotLifecycle
  | LegacyAggregateMismatch
  | V3ContainsUnsupportedProtectedCapital
  | V3ContainsUnsupportedJackpotState
  deriving ()

PlutusTx.unstableMakeIsData ''LegacyProjectionError

-- | Safe direction: legacy B1 can only become a full V3 state when no
-- information absent from B1 is required. In particular, unresolved
-- class composition cannot be guessed from aggregate reserve/count.
{-# INLINABLE legacyB1ToV3 #-}
legacyB1ToV3
  :: B1PrizePoolDatum
  -> Either LegacyProjectionError V3EconomicState
legacyB1ToV3 d
  | ppUnresolvedTicketCount d /= 0 =
      Left LegacyHasUnresolvedTickets
  | ppUnresolvedReserve d /= 0 =
      Left LegacyAggregateMismatch
  | ppLockedJackpot d /= 0 =
      Left LegacyMissingJackpotLifecycle
  | otherwise =
      Right
        (V3EconomicState
          (ppPendingLiabilities d)
          0
          0
          0
          0
          0
          []
          (EconomicControlState 0 0)
          (JackpotState 0 (ppJackpotThreshold d) JackpotInactive 0)
        )

-- | Project a V3 state to legacy B1 only when the fields that B1 cannot
-- represent are neutral. Total liquidity and prize hash remain explicit
-- chain-facing inputs.
{-# INLINABLE v3ToLegacyB1 #-}
v3ToLegacyB1
  :: Integer
  -> ScriptHash
  -> V3EconomicState
  -> Either LegacyProjectionError B1PrizePoolDatum
v3ToLegacyB1 totalLiquidity prizeHash s
  | v3SafetyCapital s /= 0 =
      Left V3ContainsUnsupportedProtectedCapital
  | v3ReserveProtection s /= 0 =
      Left V3ContainsUnsupportedProtectedCapital
  | v3MandatoryFutureCosts s /= 0 =
      Left V3ContainsUnsupportedProtectedCapital
  | jsLockedAmount (v3Jackpot s) /= 0 =
      Left V3ContainsUnsupportedJackpotState
  | ecsHighestClassEverActivated (v3Control s)
      /= ecsCurrentActiveClass (v3Control s) =
      Left LegacyMissingHistoricalControl
  | not (conservationInvariant s) =
      Left LegacyAggregateMismatch
  | otherwise =
      Right
        (B1PrizePoolDatum
          totalLiquidity
          (v3CrystallizedLiabilities s)
          (v3UnresolvedReserve s)
          (v3UnresolvedTicketCount s)
          0
          (jsThreshold (v3Jackpot s))
          (legacySuspendedMask (v3Control s))
          prizeHash
        )

-- | Explicitly document the lossy boundary.
{-# INLINABLE legacyAggregateMatchesV3 #-}
legacyAggregateMatchesV3 :: B1PrizePoolDatum -> V3EconomicState -> Bool
legacyAggregateMatchesV3 d s =
     ppPendingLiabilities d == v3CrystallizedLiabilities s
  && ppUnresolvedReserve d == v3UnresolvedReserve s
  && ppUnresolvedTicketCount d == v3UnresolvedTicketCount s
  && ppLockedJackpot d == jsLockedAmount (v3Jackpot s)

{-# INLINABLE legacyProjectionIsLossless #-}
legacyProjectionIsLossless :: V3EconomicState -> Bool
legacyProjectionIsLossless s =
     v3SafetyCapital s == 0
  && v3ReserveProtection s == 0
  && v3MandatoryFutureCosts s == 0
  && jsLockedAmount (v3Jackpot s) == 0
  && ecsHighestClassEverActivated (v3Control s)
       == ecsCurrentActiveClass (v3Control s)
  && conservationInvariant s

-- | Legacy bitmask encoding of classes above currentActiveClass.
{-# INLINABLE legacySuspendedMask #-}
legacySuspendedMask :: EconomicControlState -> Integer
legacySuspendedMask c =
  maskFrom 0
  where
    active = ecsCurrentActiveClass c
    maskFrom i
      | i > 7 = 0
      | i > active = (2 `multiply` maskFrom (i + 1)) + 1
      | otherwise = 2 `multiply` maskFrom (i + 1)
