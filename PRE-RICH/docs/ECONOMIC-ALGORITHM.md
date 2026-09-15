# PRE-RICH Economic Algorithm

This document specializes the generic IMMORTAL economic algorithm for Scratch & Win.

## 1. Canonical economic state

At minimum the application transition logic reasons over:

TotalLiquidity
PendingWinningLiabilities
UnresolvedTicketReserve
ClassAwareUnresolvedExposure
LockedJackpotLiquidity
CurrentActiveClass
HighestClassEverActivated
SafetyParameters
JackpotState

## 2. Sale

validate ticket class
→ validate exact application price
→ validate payment/conversion
→ read current economic state
→ compute post-sale unresolved exposure
→ compute protected obligations
→ evaluate deterministic exposure
→ evaluate statistical reserve
→ evaluate safety floor
→ evaluate locked Jackpot protection
→ evaluate CurrentActiveClass
→ mint ticket + record payment + reserve exposure atomically


A valid sale must preserve the post-state economic invariants.

## 3. Solvency

EffectivePool =
    TotalLiquidity
  - PendingWinningLiabilities
  - UnresolvedTicketReserve
  - LockedJackpotLiquidity


PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity


WorstCaseExposure(P,N) = 500 × P × N


RawSurplus = max(0, EEV − ProtectedCapital)


## 4. Reserve and class control


UnresolvedReserve(N) = N × μ + Z × σ × sqrt(N)


This is statistical risk capital, not deterministic worst-case protection.

`CurrentActiveClass` is the highest class whose verified post-sale state remains safe. `HighestClassEverActivated` is monotonic.

Contraction:


100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT


Hysteresis is CLOSED at:


KA = 8
KC = 4
KD = 4


## 5. Commit

Commit binds the required ticket/game context and secret before the result can be known, according to the cryptographic specification.

## 6. Reveal


validate expiry boundary
→ validate commitment
→ validate active Beacon/evidence
→ derive deterministic result
→ determine tier / Jackpot result
→ verify economic capacity
→ release unresolved exposure exactly once
→ create crystallized liability if winning
→ freeze result and payout


The player does not provide authoritative symbols, tier or payout.

## 7. Crystallization

Once crystallized, payout is immutable. Later liquidity, Treasury, PRE valuation, class, Jackpot or governance changes cannot recalculate it.

## 8. Claim

verify ticket and ownership where required
→ verify revealed state
→ use frozen payout
→ settle exact economic value
→ reduce liability exactly once
→ prevent second claim


CLAIM ≠ BURN


## 9. Expiry

After expiry:


newClaimability = false
newLiability = false
lateRevealEconomicEffect = none


The expired payment commitment dissolves. The unresolved reserve and expired right are released exactly once where applicable. OPEN-02 is only the exact ticket lifetime.

## 10. Settlement conversion


verified asset identity
→ valid/fresh oracle
→ deterministic conversion
→ conservative rounding
→ exact USDM-equivalent settlement


The economic value of a crystallized prize cannot be reduced by changing settlement asset.

## 11. Jackpot

NewJackpot <= RawSurplus
JackpotPayout <= LockedJackpotLiquidity


Jackpot selection is cryptographically verifiable and non-discretionary. After payout, the paid amount becomes a normal pending liability and Jackpot liquidity is reduced exactly once. OPEN-01 controls payout mode.

## 12. Treasury → PrizePool

Treasury funding of PrizePool must preserve crystallized liabilities, unresolved reserve, deterministic exposure, locked Jackpot, safety capital and all other mandatory invariants.

## 13. Liveness

Operational recovery and relaying are liveness functions only. They cannot alter outcomes, economic rights, randomness, payouts or protocol truth.
