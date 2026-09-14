# PRE-RICH Economic Algorithm

**Version:** 0.3.1 — Release Candidate
**Status:** Final algorithmic execution baseline — implementation conformance OPEN
**Protocol:** PRE-RICH Scratch & Win
**Aligned document set:** White Paper v0.6.1 · Conformance Matrix v0.1.1
**Authority:** Constitution → Game Economy → Game Economy Specification → this Algorithm → implementation/tests

> This document defines the ordered execution logic of the PRE-RICH economic model. It does not introduce economic policy absent from the Constitution or normative economic specifications.

## 1. Purpose

The Economic Algorithm converts the normative economic model into an explicit, deterministic sequence of state evaluation and transitions.

It defines:

- authoritative inputs;
- validations;
- deterministic calculations;
- ordering of checks;
- creation/release/crystallisation of economic exposure;
- failure conditions;
- immutable values after crystallisation.

## 2. Canonical Inputs

The algorithm operates on verified protocol inputs including:

- protocol/game version;
- canonical economic unit (USDM);
- ticket class and price;
- ticket identity;
- current PrizePool state;
- Treasury state where relevant;
- unresolved exposure;
- pending winning liabilities;
- locked Jackpot liquidity;
- safety parameters;
- validated oracle data where another asset is used;
- commitment;
- validated Beacon according to the active trust model;
- player secret at reveal;
- validity interval / expiry state.

## 3. Economic State Vector

At minimum:

```text
TotalLiquidity
PendingWinningLiabilities
UnresolvedTicketReserve
ClassAwareUnresolvedExposure
LockedJackpotLiquidity
CurrentActiveClass
HighestClassEverActivated
SafetyParameters
JackpotState
```

`ProtectedCapital` is the canonical protected-capital boundary. Where the implementation represents its components separately, the aggregate must preserve the normative boundary rather than inventing a different economic definition.

## 4. Canonical Unit and Price

USDM is the canonical economic unit.

Valid ticket prices are:

```text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
```

Genesis is 1 USDM.

No floating-point arithmetic is permitted in economic validation.

## 5. Sale Algorithm

```text
validate ticket class
→ validate exact USDM price
→ validate payment / conversion
→ read current economic state
→ compute post-sale unresolved exposure
→ compute post-sale protected obligations
→ evaluate deterministic exposure budget
→ evaluate statistical reserve requirement
→ evaluate safety floor
→ evaluate locked Jackpot protection
→ evaluate CurrentActiveClass
→ mint ticket
→ record payment
→ reserve unresolved exposure
```

Ticket issuance, payment and unresolved reservation must be economically atomic.

If any mandatory condition fails, the economic transition fails as a whole.

### Universal Transition Contract

```text
PRECONDITION
    ↓
VALIDATE AUTHORITATIVE INPUTS
    ↓
COMPUTE DETERMINISTIC DELTA
    ↓
CHECK POST-STATE INVARIANTS
    ↓
COMMIT ATOMICALLY
    ↓
POSTCONDITION
```

No partial economic transition is an accepted protocol state.

## 6. Solvency

```text
EffectivePool =
    TotalLiquidity
  - PendingWinningLiabilities
  - UnresolvedTicketReserve
  - LockedJackpotLiquidity
```

```text
PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity
```

For class price P and unresolved count N:

```text
WorstCaseExposure(P, N) = 500 × P × N
```

The implementation must use class-aware exposure or an equivalent deterministic mechanism.

The canonical protected-capital boundary is:

```text
RawSurplus = max(0, EEV − ProtectedCapital)
```

## 7. Statistical Reserve

Reference model:

```text
UnresolvedReserve(N) = N × μ + Z × σ × √N
```

This is a risk/capital model and does not replace deterministic worst-case protection.

```text
Statistical Reserve
    = risk model

Deterministic Exposure
    = worst-case protocol protection

Effective Pool
    = economically available liquidity after protected obligations
```

## 8. Active Class

```text
CurrentActiveClass =
    highest class whose verified post-sale state remains safe
```

Ladder:

```text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100
```

Contraction:

```text
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT
```

`HighestClassEverActivated` is monotonic and distinct from `CurrentActiveClass`.

### Hysteresis

**SEMANTICS: CLOSED.**

Canonical kernel parameters:

```text
KA = 8
KC = 4
KD = 4
```

Activation and suspension use separate thresholds to prevent oscillation.

Any remaining simulation, quantitative validation, test verification or implementation conformance is **IMPLEMENTATION / QUANTITATIVE VALIDATION**. It does not reopen the semantic decision.

## 9. Commit

Commit establishes the ticket-bound commitment before the result can be known.

The commitment must bind the required game/ticket context and secret according to the cryptographic specification.

## 10. Reveal

```text
validate expiry boundary
→ validate commitment
→ validate Beacon
→ derive deterministic seed
→ derive symbols / Jackpot result
→ determine payout
→ verify economic capacity
→ release unresolved exposure
→ create crystallised liability if winning
→ freeze result and payout
```

After expiry, a late reveal must be economically inert with respect to new claimability and liability.

## 11. Crystallisation

Once crystallised, the payout is immutable.

Later changes to liquidity, Treasury, PRE valuation, active class, Jackpot state or governance parameters must not recalculate it.

## 12. Claim

Claim validates an already-established right.

It must:

- verify current ownership where required;
- verify ticket identity and revealed state;
- use the frozen payout;
- settle the exact economic value;
- reduce the corresponding pending liability exactly once;
- prevent a second claim;
- not require NFT burning.

`CLAIM ≠ BURN`.

## 13. Expiry

Expiry is a one-way economic boundary.

After `expiresAt`:

```text
newClaimability = false
newLiability = false
lateRevealEconomicEffect = none
```

The expired economic right is extinguished. The payment commitment associated with that expired right dissolves. No later reveal may create a claim, create a liability, or resurrect the expired right.

The unresolved reserve is released exactly once where applicable.

The exact ticket lifetime is **OPEN** and is not invented here.

## 14. Multi-Asset Settlement

```text
verified asset identity
→ valid/fresh oracle
→ deterministic conversion
→ conservative rounding
→ exact USDM-equivalent settlement
```

A USDM obligation must never be interpreted as an identical integer quantity of lovelace or another asset.

## 15. Jackpot

Reference maturity:

```text
M = 500 × HighestClassEverActivated
```

Reference ladder:

```text
J1 = 10 × M
J2 = 20 × M
J3 = 50 × M
J4 = 100 × M
J5 = 250 × M
```

Jackpot is separate locked/protected liquidity.

Funding:

```text
RawSurplus = max(0, EEV − ProtectedCapital)
NewJackpot <= RawSurplus
```

Payout:

```text
JackpotPayout <= LockedJackpotLiquidity
```

No fixed JackpotAllocationRate is canonical by default.

The threshold-vs-full-current-locked-balance payout mode is **OPEN**.

## 16. Treasury

Treasury accounting is liability/protection-first.

Historical fixed splits, including 75/10/10/5, are non-canonical.

No team, founder, developer or administrator receives an automatic personal economic entitlement.

## 17. Failure Semantics

Invalid transitions fail closed.

Examples:

- invalid class;
- non-canonical price;
- insufficient verified payment;
- unsafe post-sale state;
- excessive exposure;
- stale/invalid oracle;
- invalid commitment;
- invalid Beacon;
- expired claim;
- double claim;
- malformed Jackpot transition;
- late reveal attempting to create liability;
- payout above locked Jackpot liquidity.

## 18. Conservation and Invariants

The implementation must preserve, as applicable:

- no privileged beneficiary;
- protocol-controlled custody;
- liability-first accounting;
- deterministic payout;
- payout crystallisation;
- automatic class control;
- worst-case safety;
- Jackpot separation;
- Jackpot non-discretion;
- ticket transferability;
- single claim;
- no forced burn;
- expiry finality;
- multi-asset value preservation;
- governance limitation;
- activity-proportional operations.

## 19. Proof Obligations

The algorithm is not itself proof.

Required evidence may include:

- reference-model validation;
- unit/property tests;
- adversarial tests;
- Plutus validator enforcement;
- off-chain builder parity;
- generated-artifact parity;
- integration tests;
- reproducible release evidence.

A passing TypeScript mirror is evidence of model behaviour, not proof of Plutus enforcement.

## 20. Conformance Status

The Algorithm is the formal execution baseline, not a declaration that the current implementation already conforms.

Current conformance work is tracked by:

- [Economic Algorithm Conformance Matrix](docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md)
- [Constitution Gap Matrix](docs/CONSTITUTION-GAP-MATRIX.md)

### Status model

```text
SEMANTIC STATUS ≠ IMPLEMENTATION STATUS
IMPLEMENTATION STATUS ≠ EVIDENCE STATUS
DOCUMENTED ≠ IMPLEMENTED
IMPLEMENTED ≠ VERIFIED
REFERENCE MODEL ≠ ON-CHAIN PROOF
```

Current implementation gaps remain implementation/evidence work and must not be used to reopen frozen economic semantics.

## 20.1. What the Algorithm Does Not Decide

It does not independently invent:

- new economic policy;
- ticket prices outside the canonical ladder;
- a fixed Jackpot allocation rate;
- a Jackpot payout mode while that choice remains open;
- an exact expiry duration;
- a new economic definition of ProtectedCapital;
- discretionary winners or Jackpot recipients;
- B3 canonicality before B3 verification exists.

Hysteresis semantics are **CLOSED**; any remaining numerical validation is implementation/quantitative validation.

If a required policy value is genuinely missing, the algorithm stops at the policy boundary rather than inventing a value.

## 21. Authority

If this algorithm conflicts with a higher-level normative document, the higher-level document prevails:

```text
CONSTITUTION
    ↓
GAME ECONOMY
    ↓
GAME ECONOMY SPECIFICATION
    ↓
ECONOMIC ALGORITHM
    ↓
IMPLEMENTATION
    ↓
TESTS / PROOFS
```

### Open Policy Set — ONLY

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy, but only if an explicit allocation rule is actually required.
