/**
 * Mirror of plutus/GameRules.hs
 *
 * PrizeTable defines base multipliers for each winning tier.
 * Payout = baseForTier(tier) * priceUsdm / 2
 *
 * USDM SUB-UNITS: 1 USDM = 100 integer units.
 * pdPriceUsdm is stored in sub-units (e.g. Genesis = 100, Class 1 = 200).
 * The payout formula is: payout = base * priceUsdm / 2
 * With priceUsdm in sub-units, the result is in sub-units:
 *   payout_subunits = base * priceUsdm / 2
 *   payout_USDM = payout_subunits / 100
 *
 * Example (Genesis, priceUsdm = 100):
 *   Tier 1: 2 * 100 / 2 = 100 sub-units = 1.00 USDM
 *   Tier 2: 5 * 100 / 2 = 250 sub-units = 2.50 USDM
 *   Tier 3: 10 * 100 / 2 = 500 sub-units = 5.00 USDM
 *   Tier 4: 200 * 100 / 2 = 10000 sub-units = 100.00 USDM
 *   Tier 5: 1000 * 100 / 2 = 50000 sub-units = 500.00 USDM
 *
 * Ticket CLASS (pdPriceUsdm) != winning TIER.
 * A 1 USDM ticket can win tier 5 (500 USDM).
 * A 100 USDM ticket can win tier 1 (100 USDM).
 */

import { sha256, concatBytes } from './beacon'

export type PrizeTable = {
  tier1: number
  tier2: number
  tier3: number
  tier4: number
  tier5: number
}

export const defaultPrizeTable: PrizeTable = {
  tier1: 2,
  tier2: 5,
  tier3: 10,
  tier4: 200,
  tier5: 1000,
}

function baseForTier(t: PrizeTable, tier: number): number {
  if (tier === 1) return t.tier1
  if (tier === 2) return t.tier2
  if (tier === 3) return t.tier3
  if (tier === 4) return t.tier4
  if (tier === 5) return t.tier5
  return 0
}

/**
 * Returns payout in USDM sub-units (1 USDM = 100 sub-units).
 *
 * Parity with Plutus GameRules.prizeAmountForTier:
 *   Plutus: (baseForTier tier * priceUsdm) `divide` 2
 *   TypeScript: Math.floor((baseForTier tier * priceUsdm) / 2)
 *
 *   Both produce identical results for positive integers.
 *   The divisor is 2 in both. Sub-unit representation comes from
 *   priceUsdm being stored in sub-units (e.g. 100 for Genesis = 1 USDM).
 *
 *   Example (Genesis, priceUsdm = 100):
 *     Tier 1: 2 * 100 / 2 = 100 sub-units = 1.00 USDM
 *     Tier 2: 5 * 100 / 2 = 250 sub-units = 2.50 USDM
 *     Tier 3: 10 * 100 / 2 = 500 sub-units = 5.00 USDM
 *     Tier 4: 200 * 100 / 2 = 10000 sub-units = 100.00 USDM
 *     Tier 5: 1000 * 100 / 2 = 50000 sub-units = 500.00 USDM
 */
export function prizeAmountForTier(
  table: PrizeTable,
  tier: number,
  priceUsdm: number
): number {
  if (tier <= 0 || priceUsdm <= 0) return 0
  return Math.floor((baseForTier(table, tier) * priceUsdm) / 2)
}

export function classifyTier(symbols: Uint8Array): number {
  if (symbols.length < 6) return 0
  for (let sym = 5; sym >= 1; sym--) {
    let count = 0
    for (let i = 0; i < 6; i++) {
      if (symbols[i] === sym) count++
    }
    if (count >= 3) return sym
  }
  return 0
}

/** Must match GameRules.generateSymbols on-chain (rejection sampling, bounded within 32 bytes). */
export async function generateSymbols(symbolsSeed: Uint8Array): Promise<Uint8Array> {
  const out = new Uint8Array(6)
  let count = 0
  let hashPos = 0
  while (count < 6) {
    if (hashPos >= 32) {
      throw new Error('generateSymbols: hash exhausted for position')
    }
    const h = await sha256(concatBytes(new Uint8Array([count]), symbolsSeed))
    const byte = h[hashPos]
    if (byte === 255) {
      hashPos++
    } else {
      out[count] = (byte % 5) + 1
      count++
      hashPos = 0
    }
  }
  return out
}

export async function resultBinding(
  digest: Uint8Array,
  symbols: Uint8Array,
  fieldFn: (bs: Uint8Array) => Uint8Array,
  sha: (d: Uint8Array) => Promise<Uint8Array>
): Promise<Uint8Array> {
  return sha(concatBytes(fieldFn(digest), fieldFn(symbols)))
}