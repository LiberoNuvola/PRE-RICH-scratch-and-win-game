# PRE-RICH Roadmap

**Last updated:** September 2026
**Current status:** Open-source preparation + B1 hardening / conformance
**Mainnet status:** Not ready

> **PRE-RICH is an open protocol to be extended, not a product to be copied. Scratch & Win is its first implementation.**

## How to read this roadmap

This roadmap contains three different horizons:

1. **Open-source release** — make the project understandable, reproducible and inspectable.
2. **Scratch & Win release candidate / mainnet readiness** — close and verify the first implementation.
3. **Future PRE-RICH evolution** — extend the protocol beyond the first implementation.

Completing the full roadmap is not a prerequisite for publishing PRE-RICH as open source.

## 1. Open-Source Foundation — Current

Goal: publish the project with enough structure and documentation for an external contributor to understand what exists, what is normative, what is implemented, and what remains open.

- [x] README and repository positioning
- [x] Public roadmap
- [x] Constitution / normative principles
- [x] Economic documentation baseline
- [x] Architecture and trust-model documentation
- [x] Gap Matrix / implementation-status tracking
- [x] Whitepaper
- [x] CONTRIBUTING.md
- [ ] SECURITY.md
- [ ] CODE_OF_CONDUCT.md / community governance baseline
- [ ] License selection and application
- [ ] Repository templates and release metadata
- [ ] Reproducible public test/build instructions

**Exit gate:** a technically competent external contributor can understand the protocol, its first implementation, its trust assumptions and its current limitations without relying on private project history.

## 2. Scratch & Win — Economic & Specification Closure

Goal: preserve the frozen economic model while eliminating remaining ambiguity between specification and implementation.

The normative baseline includes:

- canonical USDM accounting;
- KA = 8, KC = 4, KD = 4;
- Genesis = 1 USDM;
- verified PRE Treasury bootstrap threshold >= 4,000 USDM;
- 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM ladder;
- 500× maximum normal payout;
- liability-first accounting;
- ProtectedCapital / RawSurplus boundary;
- deterministic worst-case exposure;
- CurrentActiveClass vs HighestClassEverActivated;
- expiry finality;
- verified conversion for supported non-USDM assets;
- separate locked Jackpot protection.

The semantic hysteresis decision is **CLOSED**. KA/KC/KD are canonical. Remaining numerical validation is implementation/quantitative validation, not a policy reopening.

The genuinely open policy set is limited to:

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy, but only if an explicit allocation rule is actually required.

All other remaining work is implementation or evidence work unless a new explicit normative decision is adopted.

## 3. Scratch & Win — B1 Hardening & Conformance

Goal: make the current Authorized Publisher architecture internally consistent and verifiably enforce the protocol rules.

Priority areas:

- Dynamic Solvency Kernel;
- SALE atomicity;
- PrizePool accounting;
- REVEAL / crystallisation;
- EXPIRE and late-reveal non-liability;
- CLAIM settlement and exact asset units;
- Jackpot and Treasury accounting;
- circuit-breaker / active-class enforcement;
- B1 randomness and exact board mapping where applicable;
- bigint / integer-safe economic calculations;
- removal or explicit isolation of stale legacy paths;
- operational liveness consolidation and permissionless execution evidence.

### Verification

Required evidence includes:

- unit tests;
- property-based tests;
- adversarial tests;
- validator-level tests;
- integration tests;
- reproducible economic-model tests;
- explicit separation between TypeScript reference-model tests and actual Plutus/on-chain evidence.

**Exit gate:** critical constitutional and economic invariants are enforced by the actual protocol path and supported by reproducible evidence.

## 4. B3 / Canonical Beacon Evolution — Future / Parallel

B3 is the architectural target for reducing the remaining trust assumption of B1.

Work includes:

- completion of GRANDPA finality obligations;
- real Materios fixtures;
- authenticated authority-set transitions;
- Cardano L1 anchoring;
- publisher-independent canonical Beacon verification;
- migration from the B1 Authorized Publisher path.

**B1 must never be presented as B3.**

**Exit gate:** the B3 trust model is implemented and independently verifiable rather than merely described.

## 5. Mainnet Readiness — Later

Mainnet is a separate release gate, not a consequence of publishing the repository.

Required before a mainnet decision:

- all critical Gap Matrix items closed;
- final parameter freeze;
- prolonged adversarial public testnet operation;
- deployment rehearsal;
- operational runbook and incident procedures;
- independent security review / audit;
- reproducible release artifacts;
- explicit mainnet go/no-go decision.

**Exit gate:** deployed artifact, economic specification, validator behavior, tests and operational procedures describe the same system.

## 6. Community Expansion Track — Long Term

Once the foundation is public, contributors can extend PRE-RICH rather than recreate it as disconnected projects.

Potential extension areas:

- economic modules;
- solvency mechanisms;
- participation and governance mechanisms;
- state machines;
- verification and randomness systems;
- oracle and settlement integrations;
- new asset models;
- new applications built on the PRE-RICH protocol.

**Scratch & Win is only the first implementation.**

## Status vocabulary

Use these terms consistently:

- **CLOSED** — normative decision is settled.
- **CLOSING** — implementation or evidence is being brought into conformance with a settled decision.
- **IMPLEMENTED / VERIFIED** — implemented and supported by required evidence.
- **IMPLEMENTATION GAP** — specified behavior is not yet fully enforced.
- **TARGET** — intended future architecture or capability.
- **EXPERIMENTAL** — reference/research work, not normative.
- **HISTORICAL** — retained for traceability, not current authority.
- **OPEN** — a decision is genuinely unresolved.

## Current priority

The immediate objective is:

1. finish the open-source foundation;
2. apply the canonical documentation patch set;
3. close the remaining Scratch & Win conformance gaps;
4. produce a release candidate with reproducible evidence;
5. independently review it;
6. then make a separate mainnet decision.

**Detailed implementation status:** `docs/CONSTITUTION-GAP-MATRIX.md`

**Economic authority:** `docs/Game-Economy.md` and `docs/Game-Economy-Specification.md`

**Economic execution baseline:** `docs/ECONOMIC-ALGORITHM.md`

**Conformance matrix:** `docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md`

**Architectural target:** `docs/beacon-trust-model.md`
