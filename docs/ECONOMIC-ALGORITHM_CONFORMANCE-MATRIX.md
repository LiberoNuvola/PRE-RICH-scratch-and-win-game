# PRE-RICH — Economic Algorithm Conformance Matrix

**Version:** 0.1.2 — Documentation Crystallization Baseline
**Document set:** White Paper v0.6.1 · Economic Algorithm v0.3.1
**Repository commit:** `_replace_with_SHA_after_merge_`
**Date:** September 2026  
**Purpose:** Trace the Economic Algorithm to normative sources and current implementation evidence.

> This matrix is a conformance aid. It does not upgrade an implementation gap to “implemented”, and it does not create new economic policy.

## Status model

The repository MUST distinguish:

```text
SEMANTIC STATUS
    = what the protocol has normatively decided

IMPLEMENTATION STATUS
    = what the current implementation actually enforces

EVIDENCE STATUS
    = what has been demonstrated by tests, proofs, validator evidence,
      reproducible artifacts, or other accepted evidence
```

Therefore:

```text
SEMANTIC STATUS ≠ IMPLEMENTATION STATUS
IMPLEMENTATION STATUS ≠ EVIDENCE STATUS
DOCUMENTED ≠ IMPLEMENTED
IMPLEMENTED ≠ VERIFIED
REFERENCE MODEL ≠ ON-CHAIN PROOF
```

An implementation gap does not reopen a frozen normative decision.

## Authority

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
TESTS / PROOFS / EVIDENCE
```

## Core transition matrix

| Algorithm area | Normative source | Required implementation property | Current evidence/status |
|---|---|---|---|
| Payout distribution / EV model | Game Economy; Specification; Algorithm (result determination) | Enforced outcome distribution must match normative game-economy targets | **GAP / EVIDENCE OPEN** — legacy GameRules tables are not proof of normative EV conformance |
| Canonical unit / price | Constitution; Game Economy; Specification | USDM accounting; exact canonical ladder | **GAP / CONFORMANCE OPEN** where implementation accepts non-canonical prices |
| Sale preconditions | Game Economy; Specification; Algorithm | Active class, exact price, verified payment, post-sale safety | **GAP / CONFORMANCE OPEN** |
| Sale atomicity | Constitution; Specification | Mint + payment + unresolved reservation bound atomically | **PARTIAL / CONFORMANCE CLOSING** |
| Unresolved reserve | Constitution; Game Economy; Specification | Reserve/exposure represented and released exactly once | **PARTIAL / CONFORMANCE CLOSING** |
| Deterministic exposure | Constitution; Specification | `WorstCaseExposure(P,N)=500×P×N` enforced post-sale | **GAP / CONFORMANCE OPEN** |
| EffectivePool | Constitution; Specification; Algorithm | `EffectivePool ≥ 0` with liabilities/reserves/locked Jackpot excluded from available liquidity | **STRUCTURE IMPLEMENTED (B1) / RELEASE EVIDENCE REQUIRED** |
| Active class | Constitution; Game Economy; Specification | State-derived `CurrentActiveClass` | **GAP / CONFORMANCE OPEN** |
| Hysteresis | Constitution; Game Economy; Specification | Deterministic activation/suspension hysteresis | **SEMANTICS CLOSED / IMPLEMENTATION + QUANTITATIVE VALIDATION OPEN** — existence and monotonic safety principle are normative; exact numerical validation remains outstanding |
| Highest class | Constitution; Specification | Monotonic `HighestClassEverActivated` | **SEMANTICS CLOSED / IMPLEMENTATION GAP** |
| Commit | Constitution; Architecture; Algorithm | Context-bound commitment | **SUBSTANTIALLY IMPLEMENTED / FINAL VALIDATION** |
| Reveal | Constitution; Architecture; Algorithm | Verify beacon, derive result, check capacity, crystallise | **PARTIAL / CONFORMANCE CLOSING** |
| Crystallisation | Constitution; Game Economy; Algorithm | Frozen payout cannot be recalculated | **PARTIAL / CONFORMANCE CLOSING** |
| Claim | Constitution; Specification; Algorithm | Current owner, frozen payout, once-only liability transition | **PARTIAL / CONFORMANCE CLOSING** |
| Expiry | Constitution; Game Economy; Specification | No post-expiry claim or new liability; late reveal economically inert | **SEMANTICS CLOSED / IMPLEMENTATION GAP** — exact ticket lifetime remains OPEN policy |
| Multi-asset settlement | Constitution; Specification | Verified conversion and exact economic value preservation | **PARTIAL / CONFORMANCE GAP** |
| Jackpot funding | Constitution; Game Economy; Specification | Only genuine residual surplus; no mandatory fixed rate | **SEMANTICS CLOSED / IMPLEMENTATION GAP** — allocation rate is not canonical |
| Jackpot payout | Constitution; Specification | Frozen payout ≤ locked Jackpot liquidity | **SAFETY SEMANTICS CLOSED / PAYOUT MODE OPEN / IMPLEMENTATION GAP** |
| Treasury | Constitution; Game Economy; Specification | Liability/protection-first; no personal entitlement | **PARTIAL / CONFORMANCE CLOSING** |
| Failure semantics | Constitution; Algorithm | Invalid transitions fail closed | **PARTIAL / EVIDENCE REQUIRED** |
| B1 Beacon | Constitution; Beacon Trust Model | Authorized publisher boundary explicit | **DONE / B1 MODEL** |
| B3 Beacon | Constitution; Beacon Trust Model | Publisher-independent canonical proof | **TARGET** |
| Proof obligations | Constitution; Specification; Algorithm | Unit + adversarial + validator + integration + reproducibility evidence | **OPEN** |

## Canonical open decisions

Only the following policy decisions remain genuinely open in this baseline:

1. **Jackpot payout mode:** threshold payout vs full current locked-balance payout.
2. **Exact ticket expiry duration.**
3. **Future Jackpot allocation policy only if a separate allocation rule is actually required.** No fixed JackpotAllocationRate is canonical by default.

The existence of hysteresis is **not** an open semantic decision. Its numerical implementation/conformance validation remains open.

## Hysteresis status

The protocol semantics are frozen as:

- activation and suspension use separate thresholds;
- hysteresis is deterministic;
- the mechanism prevents boundary oscillation;
- `KA = 8`, `KC = 4`, `KD = 4` are the adopted canonical kernel parameters;
- remaining work concerns quantitative validation and implementation conformance, not reopening the economic principle.

## Expiry status

Expiry is a terminal economic boundary:

```text
after expiresAt:

newClaimability = false
newLiability = false
lateRevealEconomicEffect = none
```

The unresolved reserve is released exactly once and an expired winning right is dissolved. A late reveal cannot recreate the economic right or liability.

The exact ticket lifetime remains an explicit open policy parameter.

## Jackpot status

The following are closed:

- Jackpot is economically separate;
- funding comes only from genuine residual surplus;
- protected capital and liabilities have priority;
- no mandatory fixed allocation percentage exists;
- payout cannot exceed locked Jackpot liquidity;
- selection is non-discretionary and cryptographically verifiable.

The payout-mode choice remains open.

## Critical implementation blockers

The following remain implementation/evidence blockers and must not be confused with unresolved economic policy:

1. Canonical price enforcement.
2. State-derived active class and contraction.
3. Deterministic class-aware exposure.
4. Correct claim settlement units and multi-asset conversion.
5. Expiry implementation and late-reveal non-liability.
6. Jackpot lifecycle implementation and the still-open payout mode.
7. Validator-level and adversarial evidence.
8. Treasury value conservation and remainder handling.
9. Removal/isolation of stale legacy economic paths.
10. Reproducible release gate.
11. Normative payout distribution versus implementation.

## Conformance Rule

A row may move to **DONE** only when the required normative rule, implementation, and evidence agree on the **same repository commit recorded in the header**.

The matrix is descriptive of conformance state. It does not itself alter the protocol's economic policy.
