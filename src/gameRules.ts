// src/gameRules.ts
// Regole ufficiali PRE-RICH v1 — premi in USDM, odds tipo istantanea classica.

export const GAME_VERSION = 'v1' as const

/** Tagli ticket supportati (USDM). 3 e 10 previsti. */
export type TicketPriceUsdm = 2 | 3 | 5 | 10

export const TICKET_PRICES_USDM: TicketPriceUsdm[] = [2, 5, 3, 10]

export type PrizeTier = 0 | 1 | 2 | 3 | 4 | 5

export const SYMBOLS = ['STAR', 'HEART', 'CLOVER', 'LAUREL', 'TROPHY'] as const
export type GameSymbol = (typeof SYMBOLS)[number]

/** Premio base per ticket da 2 USDM */
const BASE_PRIZE_USDM: Record<PrizeTier, number> = {
  0: 0,
  1: 2,
  2: 5,
  3: 10,
  4: 200,
  5: 1000,
}

/** Soglie cumulative in basis points [0, 10000) */
const TIER_THRESHOLDS: { maxExclusive: number; tier: PrizeTier }[] = [
  { maxExclusive: 7200, tier: 0 },
  { maxExclusive: 9000, tier: 1 },
  { maxExclusive: 9700, tier: 2 },
  { maxExclusive: 9950, tier: 3 },
  { maxExclusive: 9995, tier: 4 },
  { maxExclusive: 10000, tier: 5 },
]

const TIER_SYMBOL: Record<Exclude<PrizeTier, 0>, GameSymbol> = {
  1: 'STAR',
  2: 'HEART',
  3: 'CLOVER',
  4: 'LAUREL',
  5: 'TROPHY',
}

export function prizeAmountUsdm(tier: PrizeTier, ticketPrice: TicketPriceUsdm): number {
  if (tier === 0) return 0
  // intero: floor della scala lineare rispetto al ticket 2
  return Math.floor((BASE_PRIZE_USDM[tier] * ticketPrice) / 2)
}

/** roll in [0, 10000) → tier */
export function tierFromRoll(roll: number): PrizeTier {
  const r = Math.max(0, Math.min(9999, Math.floor(roll)))
  for (const { maxExclusive, tier } of TIER_THRESHOLDS) {
    if (r < maxExclusive) return tier
  }
  return 5
}

/**
 * Da seed hex/string: hash → roll → tier → amount.
 * (sha256 va passato dall'esterno o usa Web Crypto nel browser)
 */
export function rollFromDigest(digestHex: string): number {
  // primi 8 hex = 32 bit → mod 10000
  const n = parseInt(digestHex.slice(0, 8), 16)
  if (Number.isNaN(n)) return 0
  return n % 10000
}

export function resolvePrize(
  digestHex: string,
  ticketPrice: TicketPriceUsdm,
): {
  tier: PrizeTier
  amountUsdm: number
  symbol: GameSymbol | null
  isWinner: boolean
} {
  const tier = tierFromRoll(rollFromDigest(digestHex))
  const amountUsdm = prizeAmountUsdm(tier, ticketPrice)
  const symbol = tier === 0 ? null : TIER_SYMBOL[tier]
  return {
    tier,
    amountUsdm,
    symbol,
    isWinner: tier !== 0,
  }
}

export default {
  GAME_VERSION,
  TICKET_PRICES_USDM,
  SYMBOLS,
  prizeAmountUsdm,
  tierFromRoll,
  rollFromDigest,
  resolvePrize,
}