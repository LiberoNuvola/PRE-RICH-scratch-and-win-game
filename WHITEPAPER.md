# PRE-RICH — White Paper

**Open Protocol for Transparent, Programmable and Resilient Economic Systems**

**Version:** 0.6.1 — Release Candidate
**Date:** September 2026  
**Status:** Research / Active Development — Open-Source Candidate — Not Mainnet-Ready

> **Implementation status:** for the distinction between documented rules, implemented behavior, and verified evidence, see the [Economic Algorithm Conformance Matrix](ECONOMIC-ALGORITHM-CONFORMANCE-MATRIX.md) and the [Constitution Gap Matrix](CONSTITUTION-GAP-MATRIX.md).
>
> The Conformance Matrix tracks implementation evidence; it does not create or modify economic policy. This White Paper does not upgrade an implementation gap into completed work.

> **PRE-RICH is an open protocol to be extended, not a product to be copied. Scratch & Win is its first implementation.**

---

## Project Status at a Glance

| Area | Current status |
|---|---|
| Constitutional / normative economic baseline | **Established; selected policy parameters remain explicitly open** |
| B1 architecture | **Substantially implemented** |
| Cryptographic core | **Final validation** |
| State-machine conformance | **In progress** |
| Economic implementation conformance | **Open / closing** |
| B3 / canonical Beacon | **Target / in progress** |
| Independent external security audit | **Not completed** |
| Mainnet | **Not ready** |

> **Open-source publication and mainnet readiness are separate milestones.** Publishing the protocol does not imply production readiness.

## Protocol at a Glance

| Element | Current baseline / status |
|---|---|
| Canonical economic unit | USDM |
| Ticket classes | 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM |
| Genesis | 1 USDM; verified PRE bootstrap threshold ≥ 4,000 USDM |
| Maximum normal payout | 500 × ticket price |
| Accounting | Liability / protection-first |
| Sale | Atomic issuance + payment + unresolved reservation |
| Result | Deterministic from verified inputs |
| Claim | Non-custodial; frozen payout is not recalculated |
| Expiry | No new claim/liability after expiry; late reveal cannot revive a right |
| Current Beacon | B1 — Authorized Publisher |
| Target Beacon | B3 — publisher-independent canonicality |
| Mainnet | Not ready |

## Documentation Map — Start Here

This White Paper is the orientation layer. It explains the protocol without overriding its normative sources.

### Recommended Reading Paths

- **New to PRE-RICH:** White Paper → Constitution → Game Economy → Game Economy Specification
- **Understand the Economic Algorithm:** White Paper → Game Economy → Game Economy Specification → Economic Algorithm → Gap Matrix → tests / proofs
- **Audit implementation conformance:** Constitution → specifications → Gap Matrix → architecture → implementation → tests / evidence
- **Contribute:** README → CONTRIBUTING → relevant specification → implementation → tests / proofs

### Core Documents

1. [Constitution](docs/CONSTITUTION.md) — foundational principles, invariants and authority limits.
2. [Game Economy](docs/Game-Economy.md) — authoritative normative economic policy.
3. [Game Economy Specification](docs/Game-Economy-Specification.md) — implementation-facing economic definitions and transition requirements.
4. [Economic Algorithm](docs/ECONOMIC-ALGORITHM.md) — ordered execution logic, preconditions, postconditions, failure semantics and proof obligations.
5. [Architecture Specification](docs/architecture-spec.md) — technical boundaries and trust model.
6. [Beacon Trust Model](docs/beacon-trust-model.md) — current B1 model and B3 evolution.
7. [Constitution Gap Matrix](docs/CONSTITUTION-GAP-MATRIX.md) — current implementation/conformance truth.

> **Documentation principle:** the White Paper explains; normative documents define; the implementation realizes; tests and proofs provide evidence.

---

## Abstract

PRE-RICH is an open-source protocol framework for designing economic systems whose important rules can be expressed explicitly, inspected publicly and enforced through deterministic state transitions.

The project starts from a concrete Cardano implementation, **Scratch & Win**, because a real economic system provides a useful environment in which to test principles such as solvency, liability management, deterministic outcomes, non-custodial settlement and resistance to discretionary intervention.

The long-term objective is broader than the first application. PRE-RICH is intended to provide reusable economic and verification primitives that can be extended into other applications and participation models.

The protocol's central principle is simple:

> **Economic truth should derive from verifiable rules and evidence, not from discretionary authority.**

PRE-RICH is therefore designed around a strict distinction between constitutional principles, specifications, implementation and evidence. A property is not considered complete merely because it is described or simulated: release-grade claims require the corresponding implementation and validation evidence.

---

## 1. Problem

Many digital economic systems depend on trusted operators for one or more critical functions:

- determining outcomes;
- maintaining balances;
- deciding whether a payment is valid;
- calculating liabilities;
- deciding whether a system remains solvent;
- selecting or publishing external data;
- resolving disputes.

This creates a gap between the rules users believe they are interacting with and the rules that are actually enforced.

PRE-RICH approaches the problem differently.

Instead of treating economic policy as something administered by an operator, it treats important economic rules as part of the protocol itself.

The desired progression is:

**Trust the operator**  
→ **Inspect the rules**  
→ **Inspect the state**  
→ **Verify the transition**  
→ **Verify the evidence**

---

## 2. Design Objective

PRE-RICH aims to make economic systems:

### Transparent

Rules, state transitions and economic constraints should be publicly inspectable.

### Deterministic

Where a result can be derived from authenticated inputs, equivalent inputs should produce the same result.

### Solvent

The system should account explicitly for existing liabilities, unresolved exposure and protected reserves before permitting additional economic exposure.

### Non-custodial

Users should retain control of their assets and rights except where an explicitly specified protocol transition requires movement of value.

### Resistant to discretionary authority

Frontend, backend, relayer and administrative components should not be able to redefine economic truth.

### Extensible

The protocol should be capable of supporting multiple applications rather than becoming permanently identified with its first implementation.

### Auditable

Normative claims should be traceable to specifications, implementation and reproducible evidence.

---

## 3. Constitutional Model

PRE-RICH uses the following normative hierarchy:

**CONSTITUTION**  
↓  
**SPECIFICATIONS**  
↓  
**IMPLEMENTATION**  
↓  
**TESTS / PROOFS**

The Constitution defines what must be true.

Specifications define how those properties are represented and constrained.

The implementation realizes the specifications.

Tests and proofs provide evidence that the implementation satisfies the required properties.

A lower layer cannot silently override a higher layer.

This hierarchy also provides a discipline for development: an implementation gap does not automatically reopen a settled economic decision. If the normative rule is already closed, the implementation should be brought into conformance unless an explicit new decision changes the rule.

---

## 4. Economic Authority

The intended economic authority of PRE-RICH is protocol-controlled state and verifiable evidence.

A browser is not economic authority.

A backend is not economic authority.

A relayer is not economic authority.

An off-chain database is not economic authority.

An API endpoint is not economic authority.

An external data provider is not economic authority by itself.

These components may observe state, transport data, construct transactions or submit evidence. The protocol must determine whether the evidence is valid.

This distinction is particularly important for the Beacon architecture.

### B1

The current Scratch & Win architecture uses an **Authorized Publisher** model.

B1 therefore retains an explicit trust assumption around the authorized Beacon publisher.

### B3

The target architecture is a publisher-independent canonical Beacon with stronger verification and finality guarantees.

B3 is a target architecture and must not be represented as already achieved merely because a proof-of-concept exists.

---

## 5. First Implementation: Scratch & Win

Scratch & Win is the first concrete implementation used to exercise PRE-RICH principles on Cardano.

The implementation uses:

- Cardano native assets / NFT tickets;
- commit-reveal;
- deterministic outcome derivation;
- Beacon-based randomness;
- on-chain state transitions;
- liability-first economic accounting;
- non-custodial claims;
- protocol-controlled settlement.

A simplified lifecycle is:

**SALE**  
↓  
**COMMIT**  
↓  
**REVEAL**  
↓  
**CRYSTALLISE**  
↓  
**CLAIM**

with expiry and invalid/late transitions explicitly constrained by protocol rules.

The intended result function is conceptually:

**validated Beacon + player secret + ticket identity + protocol parameters → deterministic outcome**

The precise implementation and cryptographic constraints belong to the specifications and validator code.

---

## 6. Commit-Reveal

The commit-reveal mechanism separates commitment from revelation.

Before the result can be known, the player commits to a secret bound to the relevant ticket context.

At reveal, the protocol verifies the commitment and combines the authenticated inputs with the validated Beacon and ticket identity.

The objective is to prevent the player or an intermediary from choosing a favorable result after observing the relevant randomness.

Commit-reveal is therefore not merely a frontend feature. Its security property depends on the actual binding enforced by the protocol transition.

---

## 7. Deterministic Outcomes

The protocol derives the ticket outcome from authenticated inputs rather than from an operator selecting a result.

The derivation determines the symbols, tier and corresponding payout according to the applicable game rules.

The payout is crystallised at reveal.

Once crystallised, a future change in pool conditions must not retroactively change the payout of that already-resolved ticket.

This separation is fundamental:

**result determination → economic crystallisation → later claim**

Claim should validate an already-established economic right rather than recalculate the game.

---

## 8. Canonical Economic Unit

The current normative economic unit is **USDM**.

USDM is the reference unit for:

- ticket price;
- prize value;
- economic thresholds;
- exposure;
- reserve;
- safety capital;
- pending liabilities;
- Jackpot;
- class activation.

Other supported assets may be used for payment through a verified conversion into the canonical economic unit.

The user interface does not constitute economic authority.

Conversion therefore requires validated asset identity, applicable price information, freshness/validity checks and deterministic rounding according to the specification.

---

## 9. Economic Classes

The current economic ladder is:

**1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM**

Genesis is the 1 USDM class.

A higher class is not enabled merely because an operator chooses to expose it.

The protocol determines the currently safe class from verified economic state.

Conceptually:

`CurrentActiveClass = highest class whose verified post-sale state remains safe`

The calculation must consider the relevant economic constraints, including:

- available liquidity;
- pending winning liabilities;
- unresolved-ticket reserve;
- locked Jackpot liquidity;
- safety floor;
- deterministic exposure limits;
- per-class limits.

The protocol also distinguishes:

`CurrentActiveClass`

from:

`HighestClassEverActivated`

The current class may contract when conditions deteriorate. The historical maximum class reached is not retroactively erased.

---

## 10. Exposure and Solvency

PRE-RICH distinguishes statistical exposure modelling from deterministic protection.

### Statistical reserve

For unresolved tickets, a statistical reserve can model expected payout and variability.

A reference model uses:

`UnresolvedReserve(N) = N × μ + Z × σ × sqrt(N)`

where:

- `N` = unresolved tickets;
- `μ` = expected payout;
- `σ` = payout standard deviation;
- `Z` = selected confidence coefficient.

These modelling parameters are not themselves an absolute payment guarantee.

### Deterministic exposure

The protocol also recognizes the maximum payout permitted by the game rules.

For a class with ticket price `P` and `N` unresolved tickets:

`WorstCaseExposure(P,N) = 500 × P × N`

because the current maximum normal payout is 500 times the ticket price.

This deterministic limit provides a hard boundary for additional exposure.

The essential distinction is:

**statistical reserve estimates risk; deterministic limits constrain protocol exposure.**

---

## 11. Liability-First Accounting

A core PRE-RICH principle is that economically committed value must not be counted again as freely distributable value.

The conceptual effective pool is:

`EffectivePool = TotalLiquidity − PendingWinningLiabilities − UnresolvedTicketReserve − LockedJackpotLiquidity`

`UnresolvedTicketReserve` denotes the protocol's recorded unresolved reservation state. It must not be confused with the statistical risk model `UnresolvedReserve(N) = N·μ + Z·σ·√N`. The statistical reserve estimates risk and does not by itself replace deterministic worst-case protection.

Therefore:

PendingWinningLiabilities + UnresolvedTicketReserve + LockedJackpotLiquidity ≤ TotalLiquidity

and:

`EffectivePool ≥ 0`

This model is designed to prevent double counting between available capital and already committed economic obligations.

The exact implementation of these constraints is a release-critical conformance question.

---

## 12. Safety Circuit Breaker

When economic safety deteriorates, the system should reduce new exposure automatically.

The current contraction sequence is:

**100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT**

Suspension applies to new sales.

It does not:

- invalidate existing tickets;
- reduce crystallised payouts;
- rewrite historical results;
- retroactively alter already-established rights.

Activation and suspension use separate thresholds in the intended hysteresis model, reducing unnecessary oscillation around a boundary.

The exact numerical hysteresis parameters remain a policy/conformance item until explicitly frozen.

---

## 13. Sale Atomicity

An economically valid sale must bind the relevant economic operations atomically.

Conceptually:

**ticket mint + payment + PrizePool reservation**

must occur within one transaction or an equivalent on-chain mechanism that prevents economically unreserved tickets from being created.

Off-chain bookkeeping cannot substitute for this economic invariant.

---

## 14. Treasury

Game revenue is intended to flow into the protocol-controlled Treasury.

The constitutional direction is:

**PLAYER → PROTOCOL TREASURY → PROTOCOL-CONTROLLED CATEGORIES**

rather than discretionary personal allocations.

The current Constitution explicitly rejects a discretionary economic share for team, founder, developer or administrator.

Treasury accounting must nevertheless distinguish operational execution from economic authority. A relayer or maintenance component may perform an operational function without thereby acquiring an automatic economic entitlement.

---

## 15. PrizePool and Jackpot

PrizePool is a protocol-controlled economic component.

The model tracks, as applicable:

- liquidity;
- unresolved reserve;
- unresolved count;
- pending liabilities;
- locked Jackpot liquidity;
- economic thresholds;
- class state.

The Jackpot is separately protected from ordinary pool accounting.

The current normative direction establishes the protection relationship and maximum payout scale, while some Jackpot lifecycle policy details remain to be finalized, including the exact funding and payout/reset mechanism.

These unresolved policy points are intentionally disclosed rather than silently presented as settled.

---

Any numeric Jackpot maturity scales or ladders appearing in the Economic Algorithm are **reference constructs** until separately adopted in the normative economic specifications. They are not automatic protocol law merely because they appear in the Algorithm document.

## 16. Expiry

Expiry is an economic boundary, not merely a user-interface timeout.

After a ticket expires, a late reveal must not create a new claim or new economic liability.

Historical information may remain relevant for auditability, but an expired right cannot be revived by a late reveal.

The final implementation must therefore ensure that post-expiry behavior is economically inert with respect to new claimability and liability creation.

---

## 17. Non-Custodial Claims

A valid claim should verify the already-crystallised ticket state and transfer the established economic entitlement to the current rightful owner according to the protocol rules.

The claim path should verify, as applicable:

- ticket ownership;
- ticket identity;
- revealed state;
- crystallised payout;
- expiry;
- required authorization/signature;
- exact economic transitions.

The payout must not be recalculated from mutable economic conditions.

Winning tickets may remain collectible after claim where the implementation preserves that property.

---

## 18. Randomness and Beacon Architecture

Randomness is a core security boundary.

The current B1 model uses an authorized publisher and a Beacon Registry.

The longer-term B3 architecture aims to make Beacon canonicality and publisher independence verifiable through stronger evidence, including GRANDPA finality and appropriate Cardano anchoring.

The project deliberately separates:

- proof-of-concept work;
- current B1 operational behavior;
- future B3 target architecture.

No proof-of-concept is treated as final canonicality without the required verification obligations.

---


## 19. Economic Algorithm — Formal Execution Layer

The **Economic Algorithm** is a first-class protocol artifact. It does not create a second economic policy. It translates the Constitution and normative economic specifications into an explicit, deterministic execution order.

Its role is to make each critical transition auditable by specifying:

- authoritative inputs;
- preconditions;
- deterministic calculations;
- state deltas;
- postconditions;
- fail-closed conditions;
- immutable values after crystallisation;
- evidence required for conformance.

### Authority chain

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

The Algorithm therefore sits between **normative policy** and **implementation**. If an Algorithm statement conflicts with a higher-level normative document, the higher-level document prevails.

### Canonical execution flow

```text
VALIDATED INPUTS
      ↓
CANONICAL PARAMETERS
      ↓
VERIFIED ECONOMIC STATE
      ↓
CLASS / PRICE VALIDATION
      ↓
POST-SALE EXPOSURE
      ↓
LIABILITY + RESERVE + JACKPOT PROTECTION
      ↓
SAFE-STATE / ACTIVE-CLASS CHECK
      ↓
ATOMIC ECONOMIC TRANSITION
      ↓
COMMIT / REVEAL
      ↓
DETERMINISTIC RESULT
      ↓
CRYSTALLISE FROZEN PAYOUT
      ↓
CLAIM FROZEN RIGHT
      ↓
RELEASE / UPDATE LIABILITIES EXACTLY ONCE
```

### Universal transition contract

Every critical economic transition follows:

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

If a mandatory condition fails, the transition fails closed. Partial economic success is not an intended protocol state.

### What the Algorithm does not decide

The Economic Algorithm does **not** independently invent:

- new economic policy;
- ticket prices outside the canonical ladder;
- an unfrozen Jackpot allocation rate;
- an exact expiry duration while that parameter remains open;
- exact numerical hysteresis values while those remain unfrozen;
- a B3 trust model before B3 verification exists;
- discretionary winners, Jackpot recipients or special-case solvency exceptions.

These belong to the appropriate normative layer.

### Distinguishing reserve, exposure and available liquidity

The protocol uses related but non-interchangeable concepts:

```text
Statistical Reserve
    = risk model

Deterministic Exposure
    = worst-case protection

Effective Pool
    = economically available liquidity after protected obligations
```

The statistical reserve must not be presented as a substitute for deterministic worst-case protection.

### Canonical functions

```text
WorstCaseExposure(P, N) = 500 × P × N

UnresolvedReserve(N) = N × μ + Z × σ × √N

EffectivePool =
    TotalLiquidity
  − PendingWinningLiabilities
  − UnresolvedTicketReserve
  − LockedJackpotLiquidity
```

The implementation-facing details, transition contracts, failure matrix and proof obligations are maintained in the [Economic Algorithm](docs/ECONOMIC-ALGORITHM.md).


## 20. Verification Philosophy

PRE-RICH distinguishes several kinds of evidence.

### Reference-model validation

Useful for discovering economic and state-machine errors.

### Unit and property tests

Useful for checking deterministic functions and invariants.

### Adversarial tests

Useful for testing malformed, forged or hostile transitions.

### Validator/on-chain evidence

Required to demonstrate that the actual enforcement layer rejects invalid economic states.

### Integration evidence

Required to demonstrate that frontend, off-chain builders, scripts and validators agree on the same protocol.

A passing TypeScript model test is therefore not equivalent to a proof that the corresponding Plutus validator enforces the same rule.

---

## 21. Current Development State

As of September 2026:

- the normative economic baseline is established, while selected policy parameters remain explicitly open;
- the B1 architecture is substantially implemented;
- the cryptographic core has undergone hardening and is in final validation;
- the state-machine core is undergoing final conformance work;
- the economic implementation still has identified conformance gaps;
- Jackpot lifecycle details are not fully frozen;
- B3 remains an architectural target/in-progress path;
- independent external security audit has not been completed;
- the project is **not mainnet-ready**.

The project therefore makes no claim that the current repository represents a production-safe or mainnet-ready financial system.

---

## 22. Open-Source Model

PRE-RICH is intended to evolve as one open protocol.

The preferred community model is:

### Constitutional Core

Foundational principles and invariants.

### Protocol Core

The current economic and technical rules, evolvable through explicit governance.

### Extensions

New economic modules, participation mechanisms, state machines, asset integrations, verification mechanisms and related capabilities.

### Applications

Concrete systems built using PRE-RICH, beginning with Scratch & Win.

This structure allows experimentation without losing protocol identity.

A fork remains technically possible. What distinguishes conformant PRE-RICH evolution is adherence to the applicable constitutional and protocol requirements rather than the mere reuse of source code.

---

## 23. Roadmap

The roadmap is intentionally divided into different horizons.

### Open-source foundation

Publish and organize the Constitution, economic specifications, architecture, Gap Matrix, README, roadmap, contribution and security guidance, license and reproducible development instructions.

### Scratch & Win release candidate

Close remaining economic and state-machine conformance gaps, finalize the required policy decisions, complete adversarial and integration evidence and establish reproducible release artifacts.

### Mainnet readiness

Independent security review, prolonged adversarial testnet operation, final parameter freeze, deployment rehearsal and explicit go/no-go decision.

### PRE-RICH evolution

B3 canonical Beacon integration, additional economic modules, new applications, participation mechanisms and protocol extensions.

Completing the full long-term roadmap is **not** a prerequisite for publishing PRE-RICH as open source.

---

## 24. Status Vocabulary

PRE-RICH uses explicit status terminology:

- **CLOSED** — normative decision is settled.
- **CLOSING** — implementation/evidence is being brought into conformance.
- **IMPLEMENTED / VERIFIED** — implemented and supported by required evidence.
- **IMPLEMENTATION GAP** — specified behavior is not fully enforced.
- **TARGET** — intended future architecture.
- **EXPERIMENTAL** — research or reference work, not normative.
- **HISTORICAL** — retained for traceability, not current authority.
- **OPEN** — genuinely unresolved decision or requirement.

This vocabulary is intended to prevent both overclaiming and unnecessary reopening of settled decisions.

---

## 25. What PRE-RICH Does Not Claim

PRE-RICH does not claim:

- that B1 is trustless in the same sense as the future B3 architecture;
- that a proof-of-concept is equivalent to production verification;
- that statistical reserve parameters are absolute guarantees;
- that the current repository is mainnet-ready;
- that unresolved implementation gaps are already solved;
- that future protocol extensions are already implemented;
- that the protocol guarantees financial returns.

The project is deliberately explicit about its limitations.

---

## 26. Conclusion

PRE-RICH proposes a different way to think about decentralized economic systems.

The central question is not simply:

> **Who operates the system?**

It is:

> **Which economic facts can the system verify for itself?**

By separating constitutional principles from specifications, implementation and evidence, PRE-RICH aims to make economic systems more inspectable and less dependent on discretionary authority.

Scratch & Win is the first laboratory in which these principles are being made concrete.

The longer-term objective is an open protocol that communities can extend into different forms of economic coordination without rebuilding the foundational mechanisms from scratch.

**Build with PRE-RICH, rather than rebuilding PRE-RICH.**

---

## Documentation Authority

For implementation-level truth, consult the repository documentation in this order:

1. **Constitution / Decision Register** — foundational authority
2. **Canonical economic specifications** — normative economic rules
3. **Economic Algorithm** — formal execution logic
4. **Architecture specifications** — technical design and trust boundaries
5. **Implementation** — actual code
6. **Tests / proofs / evidence** — validation
7. **Gap Matrix** — current conformance status
8. **Experimental and historical material** — traceability only

This White Paper is explanatory. It does not override the Constitution or normative economic specifications.

---

## Document Set Alignment

This White Paper **v0.6.1** belongs to the following aligned document set:

- Economic Algorithm **v0.3.1**
- Economic Algorithm Conformance Matrix **v0.1.1**

The document set must be evaluated against the repository commit and release tag under which it is published. Outdated copies must not be used to infer current protocol status.

## Disclaimer

This document reflects the state of the PRE-RICH protocol and its documentation as of September 2026. It does not constitute an offer, financial advice, or any guarantee of future performance, completeness, or mainnet readiness. The software remains under active development.
