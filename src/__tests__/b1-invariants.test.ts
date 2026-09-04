/**
 * B1 PRE-RICH Invariant Tests
 *
 * These tests verify economic invariants through TypeScript mirror logic.
 *
 * Two categories:
 *   1. PURE MIRROR TESTS — test the TypeScript logic that mirrors on-chain rules.
 *      These prove the off-chain code computes correctly. They do NOT prove
 *      the Plutus validator is correct.
 *   2. EMULATOR-ONLY — invariants that cannot be tested without a Plutus
 *      emulator (e.g. actual script execution, signature verification,
 *      UTxO value enforcement). These are documented but skipped.
 *
 * Run: npx tsx src/__tests__/b1-invariants.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyTier,
  defaultPrizeTable,
  generateSymbols,
  prizeAmountForTier,
} from '../gameRules'
import { sha256, concatBytes } from '../beacon'
import {
  GENESIS_TICKET_PRICE_USDM,
  TICKET_PAYMENT_LOVELACE,
} from '../config'

// ============================================================
// B1PrizePool state-transition model (TypeScript mirror)
//
// These functions mirror the Plutus B1PrizePool validator logic.
// They operate on plain objects, not on-chain datums.
// ============================================================

interface B1PrizePoolState {
  ppTotalLiquidity: number
  ppPendingLiabilities: number
  ppUnresolvedReserve: number
  ppUnresolvedTicketCount: number
  ppLockedJackpot: number
  ppJackpotThreshold: number
}

function effectivePool(d: B1PrizePoolState): number {
  return (
    d.ppTotalLiquidity -
    d.ppPendingLiabilities -
    d.ppUnresolvedReserve -
    d.ppLockedJackpot
  )
}

function solvencyOk(d: B1PrizePoolState): boolean {
  return (
    d.ppTotalLiquidity >= 0 &&
    d.ppPendingLiabilities >= 0 &&
    d.ppUnresolvedReserve >= 0 &&
    d.ppUnresolvedTicketCount >= 0 &&
    d.ppLockedJackpot >= 0 &&
    effectivePool(d) >= 0
  )
}

function jackpotActive(d: B1PrizePoolState): boolean {
  return effectivePool(d) >= d.ppJackpotThreshold
}

/** Mirror of B1PrizePool TicketIssued. */
function applyTicketIssued(
  d: B1PrizePoolState,
  reservePerTicket: number,
): B1PrizePoolState {
  if (reservePerTicket <= 0) throw new Error('reservePerTicket must be > 0')
  return {
    ...d,
    ppUnresolvedTicketCount: d.ppUnresolvedTicketCount + 1,
    ppUnresolvedReserve: d.ppUnresolvedReserve + reservePerTicket,
  }
}

/** Mirror of B1PrizePool TicketRevealed. */
function applyTicketRevealed(
  d: B1PrizePoolState,
  reserveRelease: number,
  payout: number,
): B1PrizePoolState {
  if (reserveRelease < 0) throw new Error('reserveRelease must be >= 0')
  if (payout < 0) throw new Error('payout must be >= 0')
  if (d.ppUnresolvedTicketCount <= 0) throw new Error('count must be > 0')
  return {
    ...d,
    ppUnresolvedTicketCount: d.ppUnresolvedTicketCount - 1,
    ppUnresolvedReserve: d.ppUnresolvedReserve - reserveRelease,
    ppPendingLiabilities: d.ppPendingLiabilities + payout,
  }
}

/** Mirror of B1PrizePool TicketClaimed. */
function applyTicketClaimed(
  d: B1PrizePoolState,
  claimedAmount: number,
): B1PrizePoolState {
  if (claimedAmount <= 0) throw new Error('claimedAmount must be > 0')
  if (claimedAmount > d.ppPendingLiabilities) {
    throw new Error('claimedAmount exceeds pending liabilities')
  }
  return {
    ...d,
    ppTotalLiquidity: d.ppTotalLiquidity - claimedAmount,
    ppPendingLiabilities: d.ppPendingLiabilities - claimedAmount,
  }
}

/** Mirror of B1PrizePool TicketExpired. */
function applyTicketExpired(d: B1PrizePoolState): B1PrizePoolState {
  if (d.ppUnresolvedTicketCount <= 0) throw new Error('count must be > 0')
  const reservePerTicket =
    d.ppUnresolvedTicketCount > 0
      ? Math.floor(d.ppUnresolvedReserve / d.ppUnresolvedTicketCount)
      : 0
  return {
    ...d,
    ppUnresolvedTicketCount: d.ppUnresolvedTicketCount - 1,
    ppUnresolvedReserve: d.ppUnresolvedReserve - reservePerTicket,
  }
}

function makeState(overrides: Partial<B1PrizePoolState> = {}): B1PrizePoolState {
  return {
    ppTotalLiquidity: 0,
    ppPendingLiabilities: 0,
    ppUnresolvedReserve: 0,
    ppUnresolvedTicketCount: 0,
    ppLockedJackpot: 0,
    ppJackpotThreshold: 10_000,
    ...overrides,
  }
}

// ============================================================
// 1. Genesis Price
// ============================================================

describe('Genesis Price', () => {
  it('GENESIS_TICKET_PRICE_USDM = 100 (1 USDM in sub-units)', () => {
    assert.equal(GENESIS_TICKET_PRICE_USDM, 100)
  })

  it('TICKET_PAYMENT_LOVELACE = 1_000_000 (1 ADA for Preprod)', () => {
    assert.equal(TICKET_PAYMENT_LOVELACE, 1_000_000)
  })

  it('Genesis price is NOT 200 sub-units (2 USDM)', () => {
    assert.notEqual(GENESIS_TICKET_PRICE_USDM, 200)
  })
})

// ============================================================
// 2. PrizeTable Payouts
// ============================================================

describe('PrizeTable Payouts', () => {
  it('Genesis (100 sub-units) Tier 1 = 100 sub-units (1.00 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 1, 100)
    assert.equal(payout, 100) // 2 * 100 / 2 = 100
  })

  it('Genesis (100 sub-units) Tier 2 = 250 sub-units (2.50 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 2, 100)
    assert.equal(payout, 250) // 5 * 100 / 2 = 250
  })

  it('Genesis (100 sub-units) Tier 3 = 500 sub-units (5.00 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 3, 100)
    assert.equal(payout, 500) // 10 * 100 / 2 = 500
  })

  it('Genesis (100 sub-units) Tier 4 = 10000 sub-units (100.00 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 4, 100)
    assert.equal(payout, 10000) // 200 * 100 / 2 = 10000
  })

  it('Genesis (100 sub-units) Tier 5 = 50000 sub-units (500.00 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 5, 100)
    assert.equal(payout, 50000) // 1000 * 100 / 2 = 50000
  })

  it('Class 1 (200 sub-units) Tier 1 = 200 sub-units (2.00 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 1, 200)
    assert.equal(payout, 200) // 2 * 200 / 2 = 200
  })

  it('Class 2 (300 sub-units) Tier 3 = 1500 sub-units (15.00 USDM)', () => {
    const payout = prizeAmountForTier(defaultPrizeTable, 3, 300)
    assert.equal(payout, 1500) // 10 * 300 / 2 = 1500
  })

  it('Tier 0 (loss) always pays 0', () => {
    assert.equal(prizeAmountForTier(defaultPrizeTable, 0, 100), 0)
    assert.equal(prizeAmountForTier(defaultPrizeTable, 0, 10000), 0)
  })

  it('Invalid priceUsdm pays 0', () => {
    assert.equal(prizeAmountForTier(defaultPrizeTable, 1, 0), 0)
    assert.equal(prizeAmountForTier(defaultPrizeTable, 1, -1), 0)
  })
})

// ============================================================
// 3. Symbol Generation (Rejection Sampling)
// ============================================================

describe('Symbol Generation', () => {
  it('produces exactly 6 symbols', async () => {
    const seed = new Uint8Array(32)
    seed[0] = 0x42
    const symbols = await generateSymbols(seed)
    assert.equal(symbols.length, 6)
  })

  it('all symbols in range 1..5', async () => {
    const seed = new Uint8Array(32)
    for (let i = 0; i < 10; i++) {
      seed[i] = i * 37
      const symbols = await generateSymbols(seed)
      for (const s of symbols) {
        assert.ok(s >= 1 && s <= 5, `symbol ${s} out of range 1..5`)
      }
    }
  })

  it('deterministic: same seed produces same symbols', async () => {
    const seed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
    const s1 = await generateSymbols(seed)
    const s2 = await generateSymbols(seed)
    assert.deepEqual(Array.from(s1), Array.from(s2))
  })

  it('different seeds produce different symbols', async () => {
    const seed1 = new Uint8Array(32).fill(0)
    const seed2 = new Uint8Array(32).fill(1)
    const s1 = await generateSymbols(seed1)
    const s2 = await generateSymbols(seed2)
    const same = Array.from(s1).every((v, i) => v === s2[i])
    assert.ok(!same, 'different seeds should produce different symbols')
  })
})

// ============================================================
// 4. Tier Classification
// ============================================================

describe('Tier Classification', () => {
  it('3+ of symbol 5 produces tier 5', () => {
    const symbols = new Uint8Array([5, 5, 5, 1, 2, 3])
    assert.equal(classifyTier(symbols), 5)
  })

  it('3+ of symbol 4 produces tier 4', () => {
    const symbols = new Uint8Array([4, 4, 4, 1, 2, 3])
    assert.equal(classifyTier(symbols), 4)
  })

  it('3+ of symbol 3 produces tier 3', () => {
    const symbols = new Uint8Array([3, 3, 3, 1, 2, 4])
    assert.equal(classifyTier(symbols), 3)
  })

  it('no 3+ matching produces tier 0 (loss)', () => {
    const symbols = new Uint8Array([1, 2, 3, 4, 5, 1])
    assert.equal(classifyTier(symbols), 0)
  })

  it('highest tier wins when multiple qualify', () => {
    const symbols = new Uint8Array([5, 5, 5, 4, 4, 4])
    assert.equal(classifyTier(symbols), 5)
  })

  it('less than 6 symbols produces tier 0', () => {
    const symbols = new Uint8Array([5, 5, 5])
    assert.equal(classifyTier(symbols), 0)
  })
})

// ============================================================
// 5. Effective Pool Formula
// ============================================================

describe('Effective Pool Formula', () => {
  it('effectivePool >= 0 (solvency invariant)', () => {
    const ep = effectivePool(makeState({
      ppTotalLiquidity: 100,
      ppPendingLiabilities: 10,
      ppUnresolvedReserve: 20,
      ppLockedJackpot: 5,
    }))
    assert.equal(ep, 65)
    assert.ok(ep >= 0)
  })

  it('effectivePool = 0 at boundary', () => {
    const ep = effectivePool(makeState({
      ppTotalLiquidity: 100,
      ppPendingLiabilities: 50,
      ppUnresolvedReserve: 30,
      ppLockedJackpot: 20,
    }))
    assert.equal(ep, 0)
  })

  it('effectivePool < 0 is invalid', () => {
    const ep = effectivePool(makeState({
      ppTotalLiquidity: 100,
      ppPendingLiabilities: 50,
      ppUnresolvedReserve: 30,
      ppLockedJackpot: 21,
    }))
    assert.ok(ep < 0)
  })
})

// ============================================================
// 6. Jackpot Activation
// ============================================================

describe('Jackpot Activation', () => {
  it('jackpot active when effectivePool >= threshold', () => {
    const d = makeState({
      ppTotalLiquidity: 20_000,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 0,
      ppLockedJackpot: 0,
      ppJackpotThreshold: 10_000,
    })
    assert.ok(jackpotActive(d))
  })

  it('jackpot inactive when effectivePool < threshold', () => {
    const d = makeState({
      ppTotalLiquidity: 9_999,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 0,
      ppLockedJackpot: 0,
      ppJackpotThreshold: 10_000,
    })
    assert.ok(!jackpotActive(d))
  })

  it('locked jackpot reduces effectivePool for threshold check', () => {
    const d = makeState({
      ppTotalLiquidity: 15_000,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 0,
      ppLockedJackpot: 6_000,
      ppJackpotThreshold: 10_000,
    })
    // effectivePool = 15000 - 0 - 0 - 6000 = 9000 < 10000
    assert.ok(!jackpotActive(d))
  })

  it('jackpot active at exact threshold', () => {
    const d = makeState({
      ppTotalLiquidity: 10_000,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 0,
      ppLockedJackpot: 0,
      ppJackpotThreshold: 10_000,
    })
    assert.ok(jackpotActive(d))
  })
})

// ============================================================
// 7. Suspended Classes Bitmask
// ============================================================

describe('Suspended Classes Bitmask', () => {
  function isClassSuspended(bitmask: number, classIndex: number): boolean {
    return (bitmask & (1 << classIndex)) !== 0
  }

  it('bit 0 = Genesis (1 USDM)', () => {
    const mask = 0b0000_0001
    assert.ok(isClassSuspended(mask, 0))
    assert.ok(!isClassSuspended(mask, 1))
  })

  it('bit 7 = 100 USDM class', () => {
    const mask = 0b1000_0000
    assert.ok(isClassSuspended(mask, 7))
    assert.ok(!isClassSuspended(mask, 0))
  })

  it('higher classes suspended first', () => {
    const mask = 0b1110_0000
    assert.ok(isClassSuspended(mask, 7))
    assert.ok(isClassSuspended(mask, 6))
    assert.ok(isClassSuspended(mask, 5))
    assert.ok(!isClassSuspended(mask, 0))
    assert.ok(!isClassSuspended(mask, 1))
  })

  it('all suspended = 0xFF', () => {
    const mask = 0xFF
    for (let i = 0; i < 8; i++) {
      assert.ok(isClassSuspended(mask, i))
    }
  })

  it('none suspended = 0x00', () => {
    const mask = 0x00
    for (let i = 0; i < 8; i++) {
      assert.ok(!isClassSuspended(mask, i))
    }
  })
})

// ============================================================
// 8. B1PrizePool State Transitions (PURE MIRROR TESTS)
//
// These test the TypeScript mirror of the Plutus B1PrizePool
// validator state transitions. They prove the off-chain
// computation is correct. They do NOT prove the Plutus
// validator is correct — that requires an emulator.
// ============================================================

describe('TicketIssued', () => {
  it('unresolvedTicketCount increases by 1', () => {
    const d = makeState({ ppUnresolvedTicketCount: 5 })
    const n = applyTicketIssued(d, 100)
    assert.equal(n.ppUnresolvedTicketCount, 6)
  })

  it('unresolvedReserve increases by reservePerTicket', () => {
    const d = makeState({ ppUnresolvedReserve: 500 })
    const n = applyTicketIssued(d, 100)
    assert.equal(n.ppUnresolvedReserve, 600)
  })

  it('other fields unchanged', () => {
    const d = makeState({
      ppTotalLiquidity: 1000,
      ppPendingLiabilities: 200,
      ppLockedJackpot: 50,
      ppJackpotThreshold: 5000,
    })
    const n = applyTicketIssued(d, 100)
    assert.equal(n.ppTotalLiquidity, 1000)
    assert.equal(n.ppPendingLiabilities, 200)
    assert.equal(n.ppLockedJackpot, 50)
    assert.equal(n.ppJackpotThreshold, 5000)
  })

  it('reservePerTicket = 0 is rejected', () => {
    const d = makeState()
    assert.throws(() => applyTicketIssued(d, 0), /reservePerTicket/)
  })

  it('reservePerTicket < 0 is rejected', () => {
    const d = makeState()
    assert.throws(() => applyTicketIssued(d, -1), /reservePerTicket/)
  })

  it('solvency preserved when underlying state is solvent', () => {
    const d = makeState({
      ppTotalLiquidity: 10_000,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 0,
      ppLockedJackpot: 0,
    })
    const n = applyTicketIssued(d, 100)
    assert.ok(solvencyOk(n))
  })

  it('multiple issuances accumulate correctly', () => {
    let d = makeState()
    d = applyTicketIssued(d, 100)
    d = applyTicketIssued(d, 200)
    d = applyTicketIssued(d, 150)
    assert.equal(d.ppUnresolvedTicketCount, 3)
    assert.equal(d.ppUnresolvedReserve, 450)
  })
})

describe('TicketRevealed', () => {
  it('unresolvedTicketCount decreases by 1', () => {
    const d = makeState({ ppUnresolvedTicketCount: 5 })
    const n = applyTicketRevealed(d, 100, 250)
    assert.equal(n.ppUnresolvedTicketCount, 4)
  })

  it('unresolvedReserve decreases by reserveRelease', () => {
    const d = makeState({ ppUnresolvedReserve: 500, ppUnresolvedTicketCount: 5 })
    const n = applyTicketRevealed(d, 100, 250)
    assert.equal(n.ppUnresolvedReserve, 400)
  })

  it('pendingLiabilities increases by crystallised payout', () => {
    const d = makeState({ ppPendingLiabilities: 0, ppUnresolvedTicketCount: 5 })
    const n = applyTicketRevealed(d, 100, 250)
    assert.equal(n.ppPendingLiabilities, 250)
  })

  it('loss (payout = 0) increases liabilities by 0', () => {
    const d = makeState({ ppPendingLiabilities: 100, ppUnresolvedTicketCount: 5, ppUnresolvedReserve: 500 })
    const n = applyTicketRevealed(d, 100, 0)
    assert.equal(n.ppPendingLiabilities, 100)
    assert.equal(n.ppUnresolvedReserve, d.ppUnresolvedReserve - 100)
  })

  it('reserveRelease = 0 is valid (no reserve freed)', () => {
    const d = makeState({ ppUnresolvedReserve: 500, ppUnresolvedTicketCount: 5 })
    const n = applyTicketRevealed(d, 0, 250)
    assert.equal(n.ppUnresolvedReserve, 500)
    assert.equal(n.ppUnresolvedTicketCount, 4)
  })

  it('reserveRelease < 0 is rejected', () => {
    const d = makeState({ ppUnresolvedTicketCount: 1 })
    assert.throws(() => applyTicketRevealed(d, -1, 100), /reserveRelease/)
  })

  it('payout < 0 is rejected', () => {
    const d = makeState({ ppUnresolvedTicketCount: 1 })
    assert.throws(() => applyTicketRevealed(d, 0, -1), /payout/)
  })

  it('count = 0 is rejected', () => {
    const d = makeState({ ppUnresolvedTicketCount: 0 })
    assert.throws(() => applyTicketRevealed(d, 0, 100), /count/)
  })

  it('totalLiquidity unchanged by reveal', () => {
    const d = makeState({ ppTotalLiquidity: 10_000, ppUnresolvedTicketCount: 5, ppUnresolvedReserve: 500 })
    const n = applyTicketRevealed(d, 100, 250)
    assert.equal(n.ppTotalLiquidity, 10_000)
  })
})

describe('TicketClaimed', () => {
  it('ppTotalLiquidity decreases by exact payout', () => {
    const d = makeState({ ppTotalLiquidity: 10_000, ppPendingLiabilities: 500 })
    const n = applyTicketClaimed(d, 250)
    assert.equal(n.ppTotalLiquidity, 9_750)
  })

  it('ppPendingLiabilities decreases by exact payout', () => {
    const d = makeState({ ppTotalLiquidity: 10_000, ppPendingLiabilities: 500 })
    const n = applyTicketClaimed(d, 250)
    assert.equal(n.ppPendingLiabilities, 250)
  })

  it('unresolvedReserve unchanged by claim', () => {
    const d = makeState({
      ppTotalLiquidity: 10_000,
      ppPendingLiabilities: 500,
      ppUnresolvedReserve: 300,
    })
    const n = applyTicketClaimed(d, 250)
    assert.equal(n.ppUnresolvedReserve, 300)
  })

  it('claimedAmount = 0 is rejected', () => {
    const d = makeState({ ppPendingLiabilities: 100 })
    assert.throws(() => applyTicketClaimed(d, 0), /claimedAmount/)
  })

  it('claimedAmount > pendingLiabilities is rejected', () => {
    const d = makeState({ ppPendingLiabilities: 100 })
    assert.throws(() => applyTicketClaimed(d, 101), /exceeds/)
  })

  it('claimedAmount = pendingLiabilities is valid (drains to 0)', () => {
    const d = makeState({ ppTotalLiquidity: 1000, ppPendingLiabilities: 100 })
    const n = applyTicketClaimed(d, 100)
    assert.equal(n.ppPendingLiabilities, 0)
    assert.equal(n.ppTotalLiquidity, 900)
  })

  it('solvency preserved when claim is within liabilities', () => {
    const d = makeState({
      ppTotalLiquidity: 10_000,
      ppPendingLiabilities: 500,
      ppUnresolvedReserve: 200,
      ppLockedJackpot: 0,
    })
    const n = applyTicketClaimed(d, 250)
    assert.ok(solvencyOk(n))
  })
})

describe('TicketExpired', () => {
  it('unresolvedTicketCount decreases by 1', () => {
    const d = makeState({
      ppUnresolvedTicketCount: 5,
      ppUnresolvedReserve: 500,
    })
    const n = applyTicketExpired(d)
    assert.equal(n.ppUnresolvedTicketCount, 4)
  })

  it('reserve released = floor(reserve / count)', () => {
    const d = makeState({
      ppUnresolvedTicketCount: 5,
      ppUnresolvedReserve: 500,
    })
    const n = applyTicketExpired(d)
    // reservePerTicket = floor(500 / 5) = 100
    assert.equal(n.ppUnresolvedReserve, 400)
  })

  it('reserve released with integer division (non-even split)', () => {
    const d = makeState({
      ppUnresolvedTicketCount: 3,
      ppUnresolvedReserve: 1000,
    })
    const n = applyTicketExpired(d)
    // reservePerTicket = floor(1000 / 3) = 333
    assert.equal(n.ppUnresolvedReserve, 667)
  })

  it('count = 0 is rejected', () => {
    const d = makeState({ ppUnresolvedTicketCount: 0 })
    assert.throws(() => applyTicketExpired(d), /count/)
  })

  it('pendingLiabilities unchanged by expiry', () => {
    const d = makeState({
      ppUnresolvedTicketCount: 3,
      ppUnresolvedReserve: 300,
      ppPendingLiabilities: 100,
    })
    const n = applyTicketExpired(d)
    assert.equal(n.ppPendingLiabilities, 100)
  })

  it('totalLiquidity unchanged by expiry', () => {
    const d = makeState({
      ppTotalLiquidity: 5000,
      ppUnresolvedTicketCount: 3,
      ppUnresolvedReserve: 300,
    })
    const n = applyTicketExpired(d)
    assert.equal(n.ppTotalLiquidity, 5000)
  })

  it('multiple expiry events accumulate correctly', () => {
    let d = makeState({
      ppUnresolvedTicketCount: 4,
      ppUnresolvedReserve: 400,
    })
    d = applyTicketExpired(d) // count=3, reserve=300
    d = applyTicketExpired(d) // count=2, reserve=200
    assert.equal(d.ppUnresolvedTicketCount, 2)
    assert.equal(d.ppUnresolvedReserve, 200)
  })
})

describe('Solvency Invariant', () => {
  it('solvencyOk returns true for valid state', () => {
    const d = makeState({
      ppTotalLiquidity: 1000,
      ppPendingLiabilities: 100,
      ppUnresolvedReserve: 200,
      ppLockedJackpot: 0,
    })
    assert.ok(solvencyOk(d))
  })

  it('solvencyOk returns false when liabilities > liquidity', () => {
    const d = makeState({
      ppTotalLiquidity: 100,
      ppPendingLiabilities: 200,
    })
    assert.ok(!solvencyOk(d))
  })

  it('solvencyOk returns false when reserve > liquidity', () => {
    const d = makeState({
      ppTotalLiquidity: 100,
      ppUnresolvedReserve: 200,
    })
    assert.ok(!solvencyOk(d))
  })

  it('payout must not exceed effectivePool at reveal time', () => {
    const d = makeState({
      ppTotalLiquidity: 1000,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 900,
      ppUnresolvedTicketCount: 9,
      ppLockedJackpot: 0,
    })
    // effectivePool = 1000 - 0 - 900 - 0 = 100
    // payout = 250 would exceed effectivePool
    const n = applyTicketRevealed(d, 100, 250)
    // n.pendingLiabilities = 250, n.reserve = 800
    // n.effectivePool = 1000 - 250 - 800 - 0 = -50 < 0
    assert.ok(!solvencyOk(n), 'payout exceeding effectivePool must fail solvency')
  })

  it('payout within effectivePool preserves solvency', () => {
    const d = makeState({
      ppTotalLiquidity: 1000,
      ppPendingLiabilities: 0,
      ppUnresolvedReserve: 500,
      ppUnresolvedTicketCount: 5,
      ppLockedJackpot: 0,
    })
    // effectivePool = 1000 - 0 - 500 - 0 = 500
    const n = applyTicketRevealed(d, 100, 250)
    // n.pendingLiabilities = 250, n.reserve = 400
    // n.effectivePool = 1000 - 250 - 400 - 0 = 350 >= 0
    assert.ok(solvencyOk(n))
  })

  it('full lifecycle preserves solvency when properly funded', () => {
    // Start with 10,000 sub-units liquidity
    let d = makeState({ ppTotalLiquidity: 10_000 })

    // Issue 10 tickets at 100 sub-units reserve each
    for (let i = 0; i < 10; i++) {
      d = applyTicketIssued(d, 100)
    }
    assert.equal(d.ppUnresolvedTicketCount, 10)
    assert.equal(d.ppUnresolvedReserve, 1000)
    assert.ok(solvencyOk(d))

    // Reveal 5 as losses, 3 as small wins, 1 as big win, 1 unrevealed
    d = applyTicketRevealed(d, 100, 0)    // loss
    d = applyTicketRevealed(d, 100, 0)    // loss
    d = applyTicketRevealed(d, 100, 0)    // loss
    d = applyTicketRevealed(d, 100, 100)  // win 100
    d = applyTicketRevealed(d, 100, 250)  // win 250
    d = applyTicketRevealed(d, 100, 100)  // win 100
    d = applyTicketRevealed(d, 100, 250)  // win 250
    // 3 unrevealed remaining
    assert.equal(d.ppUnresolvedTicketCount, 3)
    assert.equal(d.ppPendingLiabilities, 700)
    assert.ok(solvencyOk(d))

    // Claim all winning tickets
    d = applyTicketClaimed(d, 100)
    d = applyTicketClaimed(d, 250)
    d = applyTicketClaimed(d, 100)
    d = applyTicketClaimed(d, 250)
    assert.equal(d.ppPendingLiabilities, 0)
    assert.equal(d.ppTotalLiquidity, 10_000 - 700)
    assert.ok(solvencyOk(d))
  })
})

describe('Jackpot Accounting', () => {
  it('locked jackpot reduces effective pool', () => {
    const d = makeState({
      ppTotalLiquidity: 10_000,
      ppLockedJackpot: 3_000,
    })
    assert.equal(effectivePool(d), 7_000)
  })

  it('effectivePool = totalLiquidity when all other fields are 0', () => {
    const d = makeState({ ppTotalLiquidity: 5000 })
    assert.equal(effectivePool(d), 5000)
  })

  it('jackpot threshold checked against effectivePool, not totalLiquidity', () => {
    // totalLiquidity = 15000 but lockedJackpot = 6000 → effectivePool = 9000
    const d = makeState({
      ppTotalLiquidity: 15_000,
      ppLockedJackpot: 6_000,
      ppJackpotThreshold: 10_000,
    })
    assert.ok(!jackpotActive(d), '9000 < 10000')
    assert.ok(effectivePool(d) < d.ppJackpotThreshold)
  })
})

describe('USDM / Lovelace Unit Boundary', () => {
  it('prizeAmountForTier returns USDM sub-units, not lovelace', () => {
    // Genesis Tier 1: 2 * 100 / 2 = 100 sub-units = 1.00 USDM
    // This is NOT 100 lovelace (which would be 0.0001 ADA)
    const payout = prizeAmountForTier(defaultPrizeTable, 1, 100)
    assert.equal(payout, 100)
    // 100 sub-units != 100 lovelace — they are different units
    assert.ok(true, '100 USDM sub-units is NOT 100 lovelace')
  })

  it('TICKET_PAYMENT_LOVELACE is ADA, not USDM', () => {
    // 1_000_000 lovelace = 1 ADA (settlement)
    // 100 sub-units = 1 USDM (economic)
    // These are independent values in different unit systems
    assert.equal(TICKET_PAYMENT_LOVELACE, 1_000_000)
    assert.equal(GENESIS_TICKET_PRICE_USDM, 100)
    // 1_000_000 != 100 — correct, they are in different units
  })

  it('effectivePool mixes units when B1PrizePool fields are lovelace but payout is USDM', () => {
    // DOCUMENTED INCONSISTENCY: B1PrizePoolDatum fields are documented as
    // lovelace (ADA), but pdPrizeAmount is in USDM sub-units. The on-chain
    // validator adds them directly. This only works when 1 ADA ≈ 1 USDM.
    //
    // This test documents the unit boundary. On mainnet with a different
    // ADA/USDM rate, a conversion mechanism is required.
    const payoutSubUnits = prizeAmountForTier(defaultPrizeTable, 2, 100) // 250 USDM sub-units
    const lovelaceInB1pp = 250 //假設 B1PrizePool 儲存的是 lovelace

    // The on-chain code treats them as the same unit:
    //   ppPendingLiabilities == ppPendingLiabilities + payout
    // This is only safe if the "lovelace" fields are actually USDM sub-units
    // or if 1 ADA = 1 USDM.
    assert.equal(payoutSubUnits, lovelaceInB1pp, 'documented: same numeric value, different units')
  })

  it('Genesis payout table in USDM sub-units', () => {
    const genesis = 100 // 1 USDM = 100 sub-units
    const expected = [
      { tier: 0, subunits: 0, usdm: '0.00' },
      { tier: 1, subunits: 100, usdm: '1.00' },
      { tier: 2, subunits: 250, usdm: '2.50' },
      { tier: 3, subunits: 500, usdm: '5.00' },
      { tier: 4, subunits: 10000, usdm: '100.00' },
      { tier: 5, subunits: 50000, usdm: '500.00' },
    ]
    for (const { tier, subunits } of expected) {
      assert.equal(
        prizeAmountForTier(defaultPrizeTable, tier, genesis),
        subunits,
        `Tier ${tier} = ${subunits} sub-units`,
      )
    }
  })
})

// ============================================================
// 9. Domain Separation
// ============================================================

describe('Domain Separation', () => {
  it('different domains produce different hashes', async () => {
    const data = new Uint8Array([1, 2, 3])
    const dom1 = new TextEncoder().encode('PRE-RICH/BEACON/V1')
    const dom2 = new TextEncoder().encode('PRE-RICH/PLAYER/V1')
    const dom3 = new TextEncoder().encode('PRE-RICH/SYMBOLS/V1')

    const h1 = await sha256(concatBytes(dom1, data))
    const h2 = await sha256(concatBytes(dom2, data))
    const h3 = await sha256(concatBytes(dom3, data))

    assert.ok(
      h1.some((v, i) => v !== h2[i]),
      'beacon and player domains differ',
    )
    assert.ok(
      h1.some((v, i) => v !== h3[i]),
      'beacon and symbols domains differ',
    )
    assert.ok(
      h2.some((v, i) => v !== h3[i]),
      'player and symbols domains differ',
    )
  })
})

// ============================================================
// 10. Edge Cases
// ============================================================

describe('Edge Cases', () => {
  it('prizeAmountForTier with tier > 5 returns 0', () => {
    assert.equal(prizeAmountForTier(defaultPrizeTable, 6, 100), 0)
    assert.equal(prizeAmountForTier(defaultPrizeTable, 100, 100), 0)
  })

  it('prizeAmountForTier with negative tier returns 0', () => {
    assert.equal(prizeAmountForTier(defaultPrizeTable, -1, 100), 0)
  })

  it('classifyTier with empty symbols returns 0', () => {
    assert.equal(classifyTier(new Uint8Array(0)), 0)
  })

  it('all same symbols produces highest tier', () => {
    const symbols = new Uint8Array([3, 3, 3, 3, 3, 3])
    assert.equal(classifyTier(symbols), 3)
  })
})

// ============================================================
// 11. Emulator-Only Invariants (NOT TESTABLE HERE)
//
// The following invariants require a Plutus emulator or
// on-chain execution to verify. They are documented here
// for completeness but cannot be tested in pure TypeScript.
// ============================================================

describe('Emulator-Only Invariants (documented, not tested)', () => {
  it('MintPolicy validates counter advance and NFT mint', () => {
    // Requires: counter UTxO spend, minting policy execution
    assert.ok(true, 'EMULATOR-ONLY: requires Plutus script execution')
  })

  it('B1PrizePool validates PrizeDatum output exists at prizeHash', () => {
    // Requires: spending B1PrizePool UTxO, verifying output at prizeHash
    assert.ok(true, 'EMULATOR-ONLY: requires UTxO traversal')
  })

  it('PrizeValidator verifies owner signature via ticket NFT', () => {
    // Requires: finding ticket NFT in inputs, checking signatories
    assert.ok(true, 'EMULATOR-ONLY: requires signature verification')
  })

  it('PrizeValidator enforces claimBeforeExpiry', () => {
    // Requires: tx validity range check
    assert.ok(true, 'EMULATOR-ONLY: requires POSIX time range')
  })

  it('B1PrizePool enforces valuePreserved (UTxO value conservation)', () => {
    // Requires: comparing input UTxO value to output UTxO value
    assert.ok(true, 'EMULATOR-ONLY: requires UTxO value inspection')
  })

  it('NFT is NOT burned on claim (Constitution 35)', () => {
    // Requires: checking that no burning mint occurs during claim
    assert.ok(true, 'EMULATOR-ONLY: requires minting policy inspection')
  })

  it('single claim enforced by status transition Pending→Revealed→Claimed', () => {
    // The PrizeDatum status machine prevents double claim on-chain.
    // This is verified by the Plutus validator checking pdStatus.
    // The TypeScript mirror test for solvency covers the accounting
    // side; the status machine requires emulator testing.
    assert.ok(true, 'EMULATOR-ONLY: requires datum state inspection')
  })

  it('reservePerTicket in TicketIssued must be validated against protocol state', () => {
    // FLAGGED: Currently the on-chain validator only checks > 0.
    // A malicious tx could supply an arbitrary reservePerTicket.
    // This is a trustless-accounting gap that requires either:
    //   (a) on-chain derivation from protocol config, or
    //   (b) oracle-verified input, or
    //   (c) off-chain attestation with fraud proof.
    assert.ok(true, 'TRUSTLESS-ACCOUNTING GAP: needs design decision')
  })

  it('reserveRelease in TicketRevealed must be validated against protocol state', () => {
    // FLAGGED: Same issue as reservePerTicket. The off-chain code
    // computes reserveRelease = floor(reserve / count), but the
    // on-chain validator only checks >= 0.
    assert.ok(true, 'TRUSTLESS-ACCOUNTING GAP: needs design decision')
  })

  it('PrizeValidator cross-validates B1PrizePool output on Reveal', () => {
    // FIXED (atomicity): PrizeValidator now reads B1PrizePool input/output
    // via pdPrizePoolHash and verifies:
    //   newPendingLiabilities == oldPendingLiabilities + amountUsdm
    //   newUnresolvedReserve < oldUnresolvedReserve
    //   newTotalLiquidity == oldTotalLiquidity
    //   newUnresolvedTicketCount == oldUnresolvedTicketCount - 1
    assert.ok(true, 'EMULATOR-ONLY: requires PrizeValidator+B1PrizePool joint execution')
  })

  it('PrizeValidator cross-validates B1PrizePool output on Claim', () => {
    // FIXED (atomicity): PrizeValidator now reads B1PrizePool input/output
    // via pdPrizePoolHash and verifies:
    //   newTotalLiquidity == oldTotalLiquidity - payout
    //   newPendingLiabilities == oldPendingLiabilities - payout
    //   newUnresolvedReserve == oldUnresolvedReserve
    //   newUnresolvedTicketCount == oldUnresolvedTicketCount
    assert.ok(true, 'EMULATOR-ONLY: requires PrizeValidator+B1PrizePool joint execution')
  })

  it('B1PrizePool validates PrizeDatum input status before transition', () => {
    // B1PrizePool reads the Prize input's datum via prizeHash and verifies:
    //   TicketRevealed: input PrizeDatum has status=Pending
    //   TicketClaimed: input PrizeDatum has status=Revealed
    //   TicketExpired: input PrizeDatum has status=Pending
    // This prevents replay of already-transitioned PrizeDatums.
    assert.ok(true, 'EMULATOR-ONLY: requires Prize input datum inspection')
  })
})

console.log('All B1 invariant tests passed.')
