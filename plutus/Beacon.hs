{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Beacon
  ( beaconDomain
  , playerDomain
  , gameDomain
  , symbolsDomain
  , integerToBytes
  , field
  , fieldInteger
  , playerCommitment
  , deriveBeacon
  , deriveTicketSeed
  , deriveSymbolsSeed
  , encodeBeaconTarget
  ) where

import PlutusLedgerApi.V2
import PlutusTx.Prelude

import Types (BeaconTarget (..))

{-# INLINABLE beaconDomain #-}
beaconDomain :: BuiltinByteString
beaconDomain = "PRE-RICH/BEACON/V1"

{-# INLINABLE playerDomain #-}
playerDomain :: BuiltinByteString
playerDomain = "PRE-RICH/PLAYER/V1"

{-# INLINABLE gameDomain #-}
gameDomain :: BuiltinByteString
gameDomain = "PRE-RICH/GAME/V1"

{-# INLINABLE symbolsDomain #-}
symbolsDomain :: BuiltinByteString
symbolsDomain = "PRE-RICH/SYMBOLS/V1"

-- Canonical encoding: length-prefixed ASCII decimal for integers,
-- length-prefixed raw bytes for ByteStrings. MUST match off-chain.

{-# INLINABLE integerToBytes #-}
integerToBytes :: Integer -> BuiltinByteString
integerToBytes n
  | n < 0     = integerToBytes 0
  | n == 0    = consByteString 48 emptyByteString
  | otherwise = go n emptyByteString
  where
    go x acc
      | x == 0    = acc
      | otherwise =
          let q     = divide x 10
              r     = remainder x 10
              digit = consByteString (48 + r) emptyByteString
          in  go q (appendByteString digit acc)

{-# INLINABLE field #-}
field :: BuiltinByteString -> BuiltinByteString
field bs = appendByteString (integerToBytes (lengthOfByteString bs)) bs

{-# INLINABLE fieldInteger #-}
fieldInteger :: Integer -> BuiltinByteString
fieldInteger n = field (integerToBytes n)

{-# INLINABLE playerCommitment #-}
playerCommitment
  :: Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
playerCommitment roundId ticketNonce playerSecret =
  sha2_256
    ( appendByteString (field playerDomain)
    $ appendByteString (fieldInteger roundId)
    $ appendByteString (fieldInteger ticketNonce)
      (field playerSecret)
    )

{-# INLINABLE encodeBeaconTarget #-}
encodeBeaconTarget :: BeaconTarget -> BuiltinByteString
encodeBeaconTarget t =
  appendByteString (fieldInteger (btNetworkId t))
    $ appendByteString (fieldInteger (btRound t))
    $ appendByteString (field (btMainchainRef t))
      (field (btVersion t))

-- | Does NOT prove mcHash authenticity. Only deterministic derivation.
{-# INLINABLE deriveBeacon #-}
deriveBeacon
  :: Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
deriveBeacon networkId roundId mainchainRef mcHash materiosContext version =
  sha2_256
    ( appendByteString (field beaconDomain)
    $ appendByteString (fieldInteger networkId)
    $ appendByteString (fieldInteger roundId)
    $ appendByteString (field mainchainRef)
    $ appendByteString (field mcHash)
    $ appendByteString (field materiosContext)
      (field version)
    )

{-# INLINABLE deriveTicketSeed #-}
deriveTicketSeed
  :: Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
deriveTicketSeed roundId ticketNonce playerSecret beacon gameVersion =
  sha2_256
    ( appendByteString (field gameDomain)
    $ appendByteString (fieldInteger roundId)
    $ appendByteString (fieldInteger ticketNonce)
    $ appendByteString (field playerSecret)
    $ appendByteString (field beacon)
      (field gameVersion)
    )

{-# INLINABLE deriveSymbolsSeed #-}
deriveSymbolsSeed :: BuiltinByteString -> BuiltinByteString
deriveSymbolsSeed ticketSeed =
  sha2_256 (appendByteString (field symbolsDomain) (field ticketSeed))