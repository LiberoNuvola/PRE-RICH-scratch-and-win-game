{-# LANGUAGE NoImplicitPrelude #-}

-- | Pure, chain-neutral PRE-RICH economic kernel.
--
-- No TxInfo / TxOut / Value / Datum / Redeemer / UTxO / Lucid dependencies.
module EconomicKernel
  ( ceilingDiv
  , classExposure
  , totalClassExposure
  , totalUnresolvedCount
  , worstCaseExposure
  , effectivePool
  , protectedCapital
  , rawSurplus
  , classSaleable
  , reserveIssueDelta
  , reserveRevealDelta
  , reserveExpiryDelta
  , liabilityRevealDelta
  , liabilityClaimDelta
  , payoutSufficient
  , solvencyInvariant
  , conservationInvariant
  ) where

import PlutusTx.Prelude
import EconomicStateV3

{-# INLINABLE ceilingDiv #-}
ceilingDiv :: Integer -> Integer -> Integer
ceilingDiv a b
  | b == 0 = traceError "EconomicKernel: division by zero"
  | a <= 0 = 0
  | b < 0 = traceError "EconomicKernel: invalid divisor"
  | otherwise = (a + b - 1) `divide` b

{-# INLINABLE classExposure #-}
classExposure :: TicketClassState -> Integer
classExposure c =
  case classPrice (tcsClassId c) of
    Just p  -> p * tcsUnresolved c
    Nothing -> 0

{-# INLINABLE totalClassExposure #-}
totalClassExposure :: [TicketClassState] -> Integer
totalClassExposure [] = 0
totalClassExposure (c:cs) =
  classExposure c + totalClassExposure cs

{-# INLINABLE totalUnresolvedCount #-}
totalUnresolvedCount :: [TicketClassState] -> Integer
totalUnresolvedCount [] = 0
totalUnresolvedCount (c:cs) =
  tcsUnresolved c + totalUnresolvedCount cs

-- | V3 worst-case normal payout exposure.
{-# INLINABLE worstCaseExposure #-}
worstCaseExposure :: V3EconomicState -> Integer
worstCaseExposure s =
  500 * totalClassExposure (v3Classes s)

-- | EffectivePool = EEV - crystallized liabilities
--   - unresolved price reserve - locked jackpot.
{-# INLINABLE effectivePool #-}
effectivePool :: Integer -> V3EconomicState -> Integer
effectivePool eev s =
  eev
    - v3CrystallizedLiabilities s
    - v3UnresolvedReserve s
    - jsLockedAmount (v3Jackpot s)

-- | Capital that must remain protected.
{-# INLINABLE protectedCapital #-}
protectedCapital :: V3EconomicState -> Integer
protectedCapital s =
    v3CrystallizedLiabilities s
  + worstCaseExposure s
  + v3SafetyCapital s
  + v3ReserveProtection s
  + jsLockedAmount (v3Jackpot s)
  + v3MandatoryFutureCosts s

{-# INLINABLE rawSurplus #-}
rawSurplus :: Integer -> V3EconomicState -> Integer
rawSurplus eev s =
  max 0 (eev - protectedCapital s)

-- | Deterministic saleability for the current state.
-- The stored tcsSaleable flag is deliberately ignored as an independent
-- truth source. Numerical hysteresis thresholds remain external/open.
{-# INLINABLE classSaleable #-}
classSaleable :: V3EconomicState -> TicketClass -> Bool
classSaleable s cid =
  case findClass (v3Classes s) cid of
    Nothing -> False
    Just c ->
         cid <= ecsCurrentActiveClass (v3Control s)
      && tcsIssued c < tcsCap c
  where
    findClass [] _ = Nothing
    findClass (c:cs) x
      | tcsClassId c == x = Just c
      | otherwise = findClass cs x

{-# INLINABLE reserveIssueDelta #-}
reserveIssueDelta :: Integer -> Integer
reserveIssueDelta priceUsdm = priceUsdm

{-# INLINABLE reserveRevealDelta #-}
reserveRevealDelta :: Integer -> Integer
reserveRevealDelta priceUsdm = negate priceUsdm

{-# INLINABLE reserveExpiryDelta #-}
reserveExpiryDelta :: Integer -> Integer
reserveExpiryDelta priceUsdm = negate priceUsdm

{-# INLINABLE liabilityRevealDelta #-}
liabilityRevealDelta :: Integer -> Integer
liabilityRevealDelta prizeAmount =
  max 0 prizeAmount

{-# INLINABLE liabilityClaimDelta #-}
liabilityClaimDelta :: Integer -> Integer
liabilityClaimDelta claimedAmount =
  negate (max 0 claimedAmount)

-- | A payout must be non-negative and no greater than 500x ticket price.
{-# INLINABLE payoutSufficient #-}
payoutSufficient :: Integer -> Integer -> Bool
payoutSufficient priceUsdm payoutAmount =
     priceUsdm >= 0
  && payoutAmount >= 0
  && payoutAmount <= 500 * priceUsdm

-- | Canonical solvency predicate.
{-# INLINABLE solvencyInvariant #-}
solvencyInvariant :: Integer -> V3EconomicState -> Bool
solvencyInvariant eev s =
     eev >= 0
  && v3CrystallizedLiabilities s >= 0
  && v3UnresolvedReserve s >= 0
  && v3UnresolvedTicketCount s >= 0
  && v3SafetyCapital s >= 0
  && v3ReserveProtection s >= 0
  && v3MandatoryFutureCosts s >= 0
  && jsLockedAmount (v3Jackpot s) >= 0
  && eev >= protectedCapital s

-- | Stored aggregate fields must equal their class decomposition.
{-# INLINABLE conservationInvariant #-}
conservationInvariant :: V3EconomicState -> Bool
conservationInvariant s =
     v3UnresolvedReserve s == totalClassExposure (v3Classes s)
  && v3UnresolvedTicketCount s == totalUnresolvedCount (v3Classes s)
