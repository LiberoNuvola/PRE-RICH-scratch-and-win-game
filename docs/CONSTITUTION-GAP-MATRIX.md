# PRE-RICH Constitution — V3 Conformance Gap Matrix

**Protocol baseline:** Constitution V3 — Deterministic Economy
**Implementation baseline:** B1 / `b1-hardening`

> **Core rule:** a requirement is DONE only when the current normative specification, implementation, tests and reproducible evidence agree.
>
> **Critical distinction:** semantic status, implementation status and evidence status are separate. An implementation GAP does not reopen a CLOSED normative decision.

---

# 1. Status Legend

| Status | Meaning |
|---|---|
| DONE | Current rule implemented, aligned, tested and evidenced |
| PARTIAL | Meaningful current implementation exists, but conformance/evidence is incomplete |
| GAP | Required implementation behavior is missing or contradicted |
| TARGET | Deliberately future architecture |
| UNKNOWN | Dedicated audit/evidence still required |

For economic requirements, `GAP` or `PARTIAL` in this matrix describes implementation/evidence conformance. It does not mean the normative economic decision is OPEN.

---

# 2. Constitutional Invariants

| ID | Invariant | Status | Current assessment |
|---|---|---|---|
| C1 | No privileged team/dev/founder/admin economic share | PARTIAL | Architecture rejects discretionary allocation; complete Treasury/on-chain proof remains |
| C2 | Protocol-controlled Treasury | PARTIAL | Treasury exists; legacy implementation semantics remain to be migrated |
| C3 | Ticket identity unique and transferable | PARTIAL | Existing NFT architecture supports identity/transfer; current V3 evidence requires revalidation |
| C4 | Ticket not automatically burned on claim | PARTIAL | Current path does not require burn; complete proof remains |
| C5 | Pre-reveal opacity | PARTIAL | Commit/reveal exists; adversarial/cross-layer proof remains |
| C6 | Payout crystallized at reveal | PARTIAL | Relevant validator logic exists; complete V3 integration remains |
| C7 | EffectivePool accounting | PARTIAL | Relevant fields exist; complete ProtectedCapital/class-aware reconciliation remains |
| C8 | Unresolved-ticket reserve | PARTIAL | Aggregate reserve exists; class-aware exposure conformance remains |
| C9 | Deterministic worst-case exposure | GAP | Current aggregate implementation does not prove `500 × Σ ClassExposure_i` |
| C10 | Automatic CurrentActiveClass | GAP | Full state-derived selection is not implemented |
| C11 | Automatic class suspension | PARTIAL | Suspension machinery exists; full V3 derivation remains |
| C12 | Hysteresis semantic principle | GAP | **IMPLEMENTATION / QUANTITATIVE GAP ONLY:** semantic principle is CLOSED; KA=8, KC=4, KD=4 are canonical |
| C13 | HighestClassEverActivated monotonic | GAP | Required historical state is not fully represented/enforced |
| C14 | Genesis = 1 USDM | PARTIAL | Normative rule is CLOSED; activation evidence remains |
| C15 | Genesis PRE threshold >= 4,000 USDM | PARTIAL | Normative rule is CLOSED; verified activation path remains |
| C16 | USDM canonical denomination | PARTIAL | Normative model is CLOSED; implementation requires re-audit |
| C17 | Multi-asset settlement preserves USDM value | PARTIAL | Helpers exist; full path evidence remains |
| C18 | No underpayment from rounding | PARTIAL | Helper-level rounding exists; complete path evidence remains |
| C19 | Jackpot separate from normal pool | PARTIAL | Locked field exists; complete lifecycle isolation remains |
| C20 | Jackpot activated from verified state | GAP | Complete V3 trigger/state machine not implemented |
| C21 | Jackpot materially exceeds maximum normal payout | PARTIAL | Normative relationship exists; runtime enforcement remains |
| C22 | Jackpot ladder deterministic | GAP | V3 multi-level state transition is incomplete |
| C23 | Jackpot funded only after mandatory obligations | GAP | Funding transition not fully enforced |
| C24 | Jackpot payout frozen | GAP | Complete Jackpot win/claim state not implemented |
| C25 | Jackpot reset/rebuild deterministic | GAP | Complete reset lifecycle not implemented |
| C26 | Single claim | PARTIAL | Validator guards claim state; competing/legacy paths require consolidation |
| C27 | Expiry fixed at mint | PARTIAL | Expiry fields exist; lifecycle proof remains |
| C28 | Historical reveal after expiry cannot create claim | PARTIAL | Semantic rule is CLOSED; adversarial implementation proof remains |
| C29 | Failure paths fail closed | PARTIAL | Core validators reject invalid data; cross-component audit remains |
| C30 | Backend/relayer cannot determine economic outcome | PARTIAL | Architecture requires this; adversarial proof remains |
| C31 | Governance cannot override outcomes | PARTIAL | Boundary documented; implementation proof remains |
| C32 | On-chain/off-chain economic parity | PARTIAL | Mirrors/tests exist; V3 divergence risk remains |
| C33 | B1/B2/B3 honestly distinguished | DONE | Current documentation separates B1 from future B3 |
| C34 | Publisher-independent B3 canonicality | TARGET | Future B3 architecture |
| C35 | Repository-wide non-regression | PARTIAL | Documentation crystallization plus implementation migration remains |

---

# 3. V3 Economic State

| ID | Requirement | Status | Required proof |
|---|---|---|---|
| E1 | Canonical ladder 1/2/3/5/10/25/50/100 USDM | PARTIAL | Bind class identity, pricing and saleability |
| E2 | Class price is USDM economic value | GAP | Remove remaining legacy fixed-ADA assumptions |
| E3 | Class selection derived from verified state | GAP | Implement CurrentActiveClass |
| E4 | Availability evaluated on post-sale state | GAP | Candidate SALE → post-state → Economic Gate |
| E5 | Suspension does not invalidate existing tickets | PARTIAL | Explicit lifecycle tests |
| E6 | Hysteresis prevents oscillation | GAP | **Implementation/quantitative validation gap; semantic principle CLOSED; KA=8/KC=4/KD=4 canonical** |
| E7 | Crystallized liabilities protected | PARTIAL | Integrate complete ProtectedCapital |
| E8 | Unresolved exposure is class-aware | GAP | Implement `ClassExposure_i` or equivalent |
| E9 | Worst-case exposure = 500 × Σ ClassExposure_i | GAP | On-chain aggregate/per-class enforcement |
| E10 | Safety Capital protected | GAP | Explicit state/enforcement |
| E11 | Reserve Protection protected | GAP | Explicit state/enforcement |
| E12 | Mandatory Future Costs included | GAP | Canonical state/logic |
| E13 | EffectivePool correct | PARTIAL | Reconcile with V3 state |
| E14 | ProtectedCapital correct | GAP | Implement canonical boundary |
| E15 | RawSurplus correct | GAP | Implement `max(0, EEV - ProtectedCapital)` |
| E16 | Post-sale solvency invariant | GAP | Validator rejection of unsafe issuance |
| E17 | HighestClassEverActivated monotonic | GAP | Persist/enforce monotonicity |
| E18 | CurrentActiveClass may contract | GAP | State-derived contraction implementation |
| E19 | Locked Jackpot excluded from free pool | PARTIAL | Full V3 proof required |
| E20 | No double counting | PARTIAL | Transition-level accounting proofs |

---

# 4. V3 Jackpot

| ID | Requirement | Status | Required proof |
|---|---|---|---|
| J1 | `M = 500 × HighestClassEverActivated` | GAP | Historical class state |
| J2 | Jackpot ladder = 10/20/50/100/250 × M | PARTIAL | Bind normative reference to runtime state |
| J3 | Threshold distinct from locked balance | PARTIAL | Explicit transition tests |
| J4 | Funding only from RawSurplus | GAP | Treasury/PrizePool enforcement |
| J5 | Locked Jackpot protected | PARTIAL | Complete isolation proof |
| J6 | Winner from canonical randomness | GAP | Deterministic Jackpot selection |
| J7 | Jackpot payout immutable once crystallized | GAP | State machine |
| J8 | Jackpot payout not double-reserved | GAP | Explicit accounting transitions |
| J9 | Reset/rebuild deterministic | GAP | State transition and tests |

---

# 5. On-Chain Modules

| Module | Scope | Status | Required action |
|---|---|---|---|
| `plutus/Types.hs` | Economic/ticket state | GAP | Migrate legacy/hybrid datum to V3 state |
| `plutus/Economic.hs` | Valuation/helpers | PARTIAL | Helper-by-helper conformance audit |
| `plutus/GameRules.hs` | Symbols/tier/payout | PARTIAL | Verify V3 compatibility |
| `plutus/B1PrizePool.hs` | Pool/reserve/liabilities/Jackpot | PARTIAL | Add class-aware exposure and V3 safety state |
| `plutus/PrizeValidator.hs` | Reveal/claim | PARTIAL | Integrate V3 economic state and expiry semantics |
| `plutus/MintPolicy.hs` | Issuance/payment | GAP | Bind sale to class, verified value and post-state solvency |
| `plutus/Treasury.hs` | Treasury | GAP | Remove active legacy percentage economics |
| `plutus/Beacon.hs` | Randomness | PARTIAL | Preserve validated derivation; verify domains |
| `plutus/BeaconRegistry.hs` | B1 Beacon publication | PARTIAL | Maintain explicit B1 trust boundary |

---

# 6. Treasury

| Requirement | Status | Required action |
|---|---|---|
| Protocol-controlled Treasury | PARTIAL | Complete validator/output proof |
| Liability-first ordering | GAP | Implement V3 state-derived protection |
| EEV-based accounting | GAP | Integrate verified economic state |
| ProtectedCapital | GAP | Implement canonical boundary |
| RawSurplus | GAP | Implement `max(0, EEV - ProtectedCapital)` |
| Legacy 75/10/10/5 removed from active economics | GAP | Migrate legacy implementation |
| No privileged discretionary destination | PARTIAL | Complete negative tests |
| Atomic Treasury/economic transition | GAP | Add state/output conformance |
| Jackpot protected | PARTIAL | Integrate V3 Jackpot state |
| Relayer reward bounded | PARTIAL | Explicit deterministic rule and tests |

---

# 7. Purchase / SALE

| Requirement | Status | Required action |
|---|---|---|
| USDM canonical price | PARTIAL | Bind price to V3 class state |
| ADA/other settlement | PARTIAL | Revalidate current V3 state |
| Verified oracle | PARTIAL | End-to-end current implementation proof |
| Exact class identity | GAP | Add class to economic state |
| Per-class exposure increment | GAP | Implement |
| Class cap | GAP | Implement |
| Post-sale Economic Gate | GAP | Implement |
| Atomic payment + reservation + issuance | PARTIAL | Complete V3 conformance |
| Genesis activation | PARTIAL | Full Preprod proof |

---

# 8. Reveal / Claim / Expiry

| Requirement | Status | Required action |
|---|---|---|
| Commitment verified | PARTIAL | Full current-path evidence |
| Beacon validated | PARTIAL | B1 conformance |
| Symbols derived by validator | PARTIAL | Adversarial proof |
| Tier derived deterministically | PARTIAL | Cross-layer parity |
| Payout crystallized | PARTIAL | Integrate with V3 liabilities |
| Claim atomic | PARTIAL | Complete Pool/liability/payment proof |
| CLAIM does not require BURN | PARTIAL | Explicit regression tests |
| NFT may remain after claim | PARTIAL | Negative test against mandatory burn |
| Expiry dissolves payment commitment | PARTIAL | Explicit transition test |
| Late reveal cannot recreate claimability | PARTIAL | Adversarial test |
| Claim after expiry rejected | PARTIAL | Adversarial test |

---

# 9. Oracle / Settlement

| Requirement | Status | Required action |
|---|---|---|
| Oracle freshness | PARTIAL | Revalidate current V3 sale/claim path |
| Oracle authorization | PARTIAL | Revalidate on-chain enforcement |
| Asset identity | PARTIAL | End-to-end proof |
| Precision | PARTIAL | End-to-end proof |
| Ceiling rounding | PARTIAL | Sale/claim integration |
| ADA valuation | PARTIAL | Current V3 path |
| Multi-asset valuation | PARTIAL | Current V3 path |
| Purchase quote | GAP | Bind to V3 class and sale |
| Claim settlement | PARTIAL | Builder/validator parity |
| Invalid/stale quote rejection | PARTIAL | Adversarial transaction tests |

---

# 10. Beacon / B3

| Requirement | Status | Required action |
|---|---|---|
| B1 authorized publisher | DONE | Current architecture scope |
| B1 trust boundary explicit | DONE | Preserve documentation |
| Publisher-independent B3 | TARGET | Future |
| Finality/state proof | TARGET | Future |
| Ancestry verification | GAP/TARGET | Required for B3 path |
| State/storage proof | TARGET | Future |
| Conflicting-root rejection | PARTIAL | Normative requirement; complete B3 path pending |

---

# 11. Off-Chain / UI

| Area | Status | Required action |
|---|---|---|
| Canonical buy flow | GAP | Unify class → quote → settlement → issuance |
| Canonical reveal flow | PARTIAL | Mirror validator exactly |
| Canonical claim flow | GAP | Remove competing legacy paths |
| Settlement builder | GAP | Verified multi-asset economic settlement |
| GameRules mirror | PARTIAL | Exact parity |
| Config | PARTIAL | Separate constitutional constants from governed values |
| UI active class | GAP | Display verified state-derived class |
| UI settlement quote | GAP | Display verified quote, not source of truth |
| UI B1 disclosure | PARTIAL | No implication of B3 |
| Metadata opacity | PARTIAL | Audit public pre-reveal data |

---

# 12. Documentation

| Document | Status | Required action |
|---|---|---|
| `docs/CONSTITUTION.md` | CURRENT NORMATIVE BASELINE | Preserve |
| `docs/Game-Economy.md` | CURRENT NORMATIVE BASELINE | Preserve frozen economics |
| `docs/Game-Economy-Specification.md` | CURRENT NORMATIVE BASELINE | Preserve frozen economics |
| `docs/ECONOMIC-ALGORITHM.md` | CURRENT FORMAL EXECUTION BASELINE | Preserve canonical execution logic |
| `docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md` | CURRENT CONFORMANCE BASELINE | Preserve status distinctions |
| `docs/CONSTITUTION-GAP-MATRIX.md` | CURRENT CONFORMANCE BASELINE | This document |
| Historical audits | HISTORICAL | Do not reinterpret as V3 implementation proof |

---

# 13. Required Implementation Order

The conformance migration MUST proceed without changing the frozen economic semantics:

```text
1. Normative documentation freeze
        ↓
2. V3 economic state
        ↓
3. Economic helpers
        ↓
4. Class identity / price / exposure / caps
        ↓
5. CurrentActiveClass
        ↓
6. HighestClassEverActivated
        ↓
7. Safety Capital / Reserve Protection
        ↓
8. SALE and post-sale Economic Gate
        ↓
9. PrizePool V3 accounting
        ↓
10. Reveal / crystallization / claim
        ↓
11. Expiry
        ↓
12. Treasury migration
        ↓
13. Jackpot state and funding
        ↓
14. Off-chain/UI parity
        ↓
15. Adversarial tests
        ↓
16. Preprod reproducibility
        ↓
17. Open-source reference freeze
```

---

# 14. Definition of DONE

A V3 invariant is `DONE` only when applicable layers agree:

```text
Constitution
    ↓
Game-Economy
    ↓
Game-Economy-Specification
    ↓
Plutus type
    ↓
Validator / policy
    ↓
Off-chain builder
    ↓
Frontend mirror
    ↓
positive test
    ↓
negative/adversarial test
    ↓
reproducible evidence
```

Insufficient on its own:

- old TODO checkbox;
- old audit report;
- passing mirror test;
- TypeScript implementation;
- datum field;
- documented intention;
- backend calculation.

---

# 15. Current V3 Verdict

## Economic model

**SEMANTICS: CLOSED**

The normative economic baseline is sufficiently consolidated to stop redesigning the model during implementation migration.

## Implementation

**IMPLEMENTATION GAP**

The current code contains meaningful legacy/hybrid components requiring migration or conformance work.

## Evidence

**PARTIAL**

Required validator, adversarial, integration and reproducible evidence remains.

## Documentation

**CLOSING → CLOSED AFTER MANUAL REPOSITORY WRITE-BACK**

The canonical patch set is prepared. Repository documentation becomes closed when these files are manually written to the repository and cross-references are rechecked.

## Open-source status

**OPEN-SOURCE CANDIDATE**

Publishing the documentation does not imply V3 implementation conformance or mainnet readiness.

---

# 16. Non-Negotiable Audit Rule

Always use:

```text
NEW V3 ECONOMY
      ↓
REQUIREMENT
      ↓
CURRENT CODE
      ↓
ACTUAL BEHAVIOR
      ↓
TEST
      ↓
PROOF / EVIDENCE
      ↓
CONFORMANCE VERDICT
```

Existing code does not define the new economy.

If implementation contradicts a frozen normative rule, the implementation is the migration target.

### Open Policy Set — ONLY

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy, but only if an explicit allocation rule is actually required.

Quantitative hysteresis validation is not an open semantic policy: the hysteresis principle is CLOSED and KA=8, KC=4, KD=4 are canonical.
