# PRE-RICH — Master TODO V3

**Protocol baseline:** Constitution V3 — Deterministic Economy  
**Purpose:** implementation and conformance tracker for the V3 normative economic model.

> **Critical status rule:** historical implementation claims are evidence of repository history, not proof of V3 conformance. Every item must be evaluated as **V3 requirement → current code → tests → reproducible evidence → verdict**.

---

# 0. STATUS MODEL

Use only these statuses:

- `DONE` — normative rule, implementation, tests and evidence agree.
- `PARTIAL` — meaningful implementation exists, but one or more V3 requirements remain unverified/incomplete.
- `GAP` — V3 requirement is not currently enforced.
- `TARGET` — future architecture/design.
- `UNKNOWN` — insufficient evidence.

Do **not** use `IMPLEMENTED / VERIFICATION BLOCKED` as a substitute for a V3 conformance verdict.

Historical code may be retained, but it must be labelled as historical/legacy where it does not implement the current V3 model.

---

# PHASE 1 — ECONOMIC STATE

## TODO-01 — Canonical V3 economic state

**Requirement**

Implement the canonical economic state defined by the V3 specification.

Required conceptual layers:

```text
Global Economic State
Per-Class State
Historical Control State
Jackpot State
```

Required economic concepts include:

- CrystallizedLiabilities
- UnresolvedReserve / class-aware unresolved exposure
- SafetyCapital
- ReserveProtection
- MandatoryFutureCosts
- CurrentActiveClass
- HighestClassEverActivated
- class price
- issued count
- unresolved count
- class exposure
- class cap
- saleability
- Jackpot state

**Current verdict:** GAP / migration required.

---

## TODO-02 — V3 economic type schema

Implement the target type model established by the V3 type specification.

Required conceptual structures:

```haskell
TicketClassState
EconomicControlState
JackpotState
V3EconomicState
```

Stored state and derived values MUST remain explicitly distinguished.

**Derived values include, where applicable:**

```text
ClassPrice
EEV
EffectivePool
ProtectedCapital
RawSurplus
WorstCaseExposure
```

**Current verdict:** GAP / legacy-partial types.

---

## TODO-03 — Economic state invariants

Enforce and test:

```text
EffectivePool >= 0
RawSurplus = max(0, EEV - ProtectedCapital)
```

and:

```text
ClassExposure_i =
    ClassPrice_i × UnresolvedCount_i
```

```text
WorstCaseExposure =
    500 × Σ ClassExposure_i
```

with the canonical invariant governing any aggregate unresolved reserve.

**Current verdict:** PARTIAL / requires V3 enforcement.

---

# PHASE 2 — ECONOMIC HELPERS

## TODO-04 — Canonical asset valuation

Audit and conform the economic helper layer:

- `ceilingDiv`
- oracle timestamp validity
- oracle price selection
- asset → USDM conversion
- total USDM value
- Pool USDM value
- deterministic rounding.

**Rule**

A helper is not V3-conformant merely because an older checklist marked the Economic module implemented.

**Current verdict:** PARTIAL / P0.2 conformance audit.

---

## TODO-05 — Oracle authority

Verify:

- singleton Oracle State identity;
- correct reference input;
- asset pair;
- authorized publisher/authority;
- valid price;
- valid timestamp;
- deterministic conversion.

Invalid, stale, missing or mismatched oracle state MUST reject any transition requiring that valuation.

**Current verdict:** PARTIAL / verification required.

---

## TODO-06 — EEV methodology

Reconcile implementation with the normative EEV methodology:

- asset perimeter;
- liquidation horizon;
- oracle sources;
- execution costs;
- operational constraints.

Do not replace EEV with:

- nominal wallet balance;
- arbitrary haircut;
- TVL;
- global market depth;
- browser-side market price.

**Current verdict:** GAP/PARTIAL pending implementation audit.

---

# PHASE 3 — TICKET PURCHASE / SALE

## TODO-07 — Canonical ticket ladder

Implement and enforce:

```text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
```

Genesis ticket price:

```text
1 USDM
```

**Current verdict:** PARTIAL / must be bound to V3 class state.

---

## TODO-08 — Genesis bootstrap

Enforce the canonical Genesis bootstrap threshold:

```text
Treasury PRE value >= 4,000 USDM
```

The implementation MUST clearly distinguish bootstrap capital from PrizePool liquidity where required.

**Current verdict:** PARTIAL / conformance required.

---

## TODO-09 — Class-aware saleability

For every class, saleability MUST be derived from the canonical economic state.

A class MUST NOT be sold merely because an old implementation permits the transaction.

The sale transition MUST account for:

- class price;
- unresolved count;
- class exposure;
- class cap;
- current active class;
- safety constraints;
- post-sale state.

**Current verdict:** GAP.

---

## TODO-10 — Atomic SALE

The SALE transition MUST atomically establish:

```text
payment
+
ticket identity
+
class identity
+
economic reservation
+
required Pool/Treasury state
```

The resulting state MUST satisfy the V3 economic gate.

**Current verdict:** PARTIAL / implementation conformance required.

---

# PHASE 4 — CLASS CONTROL

## TODO-11 — CurrentActiveClass

Implement:

```text
CurrentActiveClass =
highest class satisfying all applicable economic safety constraints
```

It MUST be state-derived.

It MUST NOT be an arbitrary operator-selected parameter.

**Current verdict:** GAP/PARTIAL.

---

## TODO-12 — HighestClassEverActivated

Persist:

```text
HighestClassEverActivated
```

It MUST be monotonic:

```text
new >= old
```

It MUST NOT decrease during contraction.

It MUST NOT be reconstructed from the current active class after the fact.

**Current verdict:** GAP/UNVERIFIED.

---

## TODO-13 — Hysteresis and contraction

Implement the canonical contraction sequence:

```text
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT
```

Contraction MUST:

- be state-derived;
- preserve existing valid tickets;
- preserve crystallized liabilities;
- not erase historical highest activation.

**Current verdict:** GAP/PARTIAL.

---

## TODO-14 — Recovery / re-expansion

Define and enforce the conditions under which a previously contracted system may re-expand.

Re-expansion MUST NOT violate the monotonicity of `HighestClassEverActivated`.

**Current verdict:** GAP / specification-to-code audit required.

---

# PHASE 5 — EXPOSURE AND SOLVENCY

## TODO-15 — Per-class exposure

Implement:

```text
ClassExposure_i =
    ClassPrice_i × UnresolvedCount_i
```

The class exposure MUST be available to the economic gate where required.

**Current verdict:** GAP.

---

## TODO-16 — Worst-case unresolved exposure

Implement:

```text
WorstCaseExposure =
    500 × Σ ClassExposure_i
```

An aggregate:

```text
ppUnresolvedReserve
```

is valid as an optimization/storage representation only when it is provably equal to the canonical class-aware exposure.

The old formulation:

```text
500 × ppUnresolvedReserve
```

MUST NOT be treated as sufficient evidence of V3 conformance by itself.

**Current verdict:** GAP/PARTIAL.

---

## TODO-17 — Issuance safety

Before issuance, evaluate the candidate post-sale state.

The sale MUST be rejected when the resulting exposure or protected-capital requirements violate the economic gate.

**Current verdict:** GAP.

---

## TODO-18 — Safety Capital

Implement and enforce the canonical Safety Capital requirement.

Safety Capital MUST be included in protected capital before residual surplus is calculated.

**Current verdict:** GAP.

---

## TODO-19 — Reserve Protection

Implement explicit Reserve Protection.

Reserve-protected value MUST NOT be treated as free surplus.

**Current verdict:** GAP/PARTIAL.

---

## TODO-20 — Post-state economic gate

For transitions requiring it:

```text
current state
    ↓
candidate transition
    ↓
post-state
    ↓
Economic Gate
```

The gate MUST evaluate the state actually resulting from the transaction.

**Current verdict:** PARTIAL / requires complete V3 coverage.

---

# PHASE 6 — POOL ACCOUNTING

## TODO-21 — Physical/economic Pool reconciliation

Maintain the invariant:

```text
physical assets
      ↕
verified USDM economic value
```

The datum MUST NOT claim economic value that the transaction does not physically support.

**Current verdict:** PARTIAL.

---

## TODO-22 — EffectivePool

Implement the canonical calculation:

```text
EffectivePool =
    EEV
    - CrystallizedLiabilities
    - UnresolvedReserve
    - LockedJackpot
```

**Current verdict:** PARTIAL / V3 class-aware exposure integration required.

---

## TODO-23 — ProtectedCapital

Implement:

```text
ProtectedCapital =
      CrystallizedLiabilities
    + WorstCaseExposure
    + SafetyCapital
    + ReserveProtection
    + LockedJackpot
    + MandatoryFutureCosts
```

**Current verdict:** GAP.

---

## TODO-24 — RawSurplus

Implement:

```text
RawSurplus =
    max(0, EEV - ProtectedCapital)
```

No operation may create surplus by ignoring protected capital.

**Current verdict:** GAP.

---

# PHASE 7 — REVEAL / CRYSTALLIZATION / CLAIM

## TODO-25 — Deterministic reveal

The validator MUST derive:

```text
Beacon
+
playerSecret
+
ticket context
↓
ticketSeed
↓
symbols
↓
tier
↓
payout
```

The player MUST NOT submit authoritative symbols, tier or payout.

**Current verdict:** PARTIAL / conformance audit required.

---

## TODO-26 — Prize crystallization

At reveal, a winning payout MUST be frozen according to the canonical result.

The resulting liability MUST enter the correct economic state.

**Current verdict:** PARTIAL.

---

## TODO-27 — Atomic claim

Claim MUST atomically reconcile:

- ticket state;
- PrizePool;
- payment;
- liability;
- liquidity;
- resulting Pool state.

The physical value paid MUST correspond to the economic value deducted.

**Current verdict:** PARTIAL.

---

## TODO-28 — CLAIM ≠ BURN

Claim MUST NOT require ticket NFT burn.

The NFT MAY remain with the claimant according to protocol rules.

Burn, if available, is a separate operation and MUST NOT change the economic result.

**Current verdict:** documentation aligned; implementation/test conformance to verify.

---

## TODO-29 — Expiry

Expiry MUST dissolve the unclaimed payment commitment.

A reveal after expiry MAY preserve historical information if the state machine permits it, but:

```text
late reveal ≠ renewed claimability
```

A post-expiry reveal MUST NOT recreate a payment obligation.

A claim relying on an expired economic right MUST fail.

**Current verdict:** PARTIAL / adversarial tests required.

---

# PHASE 8 — TREASURY V3

## TODO-30 — Treasury state migration

Remove the economic role of legacy percentage fields:

```text
tdPrizePct
tdStakePct
tdReservePct
tdMaintenancePct
```

They are migration debt when they encode the retired percentage-allocation model.

**Current verdict:** GAP.

---

## TODO-31 — No fixed 75/10/10/5 split

The historical:

```text
75% / 10% / 10% / 5%
```

allocation MUST NOT be implemented as canonical V3 economics.

It may remain only as historical material.

**Current verdict:** GAP in legacy implementation.

---

## TODO-32 — Treasury residual-surplus logic

Treasury operations MUST use:

```text
EEV
→ ProtectedCapital
→ RawSurplus
→ permitted transition
```

rather than percentage allocation from gross revenue.

**Current verdict:** GAP.

---

## TODO-33 — Treasury atomicity

Treasury movement and economic-state transition MUST be atomic.

**Current verdict:** GAP/PARTIAL.

---

## TODO-34 — Relayer reward

If a relayer execution reward exists, it MUST be:

- bounded;
- deterministic;
- visible;
- paid only from legitimately available value;
- unable to alter the economic result.

**Current verdict:** PARTIAL.

---

# PHASE 9 — JACKPOT

## TODO-35 — Jackpot state

Implement explicit Jackpot state including:

- locked amount;
- threshold;
- status;
- cycle;
- applicable trigger;
- payout/reset semantics.

**Current verdict:** GAP/PARTIAL.

---

## TODO-36 — Jackpot isolation

Ensure:

```text
LockedJackpot
```

is protected and excluded from free EffectivePool value.

Prevent double counting.

**Current verdict:** PARTIAL.

---

## TODO-37 — Jackpot funding

Enforce:

```text
NewJackpot <= RawSurplus
```

followed by the applicable Economic Gate.

There is no canonical fixed Jackpot funding percentage.

**Current verdict:** GAP.

---

## TODO-38 — Jackpot randomness

Winner selection MUST depend only on canonical validated randomness.

Frontend, backend or relayer selection MUST NOT determine the winner.

**Current verdict:** GAP/PARTIAL.

---

# PHASE 10 — BEACON / B1 / B3

## TODO-39 — B1 conformance

Verify the current B1 trust boundary:

```text
authorized publisher
      ↓
BeaconRegistry
      ↓
PrizeValidator
```

B1 MUST NOT be described as trustless B3.

**Current verdict:** PARTIAL.

---

## TODO-40 — Beacon canonicality

Ensure the validator does not treat arbitrary backend metadata as canonical Beacon evidence.

**Current verdict:** PARTIAL.

---

## TODO-41 — B3 target

Keep B3 clearly separated from the current B1 implementation.

B3 requires publisher-independent canonicality through a valid proof and/or authenticated L1 anchor.

**Current verdict:** TARGET.

---

# PHASE 11 — OFF-CHAIN CONFORMANCE

## TODO-42 — Canonical buy flow

Unify:

```text
class
→ USDM price
→ settlement asset
→ oracle quote
→ transaction construction
→ issuance
```

The frontend MUST NOT become the economic authority.

**Current verdict:** PARTIAL.

---

## TODO-43 — Reveal flow

Off-chain reveal construction MUST mirror the authoritative validator logic exactly.

No competing economic derivation may silently exist.

**Current verdict:** PARTIAL.

---

## TODO-44 — Claim flow

Claim builder MUST:

- use the canonical claim path;
- support the intended settlement model;
- preserve NFT retention;
- reconcile Pool/liability state;
- reject expired economic rights.

**Current verdict:** PARTIAL.

---

# PHASE 12 — TESTS AND PROOF

## TODO-45 — Economic helper tests

Test:

- USDM conversion;
- ceiling division;
- rounding;
- oracle validity;
- EEV;
- EffectivePool;
- ProtectedCapital;
- RawSurplus;
- class exposure.

**Current verdict:** PARTIAL.

---

## TODO-46 — Class adversarial tests

Test:

- activation;
- contraction;
- recovery;
- wrong class;
- sale above cap;
- sale below safety floor;
- monotonic highest class;
- existing tickets after suspension.

**Current verdict:** GAP/PARTIAL.

---

## TODO-47 — Exposure adversarial tests

Test:

- unresolved exposure;
- per-class exposure;
- worst-case exposure;
- issuance at limit;
- issuance above limit;
- cross-class solvency;
- emergency HALT.

**Current verdict:** GAP.

---

## TODO-48 — Oracle adversarial tests

Test:

- fake Oracle UTxO;
- wrong singleton;
- stale timestamp;
- asset mismatch;
- missing oracle;
- malicious extra assets;
- invalid price;
- unauthorized publisher.

**Current verdict:** PARTIAL.

---

## TODO-49 — Treasury adversarial tests

Test:

- legacy percentage allocation;
- unauthorized destination;
- protected-capital withdrawal;
- Jackpot double counting;
- Reserve violation;
- post-state insolvency;
- invalid relayer reward.

Every invalid transition MUST fail.

**Current verdict:** GAP.

---

## TODO-50 — Expiry adversarial tests

Explicitly test:

```text
reveal before expiry
reveal after expiry
claim before expiry
claim after expiry
late reveal → attempted claim
```

The critical invariant is:

```text
expiry dissolves payment commitment
```

**Current verdict:** GAP/PARTIAL.

---

## TODO-51 — Full lifecycle tests

Test:

```text
BUY
 ↓
COMMIT
 ↓
BEACON
 ↓
REVEAL
 ↓
CRYSTALLIZE
 ↓
CLAIM
```

and the expiry branch:

```text
BUY
 ↓
COMMIT
 ↓
EXPIRY
 ↓
late reveal (if historically permitted)
 ↓
NO CLAIMABILITY
```

**Current verdict:** PARTIAL.

---

# PHASE 13 — PREPROD / REPRODUCIBILITY

## TODO-52 — Deployment topology

Deploy and verify, as applicable:

- Treasury;
- Counter;
- BeaconRegistry;
- PrizeValidator;
- B1PrizePool;
- MintPolicy;
- Oracle state.

Record script hashes and addresses.

**Current verdict:** TARGET/PARTIAL.

---

## TODO-53 — Genesis activation

Verify the canonical Genesis threshold on-chain.

**Current verdict:** TARGET.

---

## TODO-54 — Real BUY

Perform a real Preprod purchase and record:

- oracle evidence;
- economic price;
- settlement asset;
- Treasury payment;
- Pool reservation;
- Counter increment;
- NFT;
- PrizeDatum.

**Current verdict:** TARGET.

---

## TODO-55 — Real REVEAL

Record reproducible evidence for:

- commitment;
- Beacon;
- seed;
- symbols;
- result;
- tier;
- payout;
- Pool transition.

**Current verdict:** TARGET.

---

## TODO-56 — Real CLAIM

Record:

- claimant authorization;
- settlement;
- Pool decrement;
- liability decrement;
- final ticket state;
- NFT retention.

**Current verdict:** TARGET.

---

## TODO-57 — Invalid Preprod transactions

Execute and document rejection of:

- fake oracle;
- stale oracle;
- incorrect payment;
- incorrect payout;
- incorrect Pool value;
- double claim;
- wrong owner;
- wrong class;
- sale beyond safety;
- suspended class;
- modified PrizeDatum;
- modified PoolDatum;
- post-expiry claim.

**Current verdict:** TARGET.

---

# PHASE 14 — DOCUMENTATION AND OPEN-SOURCE FREEZE

## TODO-58 — Normative document reconciliation

Ensure agreement between:

```text
CONSTITUTION
Game-Economy
Game-Economy-Specification
Treasury specification
Commit-reveal design
Architecture specification
Gap Matrix
Master TODO
```

No document may retain a retired economic rule as current.

**Current verdict:** IN PROGRESS.

---

## TODO-59 — Source registry

Maintain the canonical source relationship:

```text
Decision Register / Constitution
          ↓
Game-Economy.md
          ↓
Game-Economy-Specification.md
          ↓
implementation
          ↓
tests / proofs / artifacts
```

Historical documents remain useful as evidence but do not override the canonical hierarchy.

**Current verdict:** PARTIAL.

---

## TODO-60 — Open-source status declaration

The public repository MUST distinguish:

```text
economic model = consolidated
implementation = under conformance migration
B1 = interim trust model
B3 = future target
mainnet readiness = not claimed
```

**Current verdict:** PARTIAL / documentation reconciliation.

---

# FINAL V3 DEFINITION OF DONE

The V3 implementation may be declared conformant only when all of the following are true:

- [ ] V3 economic state exists in the implementation.
- [ ] V3 economic helpers are verified.
- [ ] Oracle authority is enforced.
- [ ] EEV is implemented according to the normative methodology.
- [ ] Class-aware exposure is enforced.
- [ ] `HighestClassEverActivated` is monotonic.
- [ ] `CurrentActiveClass` is state-derived.
- [ ] Class caps and saleability are enforced.
- [ ] SALE evaluates the resulting post-state.
- [ ] EffectivePool is correct.
- [ ] ProtectedCapital is correct.
- [ ] RawSurplus is correct.
- [ ] Treasury uses V3 residual-surplus semantics.
- [ ] Legacy 75/10/10/5 allocation is retired from active economics.
- [ ] Jackpot is isolated and protected.
- [ ] Jackpot funding is bounded by RawSurplus.
- [ ] Reveal deterministically derives the result.
- [ ] Claim is atomic.
- [ ] Claim does not require NFT burn.
- [ ] Expiry dissolves the payment commitment.
- [ ] Post-expiry reveal cannot recreate claimability.
- [ ] Adversarial tests cover all economic boundaries.
- [ ] Positive and negative tests agree with on-chain behavior.
- [ ] Reproducible Preprod evidence exists.
- [ ] Public documentation is internally consistent.
- [ ] No legacy economic contradiction remains in normative documentation.
- [ ] The resulting release can be independently audited.

---

# OPERATING RULE

For every implementation change use:

```text
V3 normative requirement
        ↓
exact code location
        ↓
actual behavior
        ↓
positive test
        ↓
negative test
        ↓
reproducible evidence
        ↓
CONFORMANCE VERDICT
```

Never infer V3 conformance from an old `IMPLEMENTED` checkbox.

Never change frozen economic semantics merely to make legacy code appear conformant.

If legacy code conflicts with the frozen V3 model, **the code is the migration target, not the economic specification**.
