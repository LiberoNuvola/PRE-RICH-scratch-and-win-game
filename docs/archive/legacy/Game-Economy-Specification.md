# PRE-RICH — GAME ECONOMY SPECIFICATION

Version: B1
Status: Normative implementation specification
Protocol: PRE-RICH Scratch & Win
Companion: docs/Game-Economy.md

Game-Economy.md is authoritative for economic policy. This document defines implementation-facing state and transition requirements and must not introduce conflicting economic rules.

This specification is a target/conformance specification. It is not evidence that every requirement is implemented in the current B1 codebase. Implementation truth is tracked by the Constitution Gap Matrix, validator/off-chain code and tests.

## 1. Canonical Economic Values

The implementation must use:

- KA = 8
- KC = 4
- KD = 4
- Genesis ticket price = 1 USDM
- Ticket classes = 1, 2, 3, 5, 10, 25, 50, 100 USDM
- Maximum normal win = 500 × ticket price
- Genesis activation = verified Treasury PRE value >= 4,000 USDM

There is no canonical fixed 2-USDM ticket price and no constitutional 2-USDM prize floor.

USDM is the canonical accounting unit. ADA or another approved asset may be used for payment or settlement through verified conversion.

## 2. Ticket Price Validation

A ticket purchase must establish:

- the selected class is currently active;
- the declared USDM price exactly matches the class;
- supplied payment is sufficient under the verified oracle configuration;
- the unresolved economic reserve/exposure is recorded atomically;
- the resulting state satisfies all PrizePool solvency invariants.

The frontend quote is informational only.

No floating-point arithmetic is permitted in economic validation.

## 3. Prize Rules

The normal five tiers are:

| Tier | Base multiplier | Effective payout |
|---|---:|---:|
| 1 | 2 | 1 × P |
| 2 | 5 | 2.5 × P |
| 3 | 10 | 5 × P |
| 4 | 200 | 100 × P |
| 5 | 1000 | 500 × P |

Therefore:

`MaximumNormalPayout(P) = 500 × P`

Payout values must be represented with integer arithmetic in the canonical economic unit/subunits.

## 4. PrizePool State

The B1 PrizePool must account for at least:

- TotalLiquidity
- PendingWinningLiabilities
- UnresolvedTicketReserve
- class-aware unresolved exposure or an equivalent deterministic state
- LockedJackpotLiquidity
- Jackpot level/threshold state
- active/suspended class state
- configuration/prize binding

The singleton PrizePool authority identifies the unique pool state.

## 5. Effective Pool Invariant

The implementation must preserve:

```text
EffectivePool =
    TotalLiquidity
  - PendingWinningLiabilities
  - UnresolvedTicketReserve
  - LockedJackpotLiquidity
```

and:

```text
PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity
```

Jackpot liquidity must not be deducted twice.

## 6. Unresolved Tickets

Issuance must increase unresolved exposure atomically with ticket creation.

Reveal must:

- release the ticket's unresolved reserve;
- derive the result;
- create a crystallised liability for a winning result.

Expiry must release unresolved exposure exactly once.

Because ticket prices differ, aggregate unresolved count alone is insufficient. The implementation must use class-aware exposure or an equivalent deterministic mechanism.

## 7. Statistical Reserve

Reference model:

```text
R(N) = N × μ + Z × σ × sqrt(N)
```

Genesis reference parameters:

- μ ≈ 0.65 USDM
- σ ≈ 6.676 USDM
- Z ≈ 3.09

This statistical reserve does not replace deterministic worst-case protection.

## 8. Deterministic Exposure Budget

For price P and unresolved count N:

`WorstCaseExposure = 500 × P × N`

A sale must be rejected if the post-sale state violates:

- approved deterministic exposure budget;
- statistical reserve requirement;
- safety floor;
- liability protection;
- locked Jackpot protection;
- any other mandatory solvency condition.

The check must be enforced by protocol state transition, not only by frontend or relayer logic.

## 9. Automatic Class Activation and Suspension

Activation is state-derived and non-discretionary.

Automatic contraction is:

`100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT`

Suspension affects only new sales. Existing tickets and crystallised liabilities remain valid.

The implementation must distinguish:

- `CurrentActiveClass`
- `HighestClassEverActivated`

`HighestClassEverActivated` is monotonic and is used for Jackpot maturity.

### Hysteresis

Activation and suspension use separate thresholds to prevent oscillation.

**SEMANTICS: CLOSED.**

The canonical kernel parameters are:

- KA = 8
- KC = 4
- KD = 4

Any remaining numerical validation, simulation, test verification or implementation conformance is an **IMPLEMENTATION / QUANTITATIVE VALIDATION** matter and does not reopen the semantic decision.

## 10. Treasury Distribution

The former:

`75% PrizePool / 10% Reserve / 10% Stake / 5% Maintenance`

split is historical/non-canonical.

It is not an implementation default, constitutional obligation, or current economic constant.

Implementation must instead preserve liability/protection-first ordering and allocate only genuine residual surplus according to explicitly governed policy.

## 11. Jackpot Ladder

Let:

`M = 500 × HighestClassEverActivated`

Reference targets:

- J1 = 10 × M
- J2 = 20 × M
- J3 = 50 × M
- J4 = 100 × M
- J5 = 250 × M

Genesis reference targets:

5,000 / 10,000 / 25,000 / 50,000 / 125,000 USDM

Class-100 reference targets:

500,000 / 1,000,000 / 2,500,000 / 5,000,000 / 12,500,000 USDM

The Jackpot ladder must not alter normal five-symbol probabilities.

## 12. Jackpot Funding

Jackpot liquidity may be funded only from genuine residual surplus after mandatory obligations and protected capital.

`RawSurplus = max(0, EEV − ProtectedCapital)`

A funding transition must satisfy:

`NewJackpot <= RawSurplus`

There is no frozen fixed `JackpotAllocationRate`.

No allocation percentage is canonical unless a separate normative policy decision explicitly adopts one.

Any Jackpot funding transition must preserve:

`JackpotPayout <= LockedJackpotLiquidity`

and the Effective Pool invariant.

## 13. Jackpot Activation and Payout

Activation requires:

`LockedJackpotLiquidity >= Target(level)`

and a valid post-transition economic state.

Selection must use cryptographically verifiable randomness.

At payout:

- derive the winning condition;
- freeze the actual payout;
- remove the paid amount from locked Jackpot accounting exactly once;
- create the corresponding pending liability;
- settle/claim under normal single-claim rules;
- rebuild the Jackpot only from future genuine surplus.

The policy choice between threshold payout and full current locked-balance payout is explicitly **OPEN**. The validator must not silently encode one as if it were already frozen.

## 14. Multi-Asset Payment and Settlement

USDM remains the reference economic value.

For non-USDM payment or settlement, the implementation must validate:

- asset identity;
- price validity;
- freshness;
- decimal precision;
- deterministic rounding;
- minimum-UTxO constraints;
- stale/malformed oracle rejection.

A frozen USDM prize must retain the same economic value when settled in another approved asset.

The implementation must never assume that a USDM integer can simply be copied into lovelace.

## 15. Reveal and Crystallisation

Reveal must:

- validate commitment;
- validate the applicable randomness/beacon state;
- derive the game result;
- derive normal tier or Jackpot result;
- read current economic state;
- verify economic capacity;
- release unresolved exposure;
- create/update pending liability;
- bind the ticket to the immutable result and payout.

A crystallised payout must never be recalculated during claim.

## 16. Claim

A valid claim requires current ownership and the required authorization/signature.

Claim must:

- pay the frozen economic value;
- reduce pending liabilities exactly once;
- prevent a second claim;
- preserve the NFT unless the owner voluntarily burns it.

`CLAIM ≠ BURN`

## 17. Expiry

The expiry semantic contract is final.

After `expiresAt`:

- the economic right is extinguished;
- no claim may be created;
- no new liability may be created;
- unresolved reserve is released exactly once;
- an expired winning economic right is dissolved exactly once;
- an expired payment commitment dissolves;
- historical late reveal may be recorded where permitted;
- late reveal cannot recreate claimability or economic liability;
- late reveal cannot resurrect the expired economic right.

The exact ticket lifetime is **OPEN** and must not be invented or encoded as a final constant.

## 18. Secondary Market

Transfer must preserve ticket identity, commitment, round and game configuration.

The economic right follows the ticket.

A revealed but unclaimed winning ticket may be transferable where the protocol permits it; the frozen payout remains attached to the ticket.

Transfer must never duplicate the economic claim.

## 19. NFT Retention

Claiming does not require burning.

A claimed ticket may remain a historical collectible.

Burning is voluntary and gives no refund, bonus or additional economic right.

`CLAIM ≠ BURN`

## 20. Atomic Sale Requirement

The B1 sale transition must economically bind:

```text
ticket mint
+
Treasury payment
+
PrizePool unresolved-ticket reservation
```

A ticket must not be considered economically issued when payment or required reservation is absent.

Off-chain bookkeeping cannot replace on-chain enforcement.

## 21. Treasury → PrizePool

Treasury funding must target the configured PrizePool script and preserve all mandatory accounting constraints.

No personal operator wallet may be used as a required economic intermediate.

## 22. Operational OPEX and Beacon Observation

Maintenance is an accounting category, not an automatic operator entitlement.

Operational modes:

- SLEEP = no relevant protocol event pending
- ACTIVE = protocol-relevant event requires observation/construction
- QUIESCENT = event completed, waiting for next trigger

Recovery may restore liveness or resubmit objectively valid evidence but cannot change:

- ticket outcomes;
- economic rights;
- Beacon selection;
- payout values;
- protocol truth.

B1 may use an authorized Beacon publisher/relayer. B3 proof-path behavior is not to be assumed implemented.

## 23. Governance Boundary

Governance may modify bounded parameters where constitutionally allowed.

Governance may not:

- assign winners;
- assign Jackpot recipients;
- alter crystallised payouts;
- bypass solvency for a specific transaction;
- create privileged personal Treasury claims.

## 24. Conformance Requirements

A requirement is not considered implemented merely because this document describes it.

Conformance requires agreement among:

- Constitution;
- docs/Game-Economy.md;
- this specification;
- Plutus validator enforcement;
- off-chain transaction construction;
- UI/quote behavior where relevant;
- positive tests;
- negative/adversarial tests;
- generated artifacts;
- no contradictory legacy rule.

Simulation or reference-model output is not on-chain proof.

The project distinguishes:

- **SEMANTIC STATUS**
- **IMPLEMENTATION STATUS**
- **EVIDENCE STATUS**

These categories must never be collapsed.

## 25. Implementation Order

Recommended order:

1. preserve the frozen normative baseline and resolve only the explicitly open policy set;
2. implement class-aware deterministic exposure;
3. implement state-derived class activation/suspension;
4. implement HighestClassEverActivated;
5. implement Jackpot accounting and payout transition;
6. implement dynamic USDM/ADA payment and settlement;
7. implement reveal/claim/expiry conformance;
8. test Treasury, PrizePool and liability accounting;
9. run adversarial and integration suites;
10. update predeploy/release gates;
11. update documentation only when implementation truth changes.

No implementation change is complete while this specification and Game-Economy.md disagree.

## Final Status

**SEMANTICS: CLOSED**

The economic baseline is frozen, including KA=8, KC=4, KD=4, the class ladder, Genesis, bootstrap threshold, payout cap, liability-first accounting, ProtectedCapital/RawSurplus boundary, class contraction, Jackpot safety and expiry finality.

**IMPLEMENTATION: CONFORMANCE OPEN**

Known implementation gaps remain and are not semantic reopenings.

**EVIDENCE: PARTIAL**

Evidence must continue to be established through validator, off-chain, adversarial, integration and reproducible release evidence.

### Open Policy Set — ONLY

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy, but only if an explicit allocation rule is actually required.
