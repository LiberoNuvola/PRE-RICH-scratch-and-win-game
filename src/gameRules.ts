/**
 * Mirror of plutus/GameRules.hs
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

/** Must match GameRules.generateSymbols on-chain. */
export async function generateSymbols(symbolsSeed: Uint8Array): Promise<Uint8Array> {
  const out = new Uint8Array(6)
  for (let i = 0; i < 6; i++) {
    const h = await sha256(concatBytes(new Uint8Array([i]), symbolsSeed))
    out[i] = (h[0] % 5) + 1
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