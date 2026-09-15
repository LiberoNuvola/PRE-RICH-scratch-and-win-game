# PRE-RICH Architecture Specification

**Status:** Normative V3 architecture baseline  
**Protocol state:** Economic semantics consolidated; implementation conformance remains open  
**Constitution:** `docs/CONSTITUTION.md`  
**Economic specification:** `docs/Game-Economy.md` and `docs/Game-Economy-Specification.md`  
**Trust model:** `docs/beacon-trust-model.md`  
**B3 canonicality target:** `docs/beacon-canonicality-spec.md`

---

# 1. Purpose and status

PRE-RICH is a Cardano-based scratch-and-win protocol whose architecture separates:

- authoritative economic state;
- deterministic game logic;
- cryptographic commitment and reveal;
- external-state observation and verification;
- executable liquidity and solvency;
- permissionless settlement;
- protocol-controlled treasury operation;
- public verification.

This document is the architectural baseline for the **V3 economic model**.

It does **not** claim that every requirement described here is already implemented on-chain.

The project MUST distinguish:

```text
NORMATIVE TARGET
        ↓
IMPLEMENTATION
        ↓
TEST / PROOF
        ↓
CONFORMANCE VERDICT
```

Historical implementation status, old TODO checkboxes, or the existence of a related function MUST NOT be treated as proof of V3 conformance.

The current B1 implementation is an interim operational architecture. B3 remains the target for objectively verifiable external-state canonicality.

---

# 2. Authority hierarchy

The protocol uses the following authority hierarchy:

```text
Constitution / Definitive Decisions
                ↓
V3 Economic Specifications
                ↓
Architecture / State / Transition Specifications
                ↓
On-chain implementation
                ↓
Off-chain transaction construction
                ↓
Tests, vectors, proofs and reproducible artifacts
```

For runtime data:

```text
External observation
        ↓
Evidence
        ↓
Cryptographic verification
        ↓
Canonical on-chain state
        ↓
Deterministic game input
        ↓
Economic derivation
        ↓
Atomic settlement
```

Only verified inputs and state enforced by Cardano may affect authoritative economic outcomes.

An off-chain service MUST NOT become an implicit source of economic truth.

---

# 3. Core architectural principles

## 3.1 Publisher may submit; publisher must not decide

An external publisher may submit evidence or a candidate value.

It MUST NOT have unilateral authority to define an economically authoritative value in a trustless configuration.

## 3.2 Adapter may observe and prove; adapter must not decide

An external adapter may retrieve:

- headers;
- state roots;
- runtime information;
- finality information;
- authority information;
- storage proofs;
- other evidence.

The adapter MUST NOT itself establish canonicality.

## 3.3 Relayer may execute; relayer must not determine truth

A relayer may:

- construct transactions;
- submit transactions;
- monitor state;
- facilitate operational transitions;
- submit evidence or proofs.

A relayer MUST NOT be able to alter:

- ticket results;
- prize tiers;
- payout values;
- class activation state;
- solvency state;
- treasury truth;
- canonical Beacon truth.

## 3.4 Frontend may display; frontend must not authorize

The frontend may reproduce calculations for UX.

Cardano remains authoritative for:

- ticket state;
- ownership;
- commitment validity;
- Beacon validity;
- game result;
- payout;
- claimability;
- economic state transitions.

---

# 4. Architectural components

The reference architecture contains:

```text
                 ┌──────────────────────┐
                 │        USER          │
                 │ wallet + secret      │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │      FRONTEND        │
                 │ UX / tx construction │
                 └──────────┬───────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                       CARDANO L1                         │
│                                                          │
│  Ticket / Mint     Economic State     Prize / Claim      │
│  Counter           Treasury           Beacon Registry    │
│                                                          │
└───────────────┬───────────────────────┬──────────────────┘
                │                       │
                ▼                       ▼
        deterministic game      verified external state
                │                       │
                │                       ▼
                │                Materios / external
                │                       │
                │                evidence / proof
                │                       │
                └──────────┬────────────┘
                           ▼
                    economic settlement
```

Off-chain infrastructure is a convenience and execution layer unless explicitly promoted to a cryptographically enforced protocol component.

---

# 5. Trust classification

## 5.1 Cardano validators and minting policies

These are the authoritative enforcement mechanisms.

They MUST enforce the protocol predicates applicable to the state transition.

Where a requirement is not currently enforced on-chain, it MUST be classified as an implementation gap or target rather than as completed functionality.

## 5.2 Frontend

**Trust:** untrusted.

May:

- connect wallets;
- generate secrets;
- construct transactions;
- display state;
- calculate estimates;
- initiate reveal;
- initiate claim.

Must not determine:

- winner;
- symbols;
- tier;
- payout;
- economic solvency;
- Beacon canonicality;
- claim validity.

## 5.3 Backend / indexer / proxy

**Trust:** untrusted convenience layer.

May:

- index UTxOs;
- provide queries;
- cache information;
- discover transactions;
- support UX.

It MUST NOT be required for correctness.

A malicious backend may inconvenience or mislead a frontend, but MUST NOT make invalid Cardano state valid.

## 5.4 Relayer

**Trust:** execution facilitator.

The relayer is not an economic authority.

Its failure MUST be survivable wherever the protocol claims permissionless operation.

## 5.5 External adapter

**Trust:** untrusted evidence producer.

The adapter may produce false evidence. Cardano-side verification MUST reject evidence that fails the active verification predicate.

---

# 6. Canonical V3 economic architecture

The V3 economic state is organized into four layers:

```text
GLOBAL ECONOMIC STATE
        +
PER-CLASS STATE
        +
HISTORICAL / CONTROL STATE
        +
JACKPOT STATE
```

The architecture MUST NOT collapse these layers into unrelated legacy fields.

## 6.1 Global economic state

Conceptually:

```text
CrystallizedLiabilities
UnresolvedReserve
UnresolvedTicketCount
SafetyCapital
ReserveProtection
MandatoryFutureCosts
```

The economic specification defines the exact semantics of these quantities.

## 6.2 Per-class state

For every ticket class:

```text
IssuedCount
UnresolvedCount
ClassExposure
ClassCap
Saleable
```

The canonical exposure relationship is:

```text
ClassExposure_i
    =
ClassPrice_i × UnresolvedCount_i
```

The aggregate unresolved reserve MUST be consistent with the class-level exposure model.

## 6.3 Historical/control state

The architecture distinguishes:

```text
CurrentActiveClass
HighestClassEverActivated
```

These values have different semantics.

`CurrentActiveClass` MAY contract.

`HighestClassEverActivated` is historical and MUST be monotonic.

A contraction MUST NOT rewrite the historical maximum.

## 6.4 Jackpot state

Jackpot state is separate from ordinary unresolved liabilities.

Conceptually:

```text
LockedAmount
Threshold
Status
Cycle
```

The Jackpot MUST remain protected from ordinary distribution.

---

# 7. Canonical economic derivations

The architecture adopts the V3 economic derivations.

## 7.1 Executable Economic Value

`ExecutableEconomicValue` (EEV) is derived using the frozen economic methodology.

The methodology MUST define:

- asset perimeter;
- liquidation horizon;
- oracle source;
- conversion rules;
- execution costs;
- validity conditions.

EEV MUST NOT be replaced by arbitrary:

- TVL;
- global market depth;
- informal haircuts;
- fixed percentages.

## 7.2 Protected capital

Protected capital contains every amount that cannot safely be treated as discretionary surplus.

Conceptually:

```text
ProtectedCapital =
    CrystallizedLiabilities
  + WorstCaseExposure
  + SafetyCapital
  + ReserveProtection
  + LockedJackpot
  + MandatoryFutureCosts
```

All promised obligations MUST be covered before discretionary surplus can be used.

## 7.3 Worst-case unresolved exposure

The canonical normal maximum payout is:

```text
500 × ClassPrice
```

For unresolved tickets:

```text
WorstCaseExposure
    =
500 × Σ ClassExposure_i
```

An aggregate `UnresolvedReserve` MAY be retained as a storage optimization only if it is invariantly equal to the class-level exposure sum.

A single aggregate multiplication by `500` MUST NOT be treated as proof of class-aware V3 exposure unless the required equality is enforced.

## 7.4 Effective Pool

The protected executable pool is:

```text
EffectivePool
    =
EEV
  - CrystallizedLiabilities
  - UnresolvedReserve
  - LockedJackpot
```

The protocol MUST reject transitions that make the resulting economic state invalid.

## 7.5 Raw surplus

```text
RawSurplus
    =
max(0, EEV - ProtectedCapital)
```

Raw surplus is the only candidate source for discretionary Jackpot funding and AWRA activity.

---

# 8. Economic gate and post-state validation

Economic safety MUST be evaluated on the **post-transition state**.

For a transition:

```text
S --a--> S'
```

the relevant economic predicate is evaluated against `S'`.

A transaction MUST NOT be accepted merely because the pre-state was solvent.

The architecture requires:

```text
pre-state
   ↓
candidate transition
   ↓
post-state
   ↓
economic gate
   ↓
accept / reject
```

This is particularly important for SALE, because issuing a new unresolved ticket creates additional future exposure.

---

# 9. Dynamic Solvency Kernel

The protocol's economic safety model is expressed through the viability kernel:

```text
K_Ω =
{
  S |
  ∃ policy allowed :
  ∀ω ∈ Ω,
  T(S, a, ω) ∈ K_Ω
}
```

The kernel represents states from which an admissible policy can preserve safety across the defined uncertainty set.

The architecture distinguishes:

- economic state;
- admissible actions;
- uncertainty set;
- transition function;
- policy;
- resulting viability.

The bounded-horizon/computational interpretation is acceptable where explicitly documented and reproducibly validated.

No claim of infinite-horizon proof may be inferred from a bounded computational result.

---

# 10. Ticket classes

The canonical ticket ladder is:

```text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
```

Genesis price:

```text
1 USDM
```

Genesis activation threshold:

```text
>= 4,000 USDM PRE Treasury
```

The class mechanism MUST distinguish:

```text
class price
issued count
unresolved count
class exposure
class cap
saleability
current active class
highest class ever activated
```

Class identity MUST be bound to the ticket's economic state.

A transaction MUST NOT be able to select an economically favorable class merely by supplying an arbitrary class identifier.

---

# 11. Class activation, contraction and history

The class controller MUST maintain two separate concepts.

## 11.1 Activation history

```text
HighestClassEverActivated
```

is monotonic:

```text
H(t+1) >= H(t)
```

It MUST NOT decrease.

## 11.2 Current operating class

```text
CurrentActiveClass
```

is state-derived and MAY decrease when economic safety requires contraction.

The canonical contraction sequence is:

```text
100
 ↓
50
 ↓
25
 ↓
10
 ↓
5
 ↓
3
 ↓
2
 ↓
1
 ↓
HALT
```

Contraction MUST be a consequence of the economic state and policy, not discretionary administrator selection.

---

# 12. SALE architecture

A SALE transition creates an unresolved economic obligation.

Therefore SALE MUST account for:

- ticket class;
- class price;
- issued count;
- unresolved count;
- class exposure;
- unresolved reserve;
- liquidity;
- protected capital;
- post-sale solvency;
- class cap;
- current saleability;
- payment/conversion validity.

The authoritative flow is:

```text
payment / verified conversion
          ↓
candidate ticket state
          ↓
economic state update
          ↓
post-state Economic Gate
          ↓
atomic acceptance
```

The protocol MUST NOT accept a SALE if the resulting state is outside the admissible economic region.

A valid sale MUST update all economically relevant state atomically.

---

# 13. Atomicity

Economic state changes that depend on one another MUST be performed atomically.

Examples include:

```text
ticket issuance
+
payment
+
economic-state update
```

and:

```text
reveal
+
result derivation
+
liability crystallization
```

and:

```text
claim
+
payment
+
claim-state transition
```

Partial execution MUST NOT leave the protocol with a state that falsely represents its economic obligations.

---

# 14. Commit-reveal architecture

The canonical lifecycle is:

```text
secret
  ↓
commitment
  ↓
on-chain binding
  ↓
reveal
  ↓
verified secret
  ↓
Beacon binding
  ↓
deterministic result
  ↓
payout crystallization
```

The commitment MUST bind the relevant game context, including the ticket and protocol/game version as specified by the cryptographic specification.

The backend MUST NOT be the authoritative storage location.

Cardano state is authoritative.

---

# 15. Deterministic game result

The protocol MUST derive game output from validated inputs.

The architecture does not permit user-supplied authoritative values for:

```text
symbols
tier
payout
winner
```

The result derivation MUST be:

- deterministic;
- domain-separated;
- versioned;
- reproducible off-chain;
- independently verifiable.

A frontend or relayer may reproduce the result, but cannot redefine it.

---

# 16. Domain separation

Every cryptographic derivation MUST use an explicit domain.

The domain MUST be:

- deterministic;
- versioned;
- documented;
- identical between authoritative and reference implementations.

Changing a cryptographic domain is a protocol change and requires updated vectors and conformance evidence.

---

# 17. Reveal, crystallization and claim

## 17.1 Reveal

Reveal establishes the deterministic ticket outcome.

For a winning ticket, the payout becomes a crystallized liability at reveal according to the economic specification.

For a loss, no positive prize liability is created.

## 17.2 Claim

CLAIM is an economic settlement transition.

It MUST validate:

- ticket state;
- claimant/current ownership as required;
- revealed result;
- crystallized payout;
- expiry;
- available executable funds;
- correct state transition.

### CLAIM is not BURN

The protocol MUST NOT require ticket NFT burning as an intrinsic condition of CLAIM.

The canonical relationship is:

```text
CLAIM ≠ BURN
```

Burning MAY be supported as a separate lifecycle or supply-management operation where explicitly specified.

The existence or absence of a burn MUST NOT change the mathematical validity of an otherwise valid claim.

---

# 18. Expiry semantics

Expiry is an economic state transition, not merely a frontend timeout.

Before expiry, an eligible winning ticket may retain a claim right.

At expiry:

```text
unclaimed payment commitment
        ↓
dissolved
```

A reveal occurring after expiry MAY preserve historical information where permitted.

However:

```text
late reveal
    ≠
new claim right
```

and:

```text
late reveal
    ≠
recreation of expired liability
```

The protocol MUST ensure that an expired payment commitment cannot be resurrected by a later reveal.

This rule applies independently of whether historical reveal data remains observable.

---

# 19. PrizePool architecture

The PrizePool is protected economic state.

It MUST track, directly or through invariantly derived state:

- total liquidity;
- crystallized liabilities;
- unresolved reserve;
- unresolved ticket count;
- locked Jackpot;
- applicable safety protections.

The PrizePool MUST NOT be treated as unrestricted treasury liquidity.

The architecture is liability-first:

```text
liabilities
    ↓
unresolved exposure
    ↓
safety / reserve protection
    ↓
locked Jackpot
    ↓
mandatory future costs
    ↓
only then discretionary surplus
```

No distribution mechanism may bypass this ordering.

---

# 20. Treasury architecture

Treasury is protocol-controlled.

All game revenues belong to the protocol according to the economic specification.

There is no canonical personal/operator revenue share.

The previous fixed:

```text
75% / 10% / 10% / 5%
```

allocation is **legacy and non-canonical**.

It MUST NOT be used as the V3 economic rule.

Treasury implementation MUST therefore be audited for and migrated away from percentage-based legacy logic where that logic conflicts with the V3 specification.

The definitive V3 architecture is:

```text
protocol revenue
      ↓
protocol treasury
      ↓
obligations / protected requirements
      ↓
economic gate
      ↓
permitted surplus actions
```

A percentage split MAY exist in an implementation or experiment only if separately defined as a non-canonical operational parameter and MUST NOT be represented as the V3 game-economy law.

---

# 21. Jackpot architecture

The Jackpot is separate from ordinary prize obligations.

Funding is constrained by:

```text
NewJackpot <= RawSurplus
```

and remains subject to the Economic Gate.

There is no canonical fixed Jackpot funding percentage.

Jackpot funds are:

- locked;
- protected;
- explicitly stateful;
- not double-counted as ordinary discretionary liquidity.

Jackpot state MUST remain distinguishable from:

- unresolved ticket exposure;
- crystallized prize liabilities;
- ordinary treasury surplus.

---

# 22. Oracle and multi-asset payments

USDM is the canonical economic denomination.

External assets may be accepted through verified conversion.

The conversion layer MUST define:

- authoritative asset identity;
- oracle source;
- timestamp validity;
- price representation;
- rounding;
- validity interval;
- execution cost treatment;
- failure behavior.

A frontend-provided exchange rate is not authoritative.

The architecture MUST NOT treat a convenient market quote as equivalent to a verified protocol oracle.

---

# 23. Economic constants

The frozen V3 baseline includes:

```text
KA = 8
KC = 4
KD = 4
```

Ticket ladder:

```text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
```

Genesis:

```text
1 USDM
```

Genesis Treasury threshold:

```text
>= 4,000 USDM
```

Normal maximum payout:

```text
500 × ticket price
```

These values are normative unless superseded by an explicit new decision.

Implementation work MUST NOT silently alter them.

---

# 24. B1 Beacon architecture

B1 is the current interim operational trust model.

Conceptually:

```text
external observation
        ↓
publisher
        ↓
BeaconRegistry
        ↓
PrizeValidator
```

B1 contains a trust assumption because an authorized publisher is involved.

Therefore:

```text
B1 ≠ fully trustless
B1 ≠ B3
```

B1 may be used for development and controlled operation, but documentation MUST NOT describe it as objectively trustless canonicality.

The publisher's role is operational and explicitly bounded.

---

# 25. B2 committee model

B2 may replace a single publisher with threshold attestation.

Conceptually:

```text
external state
      ↓
N-of-M attestation
      ↓
Cardano anchor
```

B2 reduces single-operator dependence but remains an attestation trust model.

B2 does not by itself prove objective canonicality of the external chain.

---

# 26. B3 canonicality architecture

B3 is the target architecture for external-state trust minimization.

The required property is:

```text
VerifyProof(ref, root, proof) = true
        ⇒
Canonical(ref, root)
```

Acceptance MUST NOT depend on:

- publisher identity;
- relayer identity;
- backend identity;
- first-submission race;
- discretionary operator selection.

A proof generator remains untrusted.

The Cardano-side verifier or authenticated L1 anchor is authoritative.

---

# 27. Canonical checkpoint

External state MUST be bound to a deterministic checkpoint.

A checkpoint SHOULD include:

```text
chain identity
runtime version
block number
block hash
state root
GRANDPA set ID
authority commitment
```

The exact representation MUST be deterministic and versioned.

A checkpoint is evidence until the required canonicality predicate has been verified.

---

# 28. PoC versus proof

Evidence extraction is not equivalent to proof.

A successful adapter that retrieves:

- finalized headers;
- state roots;
- runtime APIs;
- authority lists;

does NOT by itself prove:

- finality;
- ancestry;
- storage inclusion;
- canonicality;
- B3 security.

The project MUST preserve this distinction in all readiness documentation.

---

# 29. Off-chain reference implementation

Off-chain code SHOULD mirror the authoritative economic calculations.

However:

```text
reference implementation
        ≠
economic authority
```

The off-chain implementation MUST be tested against:

- canonical vectors;
- boundary values;
- adversarial values;
- negative cases;
- expiry cases;
- class transitions;
- overflow/rounding boundaries.

Any divergence between on-chain and off-chain behavior is a conformance failure until resolved.

---

# 30. Required V3 implementation mapping

For every normative economic requirement, conformance MUST be demonstrated through:

```text
V3 normative rule
        ↓
exact type field
        ↓
validator enforcement
        ↓
off-chain construction
        ↓
positive test
        ↓
negative test
        ↓
reproducible evidence
        ↓
CONFORMANCE VERDICT
```

A function name, comment, historical TODO status, or partial implementation is insufficient.

---

# 31. Required implementation areas

The architecture currently identifies the following implementation boundaries.

## P0 — Economic state

Implement and verify:

- V3 global economic state;
- per-class state;
- class exposure;
- safety capital;
- reserve protection;
- mandatory future costs;
- current active class;
- highest class ever activated;
- Jackpot state.

## P0 — Economic helpers

Implement and verify:

- ClassPrice;
- ClassExposure;
- aggregate unresolved reserve;
- EEV;
- EffectivePool;
- ProtectedCapital;
- RawSurplus;
- economic gate;
- overflow/rounding behavior.

## P0 — SALE

Implement and verify:

- class binding;
- price;
- issued count;
- unresolved count;
- exposure;
- class cap;
- saleability;
- post-sale solvency;
- atomic payment/state update.

## P1 — Treasury

Remove or isolate legacy percentage logic where it conflicts with V3.

Verify protocol-controlled, liability-first behavior.

## P1 — Lifecycle

Verify:

- reveal;
- crystallization;
- loss;
- claim;
- expiry;
- post-expiry reveal;
- no claim resurrection.

## P2 — Jackpot

Verify:

- raw-surplus funding;
- locked state;
- threshold;
- cycle;
- no double counting.

## P2 — Beacon

Verify the actual B1 path and separately track B3 target requirements.

---

# 32. Security properties

The architecture requires the following properties.

## 32.1 Economic safety

No accepted transition may violate the normative solvency predicates.

## 32.2 Deterministic outcome

Identical validated inputs MUST produce the identical game result.

## 32.3 No operator-selected result

No ordinary operator, publisher, relayer, backend, or frontend may choose the economic outcome.

## 32.4 No liability resurrection

Expiry MUST permanently dissolve the expired payment commitment according to the normative state transition.

## 32.5 No historical rewriting

`HighestClassEverActivated` MUST NOT decrease.

Historical ticket information MUST NOT be rewritten merely to create economic rights.

## 32.6 Atomic settlement

Economic state and the corresponding asset/state transition MUST agree atomically.

---

# 33. Failure model

The architecture assumes failure of off-chain components.

Possible failures include:

- frontend unavailable;
- backend unavailable;
- indexer stale;
- relayer offline;
- external adapter unavailable;
- invalid evidence;
- malformed proof;
- stale oracle;
- invalid transaction construction.

The protocol MUST reject invalid state rather than relying on an operator to repair it.

Where a component is required for liveness but not correctness, that distinction MUST be documented explicitly.

---

# 34. Implementation-status language

Repository documentation MUST use precise status terms.

### DONE

Use only when:

- normative requirement is fixed;
- code enforces it;
- off-chain construction agrees;
- positive and negative tests exist;
- evidence is reproducible;
- no known legacy contradiction remains.

### PARTIAL

Use when meaningful implementation exists but conformance is incomplete.

### GAP

Use when required implementation is absent or materially inconsistent.

### TARGET

Use for a defined future architecture not currently implemented.

### UNKNOWN

Use when available evidence is insufficient to determine behavior.

Historical `IMPLEMENTED` claims MUST NOT override these rules.

---

# 35. Repository and documentation consistency

The following documents MUST remain mutually consistent:

```text
CONSTITUTION.md
      ↓
Game-Economy.md
      ↓
Game-Economy-Specification.md
      ↓
architecture-spec.md
      ↓
state / transition specifications
      ↓
implementation
      ↓
tests / evidence
```

If implementation disagrees with the normative economic model, the implementation is non-conformant unless an explicit new normative decision changes the model.

A legacy implementation MUST NOT silently redefine the specification.

---

# 36. Open-source readiness boundary

Making the repository publicly visible is distinct from declaring a reference implementation frozen.

PRE-RICH may be described as:

```text
OPEN-SOURCE CANDIDATE
```

while implementation conformance remains open.

A final reference freeze requires, at minimum:

- normative economic documents aligned;
- architecture aligned;
- no active legacy economic contradiction;
- V3 economic state mapped to code;
- critical state transitions implemented;
- positive and negative conformance tests;
- reproducible build/test evidence;
- security/adversarial review;
- B1 trust assumptions explicitly documented;
- B3 claims limited to what is actually proven.

The architecture MUST NOT use "mainnet-ready" unless the corresponding readiness gate has been satisfied.

---

# 37. Canonical architecture summary

The PRE-RICH V3 architecture is:

```text
                  EXTERNAL WORLD
                        │
                        ▼
                  OBSERVATION
                        │
                        ▼
                     EVIDENCE
                        │
                ┌───────┴────────┐
                │                │
               B1               B3
          trusted publisher   proof path
                │                │
                └───────┬────────┘
                        ▼
                 VERIFIED INPUT
                        │
                        ▼
              CANONICAL CARDANO STATE
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
       Ticket       Economic       Beacon
       State         State          State
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                DETERMINISTIC RESULT
                        │
                        ▼
                LIABILITY / RESERVE
                        │
                        ▼
                  ECONOMIC GATE
                        │
                        ▼
                ATOMIC SETTLEMENT
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
           CLAIM                 EXPIRE
             │                     │
             ▼                     ▼
       settled liability     dissolved commitment
```

The governing principle is:

> **Truth is established by verifiable state and deterministic rules; economic authority is never delegated to a convenience component.**

---

# 38. Final architectural verdict

**V3 ECONOMIC ARCHITECTURE: SEMANTICALLY CONSOLIDATED**

**V3 IMPLEMENTATION CONFORMANCE: OPEN**

**CURRENT BEACON MODEL: B1 / TRUST-ASSUMED**

**B3: TARGET, NOT CLAIMED AS CURRENTLY COMPLETE**

**LEGACY 75/10/10/5 TREASURY SPLIT: NON-CANONICAL**

**CLAIM ≠ BURN**

**EXPIRY DISSOLVES PAYMENT COMMITMENT; LATE REVEAL CANNOT CREATE CLAIMABILITY**

**OPEN-SOURCE REFERENCE FREEZE: BLOCKED BY IMPLEMENTATION / CONFORMANCE, NOT BY FURTHER ECONOMIC THEORY REDESIGN**

This document is therefore the architectural bridge between the consolidated V3 economic model and the remaining implementation audit.
