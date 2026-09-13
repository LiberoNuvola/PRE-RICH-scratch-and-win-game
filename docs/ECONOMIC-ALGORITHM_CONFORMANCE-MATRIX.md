# PRE-RICH — Economic Algorithm Conformance Matrix

**Version:** 0.1.1 — Working Conformance Baseline
**Document set:** White Paper v0.6.1 · Economic Algorithm v0.3.1
**Repository commit:** `_replace_with_SHA_after_merge_`
**Date:** September 2026  
**Purpose:** Trace the Economic Algorithm to normative sources and current implementation evidence.

> This matrix is a conformance aid. It does not upgrade an implementation gap to “implemented”, and it does not create new economic policy.

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
| Payout distribution / EV model | Game Economy; Specification; Algorithm (result determination) | On-chain or otherwise enforced outcome distribution must match the normative game-economy targets | **GAP / OPEN** — legacy GameRules tables must not be treated as proof of normative EV conformance |
| Canonical unit / price | Constitution; Game Economy; Specification | USDM accounting; exact canonical ladder | **GAP / CONFORMANCE OPEN** where implementation accepts non-canonical prices |
| Sale preconditions | Game Economy; Specification; Algorithm | Active class, exact price, verified payment, post-sale safety | **GAP / OPEN** |
| Sale atomicity | Constitution; Specification | Mint + payment + unresolved reservation bound atomically | **PARTIAL / CLOSING** |
| Unresolved reserve | Constitution; Game Economy; Specification | Reserve/exposure represented and released exactly once | **PARTIAL / CLOSING** |
| Deterministic exposure | Constitution; Specification | `WorstCaseExposure(P,N)=500×P×N` enforced post-sale | **GAP / OPEN** |
| EffectivePool | Constitution; Specification; Algorithm | `EffectivePool ≥ 0` with liabilities/reserves/locked Jackpot excluded from available liquidity | **STRUCTURE IMPLEMENTED (B1) / RELEASE EVIDENCE REQUIRED** — accounting structure is present; release still requires invariant tests and validator-level evidence on the release commit. |
| Active class | Constitution; Game Economy; Specification | State-derived `CurrentActiveClass` | **GAP / OPEN** |
| Hysteresis | Constitution; Game Economy; Specification | Deterministic activation/suspension thresholds | **GAP / OPEN** |
| Highest class | Constitution; Specification | Monotonic `HighestClassEverActivated` | **GAP / OPEN** |
| Commit | Constitution; Architecture; Algorithm | Context-bound commitment | **SUBSTANTIALLY IMPLEMENTED / final validation** |
| Reveal | Constitution; Architecture; Algorithm | Verify beacon, derive result, check capacity, crystallise | **PARTIAL / CLOSING** |
| Crystallisation | Constitution; Game Economy; Algorithm | Frozen payout cannot be recalculated | **PARTIAL / CLOSING** |
| Claim | Constitution; Specification; Algorithm | Current owner, frozen payout, once-only liability transition | **PARTIAL / CLOSING** |
| Expiry | Constitution; Game Economy; Specification | No post-expiry claim or new liability; late reveal economically inert | **PARTIAL / GAP** |
| Multi-asset settlement | Constitution; Specification | Verified conversion and exact economic value preservation | **PARTIAL / GAP** |
| Jackpot funding | Constitution; Game Economy; Specification | Only genuine residual surplus; no silent fixed rate | **GAP / OPEN** |
| Jackpot payout | Constitution; Specification | Frozen payout ≤ locked Jackpot liquidity | **GAP / OPEN** |
| Treasury | Constitution; Game Economy; Specification | Liability/protection-first; no personal entitlement | **PARTIAL / CLOSING** |
| Failure semantics | Constitution; Algorithm | Invalid transitions fail closed | **PARTIAL / evidence required** |
| B1 Beacon | Constitution; Beacon Trust Model | Authorized publisher boundary explicit | **DONE / B1 model** |
| B3 Beacon | Constitution; Beacon Trust Model | Publisher-independent canonical proof | **TARGET** |
| Proof obligations | Constitution; Specification; Algorithm | Unit + adversarial + validator + integration + reproducibility evidence | **OPEN** |

| Payout distribution / EV model | Game Economy; Specification; Algorithm (result determination) | On-chain or otherwise enforced outcome distribution must match the normative game-economy targets | **GAP / OPEN** — legacy GameRules tables must not be treated as proof of normative EV conformance. |

## Critical release blockers

The following should remain visible as release blockers until evidence changes their status:

1. Canonical price enforcement.
2. State-derived active class and contraction.
3. Deterministic class-aware exposure.
4. Correct claim settlement units and multi-asset conversion.
5. Expiry finality / late-reveal non-liability.
6. Jackpot lifecycle and exact payout/funding semantics.
7. Real validator-level and adversarial evidence.
8. Treasury value-conservation and remainder handling.
9. Removal or isolation of stale legacy economic paths.
10. Reproducible release gate.
11. Normative payout distribution vs implementation.

## Conformance Rule

A row may move to **DONE** only when the required normative rule, implementation, and evidence agree on the **same repository commit recorded in the header**.

```text
DOCUMENTED ≠ IMPLEMENTED
IMPLEMENTED ≠ VERIFIED
REFERENCE MODEL ≠ ON-CHAIN PROOF
```

