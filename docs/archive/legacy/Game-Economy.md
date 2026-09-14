# PRE-RICH Game Economy

**Role:** normative PRE-RICH application economic specification

**Semantic status:** CLOSED except for the three explicitly listed open policies.

**Implementation/evidence:** tracked separately; gaps do not reopen closed semantics.

## 1. Frozen baseline

```text
KA = 8
KC = 4
KD = 4

Ticket ladder:
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM

Genesis ticket = 1 USDM
Genesis bootstrap = verified PRE Treasury >= 4000 USDM
Maximum normal payout = 500 × P
WorstCaseExposure(P,N) = 500 × P × N
RawSurplus = max(0, EEV − ProtectedCapital)
```

These are application-level frozen semantics.

## 2. Accounting and protected liquidity

Accounting is liability-first. Protected obligations precede discretionary surplus.

For an accounting asset A:

```text
EffectivePool(A) =
    TotalLiquidity(A)
  - PendingWinningLiabilities(A)
  - UnresolvedTicketReserve(A)
  - LockedJackpotLiquidity(A)
```

The corresponding safety invariant is:

```text
PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity
```

Jackpot liquidity is deducted exactly once.

The Genesis PRE bootstrap position is not automatically PrizePool liquidity.

## 3. Normal prize economics

PRE-RICH retains five winning tiers:

| Tier | Base multiplier | Effective payout |
|---:|---:|---:|
| 1 | 2 | 1 × P |
| 2 | 5 | 2.5 × P |
| 3 | 10 | 5 × P |
| 4 | 200 | 100 × P |
| 5 | 1000 | 500 × P |

Therefore:

```text
MaximumNormalPayout(P) = 500 × P
```

A winning payout is determined at reveal and becomes immutable at crystallization.

## 4. Unresolved-ticket reserve

Every unrevealed ticket consumes economic capacity. The reference statistical model is:

```text
UnresolvedReserve(N) = N × μ + Z × σ × sqrt(N)
```

Genesis reference values remain:

```text
μ ≈ 0.65 USDM
σ ≈ 6.676 USDM
Z ≈ 3.09
```

Reference Genesis distribution:

```text
Loss        75%
1 USDM      17%
2.5 USDM     6%
5 USDM       1.8%
100 USDM     0.19%
500 USDM     0.01%
```

This is a statistical risk model, not a deterministic guarantee and does not replace deterministic worst-case protection.

## 5. Classes and exposure

Saleability is derived from verified post-sale economic state; an administrator does not manually enable an economically unsafe class.

```text
CurrentActiveClass
HighestClassEverActivated
```

`CurrentActiveClass` may contract. `HighestClassEverActivated` is monotonic.

Concrete contraction:

```text
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT
```

Suspension affects new sales only. Existing tickets and crystallized liabilities remain valid.

For class price `P` and unresolved count `N`:

```text
WorstCaseExposure(P,N) = 500 × P × N
```

Class-aware exposure or an equivalent deterministic mechanism is required; aggregate unresolved count alone is insufficient when ticket prices differ.

## 6. Hysteresis

The application hysteresis semantics are CLOSED:

```text
KA = 8
KC = 4
KD = 4
```

Remaining implementation, simulation or conformance work does not reopen these parameters.

## 7. Jackpot

The Jackpot is economically separate from the five normal symbols and must not alter their probability distribution. It is separate, protected and locked.

Reference maturity model:

```text
M = 500 × HighestClassEverActivated
J1 = 10 × M
J2 = 20 × M
J3 = 50 × M
J4 = 100 × M
J5 = 250 × M
```

Funding:

```text
NewJackpot <= RawSurplus
```

Activation requires the target locked liquidity and a solvent resulting state.

Payout safety:

```text
JackpotPayout <= LockedJackpotLiquidity
```

The choice between threshold payout and full current locked-balance payout is OPEN-01.

Jackpot assignment is cryptographically verifiable and non-discretionary. After payout, the paid amount becomes a normal pending liability and the Jackpot bucket is reduced exactly once. `HighestClassEverActivated` remains monotonic.

There is no fixed canonical Jackpot allocation rate. A future allocation rule is OPEN-03 only if an explicit allocation rule is actually required.

## 8. Treasury and historical allocation

Player payments enter protocol-controlled Treasury; no personal founder/team/operator entitlement exists.

The former:

```text
75 / 10 / 10 / 5
```

allocation is **HISTORICAL / NON-CANONICAL** and is not a current economic rule.

## 9. Settlement and value preservation

Prize values are frozen in USDM. Settlement in USDM, ADA or another supported asset is permitted only when verified conversion preserves the frozen USDM economic value.

The validation profile must address, where applicable:

- asset identity;
- price validity;
- freshness;
- decimal handling;
- deterministic rounding;
- minimum-UTxO treatment;
- rejection of stale or malformed data.

A crystallized prize cannot be reduced by changing settlement asset.

## 10. Reveal, crystallization and claim

```text
Reveal
  ↓
Verify randomness/evidence
  ↓
Derive result
  ↓
Determine tier / Jackpot result
  ↓
Check economic capacity
  ↓
Freeze payout where winning
```

A crystallized payout is immutable. Treasury movements, PRE valuation, class suspension, governance changes and later pool changes cannot recompute it.

Claims are single-use economic transitions.

```text
CLAIM ≠ BURN
```

Claiming does not require NFT destruction.

## 11. Expiry

Expiry is final:

- no claim after expiry;
- no new liability after expiry;
- unresolved reserve is released exactly once where applicable;
- an expired unclaimed winning right is released exactly once;
- a late historical reveal may preserve historical information;
- a late reveal cannot create claimability or revive the dissolved right;
- the expired payment commitment dissolves.

Only the exact ticket lifetime is OPEN-02.

## 12. Transferability and ticket identity

Tickets are transferable. Transfer does not alter ticket identity, commitment, round, game configuration or future result. The economic right follows the ticket and transfer cannot duplicate the claim.

A revealed but unclaimed winning ticket may remain transferable where permitted; its crystallized payout remains attached to the ticket.

## 13. Retention and voluntary burn

A claimed ticket may remain as a historical collectible. Burning is voluntary and provides no refund, bonus or additional economic right.

## 14. Sale atomicity

The intended economic sale transition is:

```text
Ticket mint
    +
Treasury payment
    +
PrizePool unresolved-ticket reservation
```

These economically coupled effects must be atomic or realized through an equivalent mechanism that preserves the same invariant. Off-chain bookkeeping cannot substitute for the required economic enforcement.

## 15. Treasury → PrizePool funding

Treasury funding of PrizePool is protocol-controlled and must preserve:

- crystallized liabilities;
- unresolved reserve;
- deterministic exposure;
- locked Jackpot;
- safety capital;
- all other mandatory economic invariants.

## 16. Operations and governance boundary

Operational observation/recovery is a liveness function. It cannot alter outcomes, economic rights, randomness, payouts or protocol truth.

Governance may operate only within the application authority permitted by IMMORTAL and cannot assign individual winners, Jackpot recipients, alter crystallized payouts, bypass solvency for a chosen transaction or create privileged personal Treasury entitlement.

## 17. Open set — exactly three

1. **OPEN-01 — Jackpot payout mode:** threshold payout vs full current locked-balance payout.
2. **OPEN-02 — Exact ticket expiry duration.**
3. **OPEN-03 — Future Jackpot allocation policy, only if an explicit allocation rule is actually required.**

No other application economic policy is OPEN.
