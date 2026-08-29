/**
 * Mirror of plutus/Beacon.hs — canonical encoding must match on-chain.
 *
 * Encoding:
 *   - length-prefixed ASCII decimal integers
 *   - length-prefixed raw bytes
 *
 * IMPORTANT:
 * Every derivation here must remain byte-for-byte compatible with
 * plutus/Beacon.hs.
 */

const textEncoder = new TextEncoder()

export function integerToBytes(
  n: number | bigint
): Uint8Array {
  let x = typeof n === 'bigint' ? n : BigInt(n)

  // Match Plutus integerToBytes:
  // negative values are normalized to 0.
  if (x < 0n) {
    x = 0n
  }

  if (x === 0n) {
    return new Uint8Array([48]) // ASCII '0'
  }

  const digits: number[] = []

  while (x > 0n) {
    const r = Number(x % 10n)

    digits.unshift(48 + r)

    x = x / 10n
  }

  return new Uint8Array(digits)
}

/**
 * Canonical field encoding:
 *
 *   integerToBytes(length(bs)) || bs
 *
 * This mirrors:
 *
 *   field bs =
 *     appendByteString
 *       (integerToBytes (lengthOfByteString bs))
 *       bs
 */
export function field(
  bs: Uint8Array
): Uint8Array {
  const len = integerToBytes(bs.length)

  const out = new Uint8Array(
    len.length + bs.length
  )

  out.set(len, 0)
  out.set(bs, len.length)

  return out
}

/**
 * Integer field encoding.
 *
 * This mirrors:
 *
 *   fieldInteger n = field (integerToBytes n)
 */
export function fieldInteger(
  n: number | bigint
): Uint8Array {
  return field(integerToBytes(n))
}

/**
 * Concatenate byte arrays.
 */
export function concatBytes(
  ...parts: Uint8Array[]
): Uint8Array {
  const total = parts.reduce(
    (a, p) => a + p.length,
    0
  )

  const out = new Uint8Array(total)

  let offset = 0

  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }

  return out
}

/**
 * UTF-8 encoding.
 */
export function utf8(
  s: string
): Uint8Array {
  return textEncoder.encode(s)
}

/**
 * SHA-256 → Uint8Array.
 *
 * Uses Web Crypto, matching the existing project architecture.
 */
export async function sha256(
  data: Uint8Array
): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    data
  )

  return new Uint8Array(hash)
}

/**
 * Domain separators.
 *
 * These values MUST remain identical to plutus/Beacon.hs.
 */
export const DOMAINS = {
  beacon: utf8(
    'PRE-RICH/BEACON/V1'
  ),

  player: utf8(
    'PRE-RICH/PLAYER/V1'
  ),

  game: utf8(
    'PRE-RICH/GAME/V1'
  ),

  symbols: utf8(
    'PRE-RICH/SYMBOLS/V1'
  ),

  ticket: utf8(
    'PRE-RICH/TICKET/V2'
  ),

  /**
   * B3:
   *
   * Canonical game-round binding.
   *
   * This is NOT a randomness domain.
   */
  gameRoundCommitment: utf8(
    'PRE-RICH/GAME-ROUND-COMMITMENT/V1'
  ),
} as const

export type BeaconTarget = {
  networkId: number
  round: number
  mainchainRef: Uint8Array
  version: Uint8Array
}

/**
 * Canonical BeaconTarget encoding.
 *
 * Mirrors:
 *
 *   encodeBeaconTarget t =
 *     appendByteString (fieldInteger (btNetworkId t))
 *       $ appendByteString (fieldInteger (btRound t))
 *       $ appendByteString (field (btMainchainRef t))
 *           (field (btVersion t))
 */
export function encodeBeaconTarget(
  t: BeaconTarget
): Uint8Array {
  return concatBytes(
    fieldInteger(t.networkId),
    fieldInteger(t.round),
    field(t.mainchainRef),
    field(t.version)
  )
}

/**
 * Player commitment.
 *
 * Mirrors:
 *
 *   playerCommitment
 *     roundId
 *     ticketNonce
 *     playerSecret =
 *       sha2_256
 *         ( field playerDomain
 *         || fieldInteger roundId
 *         || fieldInteger ticketNonce
 *         || field playerSecret
 *         )
 */
export async function playerCommitment(
  roundId: number,
  ticketNonce: number,
  playerSecret: Uint8Array
): Promise<Uint8Array> {
  return sha256(
    concatBytes(
      field(DOMAINS.player),
      fieldInteger(roundId),
      fieldInteger(ticketNonce),
      field(playerSecret)
    )
  )
}

/**
 * B3 — Canonical GameRoundCommitment derivation.
 *
 * Mirrors:
 *
 *   deriveGameRoundCommitment
 *     gameId
 *     roundId
 *     configHash
 *     protocolVersion =
 *       sha2_256
 *         ( field gameRoundCommitmentDomain
 *         || field gameId
 *         || fieldInteger roundId
 *         || field configHash
 *         || field protocolVersion
 *         )
 *
 * This is an integrity/binding primitive.
 *
 * It is NOT:
 *   - a randomness source
 *   - a Materios receipt
 *   - an authentication proof for external Materios data
 */
export async function deriveGameRoundCommitment(
  gameId: Uint8Array,
  roundId: number | bigint,
  configHash: Uint8Array,
  protocolVersion: Uint8Array
): Promise<Uint8Array> {
  return sha256(
    concatBytes(
      field(DOMAINS.gameRoundCommitment),
      field(gameId),
      fieldInteger(roundId),
      field(configHash),
      field(protocolVersion)
    )
  )
}

/**
 * Deterministic beacon derivation.
 *
 * IMPORTANT:
 *
 * This function does NOT independently authenticate mcHash or
 * materiosContext.
 *
 * Authentication/authorization is handled by BeaconRegistry through
 * the authorized relayer.
 *
 * Mirrors:
 *
 *   deriveBeacon
 *     networkId
 *     roundId
 *     mainchainRef
 *     mcHash
 *     materiosContext
 *     version =
 *       sha2_256
 *         ( field beaconDomain
 *         || fieldInteger networkId
 *         || fieldInteger roundId
 *         || field mainchainRef
 *         || field mcHash
 *         || field materiosContext
 *         || field version
 *         )
 */
export async function deriveBeacon(
  networkId: number,
  roundId: number,
  mainchainRef: Uint8Array,
  mcHash: Uint8Array,
  materiosContext: Uint8Array,
  version: Uint8Array
): Promise<Uint8Array> {
  return sha256(
    concatBytes(
      field(DOMAINS.beacon),
      fieldInteger(networkId),
      fieldInteger(roundId),
      field(mainchainRef),
      field(mcHash),
      field(materiosContext),
      field(version)
    )
  )
}

/**
 * Deterministic ticket seed.
 *
 * Mirrors:
 *
 *   deriveTicketSeed
 *     roundId
 *     ticketNonce
 *     playerSecret
 *     beacon
 *     gameVersion =
 *       sha2_256
 *         ( field gameDomain
 *         || fieldInteger roundId
 *         || fieldInteger ticketNonce
 *         || field playerSecret
 *         || field beacon
 *         || field gameVersion
 *         )
 */
export async function deriveTicketSeed(
  roundId: number,
  ticketNonce: number,
  playerSecret: Uint8Array,
  beacon: Uint8Array,
  gameVersion: Uint8Array
): Promise<Uint8Array> {
  return sha256(
    concatBytes(
      field(DOMAINS.game),
      fieldInteger(roundId),
      fieldInteger(ticketNonce),
      field(playerSecret),
      field(beacon),
      field(gameVersion)
    )
  )
}

/**
 * Symbols seed derivation.
 *
 * Mirrors:
 *
 *   deriveSymbolsSeed ticketSeed =
 *     sha2_256
 *       (field symbolsDomain || field ticketSeed)
 */
export async function deriveSymbolsSeed(
  ticketSeed: Uint8Array
): Promise<Uint8Array> {
  return sha256(
    concatBytes(
      field(DOMAINS.symbols),
      field(ticketSeed)
    )
  )
}

/**
 * Ticket commitment.
 *
 * Existing PRE-RICH V2 ticket commitment.
 */
export async function ticketCommitment(
  ticketId: Uint8Array,
  playerCommitmentValue: Uint8Array,
  gameVersion: Uint8Array,
  nonce: number,
  priceUsdm: number,
  beaconTargetEnc: Uint8Array
): Promise<Uint8Array> {
  return sha256(
    concatBytes(
      field(DOMAINS.ticket),
      field(ticketId),
      field(playerCommitmentValue),
      field(gameVersion),
      field(integerToBytes(nonce)),
      field(integerToBytes(priceUsdm)),
      field(beaconTargetEnc)
    )
  )
}

/**
 * Generate cryptographically secure random player secret.
 */
export function randomPlayerSecret(
  bytes = 32
): Uint8Array {
  const a = new Uint8Array(bytes)

  crypto.getRandomValues(a)

  return a
}

/**
 * Convert bytes to lowercase hexadecimal.
 */
export function toHex(
  bs: Uint8Array
): string {
  return Array.from(bs)
    .map((b) =>
      b.toString(16).padStart(2, '0')
    )
    .join('')
}

/**
 * Convert hexadecimal to bytes.
 *
 * Accepts both:
 *
 *   deadbeef
 *
 * and:
 *
 *   0xdeadbeef
 */
export function fromHex(
  hex: string
): Uint8Array {
  const clean = hex.startsWith('0x')
    ? hex.slice(2)
    : hex

  if (clean.length % 2 !== 0) {
    throw new Error('odd hex length')
  }

  const out = new Uint8Array(
    clean.length / 2
  )

  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(
      clean.slice(i * 2, i * 2 + 2),
      16
    )
  }

  return out
}