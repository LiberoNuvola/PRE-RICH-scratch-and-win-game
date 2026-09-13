# PRE-RICH Roadmap

> **PRE-RICH is not a product to be copied. It is an open protocol to be extended.**  
> **Scratch & Win is only the first implementation.**

## 1. Purpose

This roadmap describes the path from the current research and hardened development state toward a reproducible open-source protocol and, later, production/mainnet readiness.

The roadmap deliberately separates:

- **economic decisions** from implementation work;
- **implemented behavior** from target architecture;
- **computational validation** from on-chain proof;
- **protocol evolution** from application-specific development.

A gap in implementation does not, by itself, reopen a closed economic decision. A change to a frozen economic rule requires an explicit new normative decision.

---

## 2. Current Position

### Economic model
**STATUS: SUBSTANTIALLY CLOSED**

The current normative baseline includes the canonical economic unit, ticket ladder, solvency/exposure model, liability-first protection, expiry semantics, multi-asset conversion principles, and the distinction between active and historically activated classes.

### Implementation
**STATUS: CLOSING / CONFORMANCE IN PROGRESS**

The B1 architecture is substantially implemented. B3 work is progressing toward a stronger trust-minimized target.

### Mainnet
**STATUS: BLOCKED**

The project is not yet a production/mainnet release. Remaining work includes validator/off-chain conformance, settlement, Jackpot/Treasury accounting, expiry edge cases, adversarial testing, and final release assurance.

### Open-source release
**STATUS: CAN BE PREPARED BEFORE MAINNET**

Open source does not mean finished. The public repository must make the current state, limitations, trust assumptions, and unfinished work unambiguous.

---

# 3. Roadmap Phases

## Phase 0 — Open-Source Foundation

**Goal:** make the project understandable and reproducible to an external contributor without pretending that mainnet readiness has been reached.

### Deliverables

- [x] Public-facing README
- [ ] ROADMAP
- [ ] WHITEPAPER
- [ ] CONTRIBUTING
- [ ] SECURITY
- [ ] CODE_OF_CONDUCT
- [ ] GOVERNANCE
- [ ] PROJECT-STATUS
- [ ] Documentation index / source hierarchy
- [ ] License decision
- [ ] Repository metadata and contribution templates
- [ ] Reproducible test/build instructions

### Gate

A third party should be able to answer:

1. What is PRE-RICH?
2. Why does it exist?
3. What is Scratch & Win's role?
4. What is already implemented?
5. What is not implemented?
6. Where are the normative rules?
7. How can I contribute?

---

# 4. Phase 1 — Economic and Specification Freeze

**Goal:** maintain one coherent normative economic baseline.

### Work

- [x] Canonical USDM economic unit
- [x] Genesis reference
- [x] Canonical ticket ladder: `1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM`
- [x] Maximum normal payout: `500×` ticket price
- [x] Worst-case exposure model: `500 × P × N`
- [x] Liability-first protection
- [x] Effective Pool model
- [x] CurrentActiveClass vs HighestClassEverActivated
- [x] Automatic contraction principle
- [x] Multi-asset conversion principle
- [x] Oracle validity principles
- [ ] Finalize remaining explicit policy parameters:
  - Jackpot payout mode
  - exact expiry duration
  - exact hysteresis values/rules
  - future Jackpot funding rate, if required
- [ ] Align all public economic documents with the Decision Register

### Gate

No contradictory economic rule remains in the canonical public documentation.

---

# 5. Phase 2 — Dynamic Solvency Kernel

**Goal:** turn the economic viability model into the operational decision layer used by the protocol.

### Work

- [ ] Implement Dynamic Solvency Kernel
- [ ] Integrate class activation/suspension logic
- [ ] Integrate unresolved reserve
- [ ] Integrate worst-case exposure
- [ ] Integrate Jackpot protection
- [ ] Integrate safety floor
- [ ] Integrate complete fee/OPEX surface
- [ ] Eliminate double counting between hard barriers and statistical reserve
- [ ] Use integer-safe economic arithmetic throughout
- [ ] Produce deterministic reference vectors
- [ ] Produce adversarial reference vectors

### Gate

For every economically relevant transition, the Economic Gate must deterministically answer whether the resulting state is viable.

---

# 6. Phase 3 — State Transition Conformance

**Goal:** establish agreement between economic specification, off-chain implementation, validator logic, and tests.

### Required transitions

- [ ] SALE
- [ ] REVEAL_LOSS
- [ ] REVEAL_WIN
- [ ] CLAIM
- [ ] EXPIRE
- [ ] historical/late reveal behavior

### Required properties

- [ ] atomicity
- [ ] exact value conservation
- [ ] exact liability accounting
- [ ] correct class enforcement
- [ ] correct reserve/exposure enforcement
- [ ] no post-expiry creation of claimable rights
- [ ] no double claim
- [ ] no result selection after purchase
- [ ] no unauthorized economic state mutation

### Gate

Reference model, off-chain code, validator expectations, and test fixtures agree for the same transition vectors.

---

# 7. Phase 4 — B3 Randomness and Board Mapping

**Goal:** complete the trust-minimized randomness path and prove exact board derivation.

### Work

- [ ] Commit-reveal conformance
- [ ] exact randomness derivation
- [ ] exact board mapping
- [ ] adversarial malformed commitment tests
- [ ] reveal timing boundary tests
- [ ] replay resistance
- [ ] mismatch rejection
- [ ] separation between B1 authorized-relayer assumptions and B3 target

### Gate

The randomness pipeline is reproducible and independently verifiable from its public inputs.

---

# 8. Phase 5 — Settlement, Treasury and Jackpot

**Goal:** close the real-value accounting path.

### Settlement

- [ ] canonical USDM settlement
- [ ] supported non-USDM settlement
- [ ] verified conversion
- [ ] exact unit handling
- [ ] reject incorrect asset valuation
- [ ] eliminate accidental NFT valuation
- [ ] exact remainder handling

### Treasury

- [ ] complete revenue accounting
- [ ] liability-first ordering
- [ ] safety capital protection
- [ ] reserve protection
- [ ] distributable surplus semantics
- [ ] deterministic remainder destination
- [ ] no discretionary founder/developer/admin economic share

### Jackpot

- [ ] formal funding rule
- [ ] locked Jackpot accounting
- [ ] formal payout rule
- [ ] reset/continuation rule
- [ ] protection from ordinary prize liabilities
- [ ] conformance tests

### Gate

Every state transition involving value has a deterministic before/after accounting proof.

---

# 9. Phase 6 — Oracle and Multi-Asset Operations

**Goal:** make external asset valuation explicit, bounded and verifiable.

### Work

- [ ] singleton oracle identity
- [ ] asset identity binding
- [ ] publisher authorization
- [ ] timestamp validity
- [ ] freshness limits
- [ ] decimals handling
- [ ] non-negative price constraint
- [ ] deterministic rounding / ceiling rules
- [ ] invalid oracle rejection
- [ ] liquidation/conversion edge cases
- [ ] multi-asset conformance tests

### Gate

No external price input can silently become economic authority without satisfying the protocol's verification rules.

---

# 10. Phase 7 — Event-Driven Infrastructure

**Goal:** minimize external operational dependencies without confusing liveness infrastructure with economic authority.

### Work

- [ ] event-driven relayer benchmark
- [ ] failure model
- [ ] retry model
- [ ] liveness model
- [ ] duplicate event handling
- [ ] recovery after downtime
- [ ] clear B1 trust boundary
- [ ] B3 target separation

### Principle

> The relayer may submit evidence or transactions. It must not become the economic authority.

---

# 11. Phase 8 — Security and Adversarial Validation

**Goal:** test the protocol against malicious rather than merely valid inputs.

### Required attack classes

- [ ] price outside canonical ladder
- [ ] inactive/suspended class purchase
- [ ] forged or invalid oracle
- [ ] forged Pool datum
- [ ] wrong singleton
- [ ] altered reserve
- [ ] altered Jackpot
- [ ] double claim
- [ ] replayed reveal
- [ ] malformed commitment
- [ ] wrong randomness
- [ ] wrong board mapping
- [ ] post-expiry reveal
- [ ] expiry boundary
- [ ] mixed-class solvency stress
- [ ] incorrect settlement asset
- [ ] incorrect unit conversion
- [ ] concurrent claims
- [ ] concurrent sales
- [ ] treasury accounting manipulation

### Gate

Security claims are backed by executable tests or explicitly identified as unresolved.

---

# 12. Phase 9 — On-Chain Conformance

**Goal:** prove that the implemented validator behavior matches the reference economic model.

This phase is deliberately distinct from TypeScript mirrors and simulations.

### Work

- [ ] real Plutus execution tests
- [ ] emulator/integration tests
- [ ] validator datum/redeemer conformance
- [ ] transaction balancing
- [ ] multi-input/multi-output cases
- [ ] concurrency/atomicity
- [ ] malicious transaction rejection
- [ ] boundary conditions
- [ ] artifact/CBOR verification
- [ ] final deployment artifacts

### Gate

The protocol passes the defined on-chain conformance suite at a pinned commit.

---

# 13. Phase 10 — Mainnet Readiness

**Goal:** determine whether PRE-RICH is actually ready for production deployment.

### Release checklist

- [ ] economic freeze
- [ ] specification freeze
- [ ] validator conformance
- [ ] settlement conformance
- [ ] Jackpot/Treasury conformance
- [ ] randomness conformance
- [ ] oracle conformance
- [ ] expiry conformance
- [ ] adversarial suite
- [ ] reproducible build
- [ ] reproducible tests
- [ ] security review
- [ ] dependency review
- [ ] deployment rehearsal
- [ ] emergency/incident procedures
- [ ] governance procedures
- [ ] release artifacts
- [ ] final mainnet readiness decision

### Gate

**MAINNET: READY** only when the evidence supports the claim.

---

# 14. Community Expansion Track

This track runs alongside the technical roadmap.

PRE-RICH is intentionally designed to become larger than its first application.

## Core

Contributors can improve:

- Economic Kernel
- Solvency
- State Machines
- Verification
- Randomness
- Oracle architecture
- Settlement
- Governance
- Security

## Protocol Extensions

The community can propose:

- new economic modules
- new participation mechanisms
- new state machines
- new asset integrations
- new governance mechanisms
- new verification mechanisms

## Applications

The long-term scope includes applications beyond Scratch & Win, provided they remain compatible with the PRE-RICH constitutional principles.

Possible directions include:

- cooperative economic systems
- community resource allocation
- marketplaces
- mutual systems
- alternative games
- collective funding mechanisms
- decentralized coordination systems
- other programmable economic applications

### Guiding principle

> **Build with PRE-RICH, rather than rebuilding PRE-RICH.**

The goal is one evolving protocol with many contributors and applications—not a collection of disconnected clones.

---

# 15. Documentation Authority

PRE-RICH uses a strict source hierarchy:

1. **Constitution / Decision Register**
2. **Canonical economic specifications**
3. **Architecture specifications**
4. **Implementation**
5. **Tests and proofs**
6. **Experimental/reference models**
7. **Historical material**

A lower-level implementation gap does not automatically change a higher-level normative decision.

A new economic rule requires an explicit normative decision.

---

# 16. Status Vocabulary

Public documentation should use these terms consistently:

- **CLOSED** — normative decision is frozen.
- **CLOSING** — decision/specification is stable and implementation work remains.
- **OPEN** — a genuine decision or research question remains unresolved.
- **TARGET** — intended future architecture/behavior.
- **IMPLEMENTATION GAP** — model is defined but implementation does not yet conform.
- **EXPERIMENTAL** — useful evidence, but not normative.
- **HISTORICAL** — retained for traceability, not current authority.

---

# 17. Near-Term Priority Order

The immediate sequence is:

1. Open-source documentation foundation
2. Economic documentation alignment
3. Dynamic Solvency Kernel
4. SALE / REVEAL / CLAIM / EXPIRE conformance
5. B3 randomness and exact board mapping
6. Settlement
7. Treasury / Jackpot
8. Oracle / multi-asset conformance
9. Adversarial validation
10. Real on-chain conformance
11. Mainnet readiness audit

---

## 18. The Long-Term Objective

The objective is not merely to launch Scratch & Win.

Scratch & Win is the first demanding test of a larger idea:

> **Can transparent economic rules, programmable constraints, solvency mechanisms, collective participation and blockchain verification be combined into an extensible protocol that a community can continuously improve?**

PRE-RICH is being built to answer that question in public, through code, mathematics, experiments, verification and community contribution.
