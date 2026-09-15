{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE DerivingStrategies #-}

-- | Canonical, chain-neutral V3 economic state.
--
-- This module intentionally contains no Cardano/PlutusLedgerApi types.
-- It is the state contract consumed by the pure Economic Kernel.
module EconomicStateV3
  ( TicketClass
  , canonicalClasses
  , classPrice
  , TicketClassState (..)
  , EconomicControlState (..)
  , JackpotStatus (..)
  , JackpotState (..)
  , V3EconomicState (..)
  , zeroV3EconomicState
  ) where

import PlutusTx.Prelude

-- | Canonical ticket-class identifier.
-- 0..7 correspond to 1/2/3/5/10/25/50/100 USDM.
type TicketClass = Integer

{-# INLINABLE canonicalClasses #-}
canonicalClasses :: [TicketClass]
canonicalClasses = [0,1,2,3,4,5,6,7]

-- | Canonical class price in USDM.
-- This is a fixed protocol ladder; it is not a configurable economic input.
{-# INLINABLE classPrice #-}
classPrice :: TicketClass -> Maybe Integer
classPrice c
  | c == 0 = Just 1
  | c == 1 = Just 2
  | c == 2 = Just 3
  | c == 3 = Just 5
  | c == 4 = Just 10
  | c == 5 = Just 25
  | c == 6 = Just 50
  | c == 7 = Just 100
  | otherwise = Nothing

-- | Per-class V3 economic state.
--
-- tcsSaleable is an explicit state surface for compatibility with the
-- canonical specification, but the Kernel treats the deterministic
-- saleability predicate as authoritative. Implementations must not allow
-- this field to become an independent source of truth.
data TicketClassState = TicketClassState
  { tcsClassId   :: TicketClass
  , tcsIssued    :: Integer
  , tcsUnresolved :: Integer
  , tcsExposure  :: Integer
  , tcsCap       :: Integer
  , tcsSaleable  :: Bool
  }

-- | Historical/control state.
data EconomicControlState = EconomicControlState
  { ecsCurrentActiveClass    :: TicketClass
  , ecsHighestClassEverActivated :: TicketClass
  }

data JackpotStatus
  = JackpotInactive
  | JackpotLocked
  | JackpotPayable
  | JackpotClosed

instance Eq JackpotStatus where
  {-# INLINABLE (==) #-}
  JackpotInactive == JackpotInactive = True
  JackpotLocked   == JackpotLocked   = True
  JackpotPayable  == JackpotPayable  = True
  JackpotClosed   == JackpotClosed   = True
  _               == _               = False

-- | Jackpot state. Status/cycle are persisted because they are not
-- reconstructible from the legacy B1 datum.
data JackpotState = JackpotState
  { jsLockedAmount :: Integer
  , jsThreshold    :: Integer
  , jsStatus       :: JackpotStatus
  , jsCycle        :: Integer
  }

-- | Canonical V3 PrizePool economic state.
data V3EconomicState = V3EconomicState
  { v3CrystallizedLiabilities :: Integer
  , v3UnresolvedReserve       :: Integer
  , v3UnresolvedTicketCount   :: Integer
  , v3SafetyCapital           :: Integer
  , v3ReserveProtection       :: Integer
  , v3MandatoryFutureCosts    :: Integer
  , v3Classes                 :: [TicketClassState]
  , v3Control                 :: EconomicControlState
  , v3Jackpot                 :: JackpotState
  }

-- | Empty deterministic starting shape. It deliberately does not invent
-- class caps or jackpot thresholds; those must be supplied by protocol state.
{-# INLINABLE zeroV3EconomicState #-}
zeroV3EconomicState :: V3EconomicState
zeroV3EconomicState =
  V3EconomicState
    0 0 0 0 0 0
    []
    (EconomicControlState 0 0)
    (JackpotState 0 0 JackpotInactive 0)
