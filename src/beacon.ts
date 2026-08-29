/**
 * Mirror of plutus/Beacon.hs — canonical encoding must match on-chain.
 * Encoding: length-prefixed ASCII decimal integers; length-prefixed raw bytes.
 */

const textEncoder = new TextEncoder()

export function integerToBytes(n: number | bigint): Uint8Array {
  let x = typeof n === 'bigint' ? n : BigInt(n)
  if (x < 0n) x = 0n
  if (x === 0n) return new Uint8Array([48]) // '0'
  const digits: number[] = []
  while (x > 0n) {
    const r = Number(x % 10n)
    digits.unshift(48 + r)
    x = x / 10n
  }
  return new Uint8Array(digits)
}

export function field(bs: Uint8Array): Uint8Array {
  const len = integerToBytes(bs.length)
  const out = new Uint8Array(len.length + bs.length)
  out.set(len, 0)
  out.set(bs, len.length)
  return out
}

export function fieldInteger(n: number | bigint): Uint8Array {
  return field(integerToBytes(n))
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((a, p) => a + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export function utf8(s: string): Uint8Array {
  return textEncoder.encode(s)
}

/** SHA-256 → Uint8Array. Uses Web Crypto. */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hash)
}

export const DOMAINS = {
  beacon: utf8('PRE-RICH/BEACON/V1'),
  player: utf8('PRE-RICH/PLAYER/V1'),
  game: utf8('PRE-RICH/GAME/V1'),
  symbols: utf8('PRE-RICH/SYMBOLS/V1'),
  ticket: utf8('PRE-RICH/TICKET/V2'),
} as const

export type BeaconTarget = {
  networkId: number
  round: number
  mainchainRef: Uint8Array
  version: Uint8Array
}

export function encodeBeaconTarget(t: BeaconTarget): Uint8Array {
  return concatBytes(
    fieldInteger(t.networkId),
    fieldInteger(t.round),
    field(t.mainchainRef),
    field(t.version)
  )
}

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

export async function deriveSymbolsSeed(ticketSeed: Uint8Array): Promise<Uint8Array> {
  return sha256(concatBytes(field(DOMAINS.symbols), field(ticketSeed)))
}

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

export function randomPlayerSecret(bytes = 32): Uint8Array {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return a
}

export function toHex(bs: Uint8Array): string {
  return Array.from(bs)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (clean.length % 2 !== 0) throw new Error('odd hex length')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}