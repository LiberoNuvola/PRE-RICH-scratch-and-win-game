# PRE-RICH — White Paper

**Open Protocol for Transparent, Programmable and Resilient Economic Systems**

**Version:** 0.6.1 — Release Candidate
**Date:** September 2026
**Status:** Research / Active Development — Open-Source Candidate — Not Mainnet-Ready

> **Implementation status:** for the distinction between documented rules, implemented behavior, and verified evidence, see the [Economic Algorithm Conformance Matrix](docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md) and the [Constitution Gap Matrix](docs/CONSTITUTION-GAP-MATRIX.md).
>
> The Conformance Matrix tracks implementation evidence; it does not create or modify economic policy.

> **PRE-RICH is an open protocol to be extended, not a product to be copied. Scratch & Win is its first implementation.**

## Project Status at a Glance

| Area | Current status |
|---|---|
| Constitutional / normative economic baseline | **Closed; only the explicitly listed policy set remains open** |
| B1 architecture | **Substantially implemented** |
| Cryptographic core | **Final validation** |
| State-machine conformance | **In progress** |
| Economic implementation conformance | **Open / closing** |
| B3 / canonical Beacon | **Target / in progress** |
| Independent external security audit | **Not completed** |
| Mainnet | **Not ready** |

> Open-source publication and mainnet readiness are separate milestones.

## Protocol at a Glance

| Element | Current baseline / status |
|---|---|
| Canonical economic unit | USDM |
| Ticket classes | 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM |
| Genesis | 1 USDM; verified PRE bootstrap threshold >= 4,000 USDM |
| Maximum normal payout | 500 × ticket price |
| Accounting | Liability / protection-first |
| Sale | Atomic issuance + payment + unresolved reservation |
| Result | Deterministic from verified inputs |
| Claim | Frozen payout is not recalculated |
| Expiry | Expired economic right is extinguished; late reveal cannot create claim/liability |
| Current Beacon | B1 — Authorized Publisher |
| Target Beacon | B3 — publisher-independent canonicality |
| Mainnet | Not ready |

## Documentation Map

This White Paper is the orientation layer. It explains the protocol without overriding normative sources.

Recommended reading:

- **New to PRE-RICH:** White Paper → Constitution → Game Economy → Game Economy Specification
- **Economic Algorithm:** White Paper → Game Economy → Game Economy Specification → Economic Algorithm → Conformance Matrix
- **Implementation audit:** Constitution → specifications → Gap Matrix → architecture → implementation → tests/evidence
- **Contribute:** README → CONTRIBUTING → relevant specification → implementation → tests

Core documents:

1. `docs/CONSTITUTION.md`
2. `docs/Game-Economy.md`
3. `docs/Game-Economy-Specification.md`
4. `docs/ECONOMIC-ALGORITHM.md`
5. `docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md`
6. `docs/CONSTITUTION-GAP-MATRIX.md`
7. `docs/architecture-spec.md`
8. `docs/beacon-trust-model.md`

> **Documentation principle:** the White Paper explains; normative documents define; the implementation realizes; tests and proofs provide evidence.

## Abstract

PRE-RICH is an open-source protocol framework for designing economic systems whose important rules can be expressed explicitly, inspected publicly and enforced through deterministic state transitions.

The project starts from a concrete Cardano implementation, **Scratch & Win**, as a laboratory for solvency, liability management, deterministic outcomes, non-custodial settlement and resistance to discretionary intervention.

The long-term objective is broader than the first application: reusable economic and verification primitives for other applications and participation models.

> **Economic truth should derive from verifiable rules and evidence, not from discretionary authority.**

## 1. Problem

Many digital economic systems depend on trusted operators for determining outcomes, maintaining balances, validating payments, calculating liabilities, deciding solvency, publishing external data or resolving disputes.

PRE-RICH instead makes important economic rules protocol-visible and seeks to make their enforcement independently inspectable.

The desired progression is:

**Trust the operator → Inspect the rules → Inspect the state → Verify the transition → Verify the evidence**

## 2. Design Objective

PRE-RICH aims to be:

- **Transparent** — rules and state transitions are inspectable.
- **Deterministic** — authenticated equivalent inputs produce equivalent results.
- **Solvent** — liabilities and protected capital are accounted for before new exposure.
- **Non-custodial** — users retain control except where an explicitly specified transition moves value.
- **Resistant to discretionary authority** — frontend/backend/relayer components cannot redefine economic truth.
- **Extensible** — applications can be added without recreating the protocol core.
- **Auditable** — normative claims are traceable to implementation and evidence.

## 3. Constitutional Model

The hierarchy is:

**CONSTITUTION → SPECIFICATIONS → IMPLEMENTATION → TESTS / PROOFS**

A lower layer cannot silently override a higher layer.

An implementation gap does not reopen a settled economic decision. If the normative rule is closed, implementation is the migration target unless a new explicit decision changes the rule.

## 4. Economic Authority

Protocol-controlled state and verifiable evidence are the intended economic authority.

A browser, backend, relayer, database, API endpoint or external provider is not economic authority by itself.

These components may observe state, transport data, construct transactions or submit evidence. The protocol determines whether evidence is valid.

### B1

Scratch & Win currently uses an **Authorized Publisher** model. B1 therefore retains an explicit Beacon trust assumption.

### B3

B3 is the target publisher-independent canonical Beacon architecture. A proof of concept is not equivalent to achieved canonicality.

## 5. First Implementation: Scratch & Win

Scratch & Win is the first concrete PRE-RICH implementation on Cardano.

It uses, as applicable:

- native assets / NFT tickets;
- commit-reveal;
- deterministic outcome derivation;
- Beacon-based randomness;
- on-chain state transitions;
- liability-first accounting;
- non-custodial claims;
- protocol-controlled settlement.

Simplified lifecycle:

**SALE → COMMIT → REVEAL → CRYSTALLISE → CLAIM**

Expiry and invalid/late transitions are constrained by protocol rules.

## 6. Commit-Reveal

Commit-reveal separates commitment from revelation.

The player commits before the relevant result can be known. At reveal, the protocol validates the commitment and combines authenticated inputs with the validated Beacon and ticket identity.

Security depends on the actual binding enforced by the protocol transition, not merely on frontend behavior.

## 7. Deterministic Outcomes

The result is derived from authenticated inputs rather than selected by an operator.

The derivation determines symbols, tier and payout. The payout is crystallised at reveal and becomes immutable.

**result determination → economic crystallisation → later claim**

Claim validates an established right rather than recalculating the game.

## 8. Canonical Economic Unit

The canonical economic unit is **USDM**.

It is the reference for:

- ticket price;
- prize value;
- thresholds;
- exposure;
- reserve;
- protected capital;
- pending liabilities;
- Jackpot;
- class activation.

Other assets may be used through verified conversion.

## 9. Economic Classes

The canonical ladder is:

**1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM**

Genesis is 1 USDM.

The current safe class is derived from verified economic state, not administrator choice.

`CurrentActiveClass` may contract.

`HighestClassEverActivated` is monotonic and is not retroactively erased.

## 10. Exposure and Solvency

PRE-RICH distinguishes statistical risk modelling from deterministic protection.

Reference statistical model:

`UnresolvedReserve(N) = N × μ + Z × σ × sqrt(N)`

Deterministic worst-case exposure:

`WorstCaseExposure(P,N) = 500 × P × N`

Statistical reserve estimates risk; deterministic limits constrain protocol exposure.

## 11. Liability-First Accounting

The conceptual effective pool is:

`EffectivePool = TotalLiquidity − PendingWinningLiabilities − UnresolvedTicketReserve − LockedJackpotLiquidity`

The canonical protected-capital boundary is:

`RawSurplus = max(0, EEV − ProtectedCapital)`

and the protected-obligation invariant includes:

`PendingWinningLiabilities + UnresolvedTicketReserve + LockedJackpotLiquidity ≤ TotalLiquidity`

Committed value must not be counted again as freely distributable value.

## 12. Safety Circuit Breaker

The contraction sequence is:

**100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT**

Suspension affects new sales only.

The hysteresis **semantic principle is CLOSED** and:

- KA = 8
- KC = 4
- KD = 4

Any remaining quantitative validation or implementation conformance is not a semantic reopening.

## 13. Sale Atomicity

A valid sale binds:

**ticket mint + payment + PrizePool reservation**

atomically or through an equivalent on-chain mechanism that prevents unreserved issuance.

## 14. Treasury

The intended direction is:

**PLAYER → PROTOCOL TREASURY → PROTOCOL-CONTROLLED CATEGORIES**

No team/founder/developer/administrator receives an automatic personal economic entitlement.

The historical 75/10/10/5 allocation is non-canonical.

## 15. PrizePool and Jackpot

PrizePool tracks liquidity, unresolved reservations, pending liabilities, locked Jackpot liquidity and class state.

The Jackpot is separately locked/protected.

Funding is limited by:

`NewJackpot <= RawSurplus`

Payout is limited by:

`JackpotPayout <= LockedJackpotLiquidity`

No fixed JackpotAllocationRate is canonical by default.

The exact Jackpot payout mode remains OPEN: threshold payout vs full current locked-balance payout.

## 16. Expiry

Expiry is an economic boundary.

After `expiresAt`:

- the economic right is extinguished;
- no claim may be created;
- no new liability may be created;
- the unresolved reserve is released exactly once;
- the expired payment commitment dissolves;
- a late reveal cannot create claimability or liability;
- a late reveal cannot resurrect the expired right.

The exact ticket expiry duration remains OPEN.

## 17. Non-Custodial Claims

Claim verifies an already-crystallised right and settles its frozen value to the rightful current owner.

The payout is not recalculated from mutable pool conditions.

Claim does not require NFT burning.

## 18. Randomness and Beacon Architecture

B1 uses an authorized publisher and Beacon Registry.

B3 aims for stronger publisher-independent canonicality through stronger evidence and finality.

The project separates proof-of-concept work, B1 operation and B3 target architecture.

## 19. Economic Algorithm

The Economic Algorithm is the formal execution layer between normative policy and implementation.

It specifies authoritative inputs, preconditions, deterministic calculations, postconditions, fail-closed conditions and proof obligations.

The canonical authority chain is:

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

## 20. Verification Philosophy

PRE-RICH distinguishes:

- reference-model validation;
- unit/property tests;
- adversarial tests;
- validator/on-chain evidence;
- integration evidence.

A TypeScript mirror test is not by itself proof of Plutus enforcement.

## 21. Current Development State

As of September 2026:

- normative economic semantics are **CLOSED**;
- implementation conformance remains **OPEN / CLOSING**;
- B1 remains the current operational Beacon model;
- B3 remains a target;
- independent external security audit is not completed;
- the project is **not mainnet-ready**.

Known implementation/evidence gaps include autonomous operational liveness consolidation, transition conformance, quantitative hysteresis validation, expiry conformance, Jackpot conformance and other previously identified implementation gaps.

These gaps do not reopen the frozen economic semantics.

## 22. Open-Source Model

PRE-RICH is organized conceptually as:

- Constitutional Core;
- Protocol Core;
- Extensions;
- Applications.

Scratch & Win is the first application.

## 23. Roadmap

The roadmap separates:

- open-source foundation;
- Scratch & Win release-candidate conformance;
- mainnet readiness;
- B3 evolution;
- long-term protocol extensions.

Publishing the repository does not imply mainnet readiness.

## 24. Status Vocabulary

- **CLOSED** — normative decision is settled.
- **CLOSING** — implementation/evidence is being brought into conformance.
- **IMPLEMENTED / VERIFIED** — implemented and supported by required evidence.
- **IMPLEMENTATION GAP** — specified behavior is not fully enforced.
- **TARGET** — intended future architecture.
- **EXPERIMENTAL** — research/reference work, not normative.
- **HISTORICAL** — retained for traceability, not current authority.
- **OPEN** — genuinely unresolved decision or requirement.

## 25. What PRE-RICH Does Not Claim

PRE-RICH does not claim:

- that B1 is equivalent to B3;
- that proof-of-concept work is production verification;
- that statistical reserve parameters are absolute guarantees;
- that the current repository is mainnet-ready;
- that implementation gaps are already solved;
- that future extensions are implemented;
- that the protocol guarantees financial returns.

## 26. Conclusion

PRE-RICH asks which economic facts a system can verify for itself rather than merely who operates it.

The framework separates constitutional principles, specifications, implementation and evidence so that implementation gaps can be identified without silently changing protocol meaning.

Scratch & Win is the first laboratory in which these principles are made concrete.

**Build with PRE-RICH, rather than rebuilding PRE-RICH.**

## Documentation Authority

For implementation-level truth:

1. Constitution / Decision Register
2. Canonical economic specifications
3. Economic Algorithm
4. Architecture specifications
5. Implementation
6. Tests / proofs / evidence
7. Gap Matrix
8. Experimental and historical material

This White Paper is explanatory and does not override normative sources.

## Document Set Alignment

This White Paper belongs to the aligned document set including:

- Economic Algorithm v0.3.1
- Economic Algorithm Conformance Matrix v0.1.1

The canonical Conformance Matrix filename is:

`docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md`

## Disclaimer

This document reflects the PRE-RICH documentation state as of September 2026. It does not constitute an offer, financial advice, or a guarantee of future performance, completeness or mainnet readiness. The software remains under active development.
