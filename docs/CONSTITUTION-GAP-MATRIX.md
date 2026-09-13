# PRE-RICH Constitution — V3 Conformance Gap Matrix

**Protocol baseline:** Constitution V3 — Deterministic Economy  
**Implementation baseline:** B1 / `b1-hardening`

> **Core rule:** a requirement is `DONE` only when the current normative specification, Plutus implementation, off-chain implementation, tests and reproducible evidence agree.

> **Historical implementation warning:** older `IMPLEMENTED` checkboxes and earlier B1 audits describe previous implementation states. They are evidence of history, not proof that the current V3 economic model is implemented.

---

# 1. Status Legend

| Status | Meaning |
|---|---|
| DONE | Current V3 rule implemented, aligned, tested and evidenced |
| PARTIAL | Meaningful current implementation exists, but conformance is incomplete |
| GAP | Required V3 behavior is missing or contradicted by current implementation |
| TARGET | Deliberately future architecture |
| UNKNOWN | Dedicated audit/evidence still required |

A `DONE` row does not imply that the entire V3 protocol is complete.

---

# 2. Constitutional Invariants

| ID | Invariant | Status | Current assessment |
|---|---|---|---|
| C1 | No privileged team/dev/founder/admin economic share | PARTIAL | Protocol architecture rejects discretionary beneficiary allocation, but Treasury migration and complete on-chain proof remain |
| C2 | Protocol-controlled Treasury | PARTIAL | Treasury exists, but current implementation still contains legacy percentage semantics |
| C3 | Ticket identity unique and transferable | PARTIAL | Existing NFT architecture supports identity/transfer; current V3 conformance evidence must be revalidated |
| C4 | Ticket not automatically burned on claim | PARTIAL | Current claim path does not require burn; documentation is aligned, but complete current-path proof is pending |
| C5 | Pre-reveal opacity | PARTIAL | Commit/reveal exists; complete adversarial and cross-layer proof remains |
| C6 | Payout crystallized at reveal | PARTIAL | Validator has relevant logic; complete V3 economic-state integration remains |
| C7 | EffectivePool accounting | PARTIAL | Pool tracks relevant legacy fields; complete V3 ProtectedCapital/class-aware reconciliation remains |
| C8 | Unresolved-ticket reserve | PARTIAL | Aggregate reserve exists; V3 requires class-aware exposure semantics |
| C9 | Deterministic worst-case exposure | GAP | Current aggregate implementation does not prove `500 × Σ ClassExposure_i` |
| C10 | Automatic CurrentActiveClass | GAP | Full state-derived V3 class selection is not implemented |
| C11 | Automatic class suspension | PARTIAL | Suspension machinery exists, but complete V3 derivation/hysteresis is incomplete |
| C12 | Hysteresis | GAP | Complete on-chain hysteresis rule not established |
| C13 | HighestClassEverActivated monotonic | GAP | Required V3 historical state is not yet fully represented/enforced |
| C14 | Genesis = 1 USDM | PARTIAL | Normative baseline is fixed; complete on-chain activation evidence remains |
| C15 | Genesis PRE threshold >= 4,000 USDM | PARTIAL | Normative rule exists; full verified activation path remains |
| C16 | USDM canonical denomination | PARTIAL | Normative model is consolidated; implementation must be re-audited against V3 |
| C17 | Multi-asset settlement preserves USDM value | PARTIAL | Valuation helpers exist, but current purchase/claim paths require V3 conformance proof |
| C18 | No underpayment from rounding | PARTIAL | Helper-level rounding exists; complete current sale/claim path evidence remains |
| C19 | Jackpot separate from normal pool | PARTIAL | Locked Jackpot field exists; complete V3 lifecycle isolation remains |
| C20 | Jackpot activated from verified state | GAP | Complete V3 trigger/state machine not implemented |
| C21 | Jackpot materially exceeds maximum normal payout | PARTIAL | Normative relationship exists; complete runtime enforcement remains |
| C22 | Jackpot ladder deterministic | GAP | V3 multi-level state transition is not complete |
| C23 | Jackpot funded only after mandatory obligations | GAP | Funding transition not fully enforced |
| C24 | Jackpot payout frozen | GAP | Complete Jackpot win/claim state not implemented |
| C25 | Jackpot reset/rebuild deterministic | GAP | Complete reset lifecycle not implemented |
| C26 | Single claim | PARTIAL | Validator guards claim state; competing/legacy paths require consolidation |
| C27 | Expiry fixed at mint | PARTIAL | Expiry fields exist; mint-time and lifecycle enforcement require full proof |
| C28 | Historical reveal after expiry cannot create claim | PARTIAL | Normative rule is explicit; adversarial implementation proof remains |
| C29 | Failure paths fail closed | PARTIAL | Core validators reject invalid data; cross-component audit remains |
| C30 | Backend/relayer cannot determine economic outcome | PARTIAL | Architecture requires this; complete adversarial proof remains |
| C31 | Governance cannot override outcomes | PARTIAL | Boundary is documented; implementation limits require proof |
| C32 | On-chain/off-chain economic parity | PARTIAL | Mirrors/tests exist, but V3 migration creates known divergence risk |
| C33 | B1/B2/B3 honestly distinguished | DONE | Current documentation explicitly separates interim B1 from future B3 |
| C34 | Publisher-independent B3 canonicality | TARGET | Future B3 architecture |
| C35 | Repository-wide non-regression | PARTIAL | Documentation consolidation is underway; implementation migration remains |

---

# 3. V3 Economic State

| ID | Requirement | Status | Required proof |
|---|---|---|---|
| E1 | Canonical ladder 1/2/3/5/10/25/50/100 USDM | PARTIAL | Bind class identity, pricing and saleability to V3 state |
| E2 | Class price is USDM economic value | GAP | Remove all remaining legacy fixed-ADA economic assumptions |
| E3 | Class selection derived from verified state | GAP | Implement CurrentActiveClass |
| E4 | Availability evaluated on post-sale state | GAP | Candidate SALE → post-state → Economic Gate |
| E5 | Suspension does not invalidate existing tickets | PARTIAL | Add explicit lifecycle tests |
| E6 | Hysteresis prevents oscillation | GAP | Implement thresholds and transitions |
| E7 | Crystallized liabilities protected | PARTIAL | Integrate with complete V3 ProtectedCapital |
| E8 | Unresolved exposure is class-aware | GAP | Implement `ClassExposure_i` |
| E9 | Worst-case exposure = 500 × Σ ClassExposure_i | GAP | On-chain aggregate and per-class enforcement |
| E10 | Safety Capital protected | GAP | Add explicit state and enforcement |
| E11 | Reserve Protection protected | GAP | Add explicit state and enforcement |
| E12 | Mandatory Future Costs included | GAP | Implement canonical state/logic |
| E13 | EffectivePool correct | PARTIAL | Reconcile with V3 economic state |
| E14 | ProtectedCapital correct | GAP | Implement complete formula |
| E15 | RawSurplus correct | GAP | Implement `max(0, EEV - ProtectedCapital)` |
| E16 | Post-sale solvency invariant | GAP | Validator rejection of unsafe issuance |
| E17 | HighestClassEverActivated monotonic | GAP | Persist and enforce monotonicity |
| E18 | CurrentActiveClass may contract | GAP | State-derived contraction implementation |
| E19 | Locked Jackpot excluded from free pool | PARTIAL | Existing field is useful; full V3 proof required |
| E20 | No double counting | PARTIAL | Add transition-level accounting proofs |

---

# 4. V3 Jackpot

| ID | Requirement | Status | Required proof |
|---|---|---|---|
| J1 | `M = 500 × HighestClassEverActivated` | GAP | Historical class state |
| J2 | Jackpot ladder = 10/20/50/100/250 × M | PARTIAL | Normative parameter must be bound to runtime state |
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
| `plutus/Economic.hs` | Valuation/helpers | PARTIAL | P0.2 helper-by-helper conformance audit |
| `plutus/GameRules.hs` | Symbols/tier/payout | PARTIAL | Verify exact V3 compatibility |
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
| ProtectedCapital | GAP | Implement complete formula |
| RawSurplus | GAP | Implement complete formula |
| Legacy 75/10/10/5 removed from active economics | GAP | Migrate `Treasury.hs` and legacy datum fields |
| No privileged discretionary destination | PARTIAL | Complete negative tests |
| Atomic Treasury/economic transition | GAP | Add state/output conformance |
| Jackpot protected | PARTIAL | Integrate V3 Jackpot state |
| Relayer reward bounded | PARTIAL | Explicit deterministic rule and tests |

---

# 7. Purchase / SALE

| Requirement | Status | Required action |
|---|---|---|
| USDM canonical price | PARTIAL | Bind price to V3 class state |
| ADA/other settlement | PARTIAL | Revalidate against current V3 state |
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
| CLAIM does not require BURN | PARTIAL | Current implementation appears compatible; add explicit regression tests |
| NFT may remain after claim | PARTIAL | Add negative test against mandatory burn |
| Expiry dissolves payment commitment | PARTIAL | Explicit transition test |
| Late reveal cannot recreate claimability | PARTIAL | Add adversarial test |
| Claim after expiry rejected | PARTIAL | Add adversarial test |

---

# 9. Oracle / Settlement

| Requirement | Status | Required action |
|---|---|---|
| Oracle freshness | PARTIAL | Revalidate against current V3 sale/claim path |
| Oracle authorization | PARTIAL | Revalidate current on-chain enforcement |
| Asset identity | PARTIAL | End-to-end proof |
| Precision | PARTIAL | End-to-end proof |
| Ceiling rounding | PARTIAL | Sale/claim integration |
| ADA valuation | PARTIAL | Current V3 path |
| Multi-asset valuation | PARTIAL | Current V3 path |
| Purchase quote | GAP | Bind to V3 class and sale |
| Claim settlement | PARTIAL | Complete current builder/validator parity |
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
| `docs/CONSTITUTION.md` | CURRENT NORMATIVE BASELINE | Preserve; implementation status tracked separately |
| `docs/Game-Economy.md` | CURRENT NORMATIVE BASELINE | Preserve frozen economics |
| `docs/Game-Economy-Specification.md` | CURRENT NORMATIVE BASELINE | Preserve frozen economics |
| `docs/treasury-distribution-spec.md` | RECONCILED CANDIDATE | Publish replacement prepared separately |
| `docs/commit-reveal-design.md` | RECONCILED CANDIDATE | Publish replacement prepared separately |
| `docs/MASTER-TODO-V3.md` | RECONCILED CANDIDATE | Publish replacement prepared separately |
| `docs/architecture-spec.md` | PARTIAL | Reconcile with V3 state/claim/expiry |
| `docs/CONSTITUTION-GAP-MATRIX.md` | RECONCILED CANDIDATE | This document |
| Source Registry | PARTIAL | Ensure canonical hierarchy is explicit |
| Historical audits | HISTORICAL | Do not reinterpret as V3 implementation proof |

---

# 13. Required Implementation Order

The conformance migration MUST proceed in this order:

```text
1. Freeze normative economic documentation
        ↓
2. V3 economic state types
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

A V3 invariant may be marked `DONE` only if all applicable layers agree:

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

The following are specifically insufficient on their own:

- an old TODO checkbox;
- an old audit report;
- a passing mirror test;
- a TypeScript implementation;
- a datum field;
- a documented intention;
- a backend calculation.

---

# 15. Current V3 Verdict

## Economic model

**SUBSTANTIALLY CONSOLIDATED / NORMATIVE BASELINE**

The economic research and specification layer is sufficiently consolidated to stop redesigning the economic model during implementation migration.

## Implementation

**NOT YET V3-CONFORMANT**

The current code contains meaningful components from the previous implementation, but several of those components encode the earlier economic model and therefore require re-audit or migration.

## Documentation

**CONSOLIDATION IN PROGRESS**

The major economic contradictions identified so far are being removed from the normative repository documents.

## Open-source status

**OPEN-SOURCE CANDIDATE — NOT REFERENCE-FREEZE READY**

The repository can be made public as research/development software, but a definitive reference release should wait for:

- V3 implementation conformance;
- adversarial test coverage;
- reproducible evidence;
- documentation consistency;
- removal of active legacy economic contradictions.

---

# 16. Non-Negotiable Audit Rule

The project must always use:

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

Never reverse this process.

In particular:

> **Existing code does not define the new economy.**

If the current implementation contradicts the frozen V3 economic model, the implementation is the migration target.

This matrix therefore deliberately contains more `PARTIAL` and `GAP` statuses than the historical matrix. That is not regression: it is the removal of false confidence caused by treating legacy implementation as V3 proof.
