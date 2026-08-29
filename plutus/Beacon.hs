{-# LANGUAGE DataKinds #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Beacon
  ( beaconDomain
  , playerDomain
  , gameDomain
  , symbolsDomain
  , gameRoundCommitmentDomain
  , integerToBytes
  , field
  , fieldInteger
  , playerCommitment
  , deriveGameRoundCommitment
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

-- | Domain separator for the canonical game-round binding.
--
-- This is intentionally distinct from the Beacon, player and ticket
-- derivation domains. A GameRoundCommitment is an integrity/binding
-- primitive, not a randomness primitive.
{-# INLINABLE gameRoundCommitmentDomain #-}
gameRoundCommitmentDomain :: BuiltinByteString
gameRoundCommitmentDomain =
  "PRE-RICH/GAME-ROUND-COMMITMENT/V1"

-- | Canonical encoding:
-- * ByteString fields are encoded as length-prefixed raw bytes.
-- * Integer fields are encoded as length-prefixed ASCII decimal.
--
-- This encoding MUST match the off-chain implementation exactly.
{-# INLINABLE integerToBytes #-}
integerToBytes :: Integer -> BuiltinByteString
integerToBytes n
  | n < 0 = integerToBytes 0
  | n == 0 = consByteString 48 emptyByteString
  | otherwise = go n emptyByteString
  where
    go x acc
      | x == 0 = acc
      | otherwise =
          let q = divide x 10
              r = remainder x 10
              digit = consByteString (48 + r) emptyByteString
          in go q (appendByteString digit acc)

{-# INLINABLE field #-}
field :: BuiltinByteString -> BuiltinByteString
field bs =
  appendByteString
    (integerToBytes (lengthOfByteString bs))
    bs

{-# INLINABLE fieldInteger #-}
fieldInteger :: Integer -> BuiltinByteString
fieldInteger n =
  field (integerToBytes n)

{-# INLINABLE playerCommitment #-}
playerCommitment
  :: Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
playerCommitment roundId ticketNonce playerSecret =
  sha2_256
    (appendByteString
      (field playerDomain)
      (appendByteString
        (fieldInteger roundId)
        (appendByteString
          (fieldInteger ticketNonce)
          (field playerSecret))))

-- | Canonical GameRoundCommitment hash.
--
-- Binds:
-- * game identity
-- * round identity
-- * game configuration
-- * protocol version
--
-- It intentionally does NOT contain Materios data and does NOT generate
-- randomness. It is an integrity/binding primitive used to establish
-- the canonical identity of a game round before beacon derivation.
{-# INLINABLE deriveGameRoundCommitment #-}
deriveGameRoundCommitment
  :: BuiltinByteString
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
deriveGameRoundCommitment gameId roundId configHash protocolVersion =
  sha2_256
    (appendByteString
      (field gameRoundCommitmentDomain)
      (appendByteString
        (field gameId)
        (appendByteString
          (fieldInteger roundId)
          (appendByteString
            (field configHash)
            (field protocolVersion)))))

{-# INLINABLE encodeBeaconTarget #-}
encodeBeaconTarget :: BeaconTarget -> BuiltinByteString
encodeBeaconTarget t =
  appendByteString
    (fieldInteger (btNetworkId t))
    (appendByteString
      (fieldInteger (btRound t))
      (appendByteString
        (field (btMainchainRef t))
        (field (btVersion t))))

-- | Does NOT prove mcHash authenticity.
-- | This function performs deterministic beacon derivation only.
{-# INLINABLE deriveBeacon #-}
deriveBeacon
  :: Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
deriveBeacon
  networkId
  roundId
  mainchainRef
  mcHash
  materiosContext
  version =
    sha2_256
      (appendByteString
        (field beaconDomain)
        (appendByteString
          (fieldInteger networkId)
          (appendByteString
            (fieldInteger roundId)
            (appendByteString
              (field mainchainRef)
              (appendByteString
                (field mcHash)
                (appendByteString
                  (field materiosContext)
                  (field version)))))))

{-# INLINABLE deriveTicketSeed #-}
deriveTicketSeed
  :: Integer
  -> Integer
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
  -> BuiltinByteString
deriveTicketSeed
  roundId
  ticketNonce
  playerSecret
  beacon
  gameVersion =
    sha2_256
      (appendByteString
        (field gameDomain)
        (appendByteString
          (fieldInteger roundId)
          (appendByteString
            (fieldInteger ticketNonce)
            (appendByteString
              (field playerSecret)
              (appendByteString
                (field beacon)
                (field gameVersion))))))

{-# INLINABLE deriveSymbolsSeed #-}
deriveSymbolsSeed :: BuiltinByteString -> BuiltinByteString
deriveSymbolsSeed ticketSeed =
  sha2_256
    (appendByteString
      (field symbolsDomain)
      (field ticketSeed))
