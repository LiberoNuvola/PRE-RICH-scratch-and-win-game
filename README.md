# PRE-RICH

**An open-source decentralized economic framework for designing transparent, programmable and resilient systems for coordinating value.**

**Scratch & Win is the first concrete implementation of the PRE-RICH framework, currently developed on Cardano.**

> **PRE-RICH is an open protocol to be extended, not a product to be copied. Scratch & Win is only the first implementation.**

## Status

| Area | Current status |
|---|---|
| Economic model | **Substantially closed** |
| B1 architecture | **Substantially implemented** |
| Cryptographic core | **Final validation** |
| State-machine conformance | **In progress** |
| B3 / canonical Beacon | **Target / in progress** |
| Mainnet | **Not ready** |

This repository is under active development. Publishing it openly does **not** imply that the protocol is production-ready or suitable for mainnet deployment.

## What is PRE-RICH?

PRE-RICH is intended as an open protocol/framework for economic systems whose important rules can be made explicit, inspectable and programmatically enforceable.

Its design direction includes:

- deterministic and auditable economic rules;
- explicit solvency and liability constraints;
- programmable state transitions;
- blockchain-enforced settlement;
- transparent verification;
- participatory and extensible protocol design;
- open research and community development.

The first implementation, **Scratch & Win**, provides a concrete environment in which these principles can be implemented, tested and hardened.

## Scratch & Win

The current implementation is a Cardano-based on-chain scratch-and-win system using:

- unique NFT tickets;
- commit-reveal;
- deterministic outcome derivation;
- Beacon-based randomness;
- liability-first accounting;
- non-custodial claims;
- protocol-controlled settlement.

The current operational architecture is **B1 (Authorized Publisher)**. The longer-term architectural target is **B3**, using a canonical Beacon with stronger publisher independence.

**B1 is not presented as B3.**

## Current economic baseline

The current normative economic baseline includes:

- canonical USDM accounting;
- Genesis reference;
- 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM classes;
- maximum normal payout of 500× ticket price;
- liability-first protection;
- unresolved reserve / worst-case exposure accounting;
- distinction between `CurrentActiveClass` and `HighestClassEverActivated`;
- expiry rules preventing expired rights from creating new liabilities;
- verified conversion for supported non-USDM assets.

Some implementation/conformance work and a small number of explicit policy decisions remain open. See the economic documentation and Gap Matrix rather than treating this README as the normative source.

## Architecture and trust

The protocol follows the hierarchy:

**Constitution → Specifications → Implementation → Tests / Proofs**

The frontend, backend, relayer and data providers are not intended to have discretionary economic authority. The current B1 Beacon architecture nevertheless retains an explicit authorized-publisher trust assumption.

The project does not claim B3 trustlessness before B3 verification is actually implemented.

## Documentation

Start here:

- [`ROADMAP.md`](ROADMAP.md) — public project roadmap and release horizons
- [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) — binding principles and invariants
- [`docs/Game-Economy.md`](docs/Game-Economy.md) — normative economic policy
- [`docs/Game-Economy-Specification.md`](docs/Game-Economy-Specification.md) — economic specification
- [`docs/CONSTITUTION-GAP-MATRIX.md`](docs/CONSTITUTION-GAP-MATRIX.md) — implementation/conformance status
- [`docs/architecture-spec.md`](docs/architecture-spec.md) — technical architecture
- [`docs/beacon-trust-model.md`](docs/beacon-trust-model.md) — B1 → B3 trust model

## Development

```bash
npm install
npm run dev
```

The repository contains Plutus scripts and off-chain components. Full protocol verification requires more than the development server: see the test and implementation documentation for the applicable validation path.

## Development status and limitations

No property is considered complete merely because a reference model or TypeScript test passes. For release-grade claims, the project distinguishes between:

- specification;
- implementation;
- computational/reference-model validation;
- validator/on-chain evidence;
- adversarial/integration evidence.

Current limitations include the remaining B1 conformance work and the fact that an independent external security audit has not yet established mainnet readiness.

## Contributing

Contributions, reviews and security findings are welcome.

The preferred contribution model is to **extend PRE-RICH itself** through the protocol core, extensions and applications, rather than creating disconnected reimplementations.

Before proposing a change to a normative economic rule, consult the Constitution, economic specification and decision register.

Detailed contribution guidance will be provided in `CONTRIBUTING.md`.

## Roadmap

The roadmap intentionally contains both near-term release work and longer-term protocol evolution.

**Open-source publication does not require completion of the entire roadmap.**

See [`ROADMAP.md`](ROADMAP.md).

## Security

This is an active research and development repository and is **not mainnet-ready**.

Do not treat experimental deployments or unreleased economic parameters as production guarantees.

Security reporting guidance will be provided in `SECURITY.md`.

## License

**License: to be finalized.**

The project will publish an explicit license before claiming a finalized open-source release. The license decision will be made consistently with the PRE-RICH Constitution, protocol/extensions architecture and project identity policy.
