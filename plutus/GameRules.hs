{-# LANGUAGE DataKinds             #-}
{-# LANGUAGE FlexibleInstances     #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE NoImplicitPrelude     #-}
{-# LANGUAGE ScopedTypeVariables   #-}
{-# LANGUAGE TemplateHaskell       #-}
{-# LANGUAGE UndecidableInstances  #-}
{-# LANGUAGE ViewPatterns          #-}

module GameRules
  ( PrizeTable (..)
  , classifyTier
  , prizeAmountForTier
  , defaultPrizeTable
  , generateSymbols
  ) where

import PlutusTx
import PlutusTx.Prelude

-- ============================================================
-- Prize table
-- ============================================================

-- | PrizeTable defines base multipliers for each winning tier.
--
-- The payout for a ticket is: baseForTier(tier) * priceUsdm / 2
--
-- USDM SUB-UNITS: 1 USDM = 100 integer units.
-- pdPriceUsdm is stored in sub-units (e.g. Genesis = 100, Class 1 = 200).
-- The formula produces sub-unit results directly:
--   payout_subunits = base * priceUsdm / 2
--   payout_USDM = payout_subunits / 100
--
-- Relationship between ticket CLASS, TIER, and PAYOUT:
--
--   Ticket CLASS = pdPriceUsdm (100, 200, 300, 500, 1000, 2500, 5000, 10000 sub-units)
--   Winning TIER = classifyTier(symbols) (1..5, or 0 for loss)
--   PAYOUT (sub-units) = base * priceUsdm / 2
--
-- Example for Genesis (priceUsdm = 100 sub-units):
--   Tier 1: 2 * 100 / 2 = 100 sub-units = 1.00 USDM   (3+ of symbol 1)
--   Tier 2: 5 * 100 / 2 = 250 sub-units = 2.50 USDM  (3+ of symbol 2)
--   Tier 3: 10 * 100 / 2 = 500 sub-units = 5.00 USDM   (3+ of symbol 3)
--   Tier 4: 200 * 100 / 2 = 10000 sub-units = 100.00 USDM (3+ of symbol 4)
--   Tier 5: 1000 * 100 / 2 = 50000 sub-units = 500.00 USDM (3+ of symbol 5)
--
-- Example for Class 1 (priceUsdm = 200 sub-units):
--   Tier 1: 2 * 200 / 2 = 200 sub-units = 2.00 USDM
--   Tier 2: 5 * 200 / 2 = 500 sub-units = 5.00 USDM
--   etc.
--
-- This is NOT the same as "ticket class = tier". A 1 USDM ticket
-- can win tier 5 (500 USDM). A 100 USDM ticket can win tier 1 (100 USDM).
data PrizeTable = PrizeTable
  { ptTier1 :: Integer
  , ptTier2 :: Integer
  , ptTier3 :: Integer
  , ptTier4 :: Integer
  , ptTier5 :: Integer
  }

PlutusTx.unstableMakeIsData ''PrizeTable
PlutusTx.makeLift ''PrizeTable

{-# INLINABLE defaultPrizeTable #-}
defaultPrizeTable :: PrizeTable
defaultPrizeTable =
  PrizeTable
    { ptTier1 = 2
    , ptTier2 = 5
    , ptTier3 = 10
    , ptTier4 = 200
    , ptTier5 = 1000
    }

{-# INLINABLE baseForTier #-}
baseForTier :: PrizeTable -> Integer -> Integer
baseForTier t tier =
  if tier == 1 then ptTier1 t
  else if tier == 2 then ptTier2 t
  else if tier == 3 then ptTier3 t
  else if tier == 4 then ptTier4 t
  else if tier == 5 then ptTier5 t
  else 0

{-# INLINABLE prizeAmountForTier #-}
prizeAmountForTier :: PrizeTable -> Integer -> Integer -> Integer
prizeAmountForTier table tier priceUsdm =
  if tier <= 0 || priceUsdm <= 0
    then 0
    else (baseForTier table tier * priceUsdm) `divide` 2

-- ============================================================
-- Symbol generation
-- ============================================================

{-# INLINABLE countSym #-}
countSym :: BuiltinByteString -> Integer -> Integer -> Integer
countSym bs sym i =
  if i >= 6
    then 0
    else
      let c = indexByteString bs i
          n = if c == sym then 1 else 0
      in n + countSym bs sym (i + 1)

-- | Returns the highest symbol (5..1) appearing at least three times.
--   Returns 0 when there is no winning tier.
{-# INLINABLE classifyTier #-}
classifyTier :: BuiltinByteString -> Integer
classifyTier bs =
  if lengthOfByteString bs < 6
    then 0
    else go 5
  where
    go sym =
      if sym <= 0
        then 0
        else if countSym bs sym 0 >= 3
          then sym
          else go (sym - 1)

-- | Generates exactly six symbols in the range 1..5 using rejection sampling.
--
-- Each position hashes: sha2_256( byte(position) || symbolsSeed )
-- and consumes bytes sequentially from the 32-byte hash.
-- Bytes with value 255 are rejected (skipped) because 256 is not
-- evenly divisible by 5.
--
-- FAILS if more than 32 bytes are needed for a single position
-- (extremely unlikely: probability < (1/256)^32).
-- This bounds all hash reads within the SHA-256 output.
--
-- The result is completely deterministic from symbolsSeed.
{-# INLINABLE generateSymbols #-}
generateSymbols :: BuiltinByteString -> BuiltinByteString
generateSymbols symbolsSeed = collect 0 0 emptyByteString
  where
    nextByte pos hashPos =
      indexByteString
        (sha2_256 (appendByteString (consByteString pos emptyByteString) symbolsSeed))
        hashPos

    collect count _ acc
      | count >= 6 = acc
    collect count hashPos acc =
      if hashPos >= 32
        then traceError "generateSymbols: hash exhausted for position"
        else
          let byte = nextByte count hashPos
          in if byte == 255
               then collect count (hashPos + 1) acc
               else collect (count + 1) 0
                      (appendByteString acc (consByteString (remainder byte 5 + 1) emptyByteString))