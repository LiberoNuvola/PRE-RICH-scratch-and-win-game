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

{-# INLINABLE countSym #-}
countSym :: BuiltinByteString -> Integer -> Integer -> Integer
countSym bs sym i =
  if i >= 6
    then 0
    else
      let c = indexByteString bs i
          n = if c == sym then 1 else 0
      in  n + countSym bs sym (i + 1)

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

-- | Six symbols in 1..5, fully determined by symbolsSeed.
{-# INLINABLE generateSymbols #-}
generateSymbols :: BuiltinByteString -> BuiltinByteString
generateSymbols symbolsSeed = go 0 emptyByteString
  where
    go i acc
      | i >= 6 = acc
      | otherwise =
          let h   = sha2_256 (appendByteString (consByteString i emptyByteString) symbolsSeed)
              raw = indexByteString h 0
              sym = remainder raw 5 + 1
          in  go (i + 1) (appendByteString acc (consByteString sym emptyByteString))