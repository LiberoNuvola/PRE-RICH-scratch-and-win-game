# PRE-RICH

**An open-source decentralized economic framework for designing transparent, programmable and resilient systems for coordinating value.**

**Scratch & Win is the first concrete implementation of the PRE-RICH framework, currently developed on Cardano.**

> **PRE-RICH is an open protocol to be extended, not a product to be copied. Scratch & Win is only the first implementation.**

## Status

| Area | Current status |
|---|---|
| Economic semantics | **Closed** |
| B1 architecture | **Substantially implemented** |
| Cryptographic core | **Final validation** |
| State-machine conformance | **In progress** |
| Economic implementation conformance | **Open / closing** |
| B3 / canonical Beacon | **Target / in progress** |
| Mainnet | **Not ready** |

Publishing the repository openly does **not** imply production readiness or mainnet readiness.

## What is PRE-RICH?

PRE-RICH is an open protocol/framework for economic systems whose important rules can be made explicit, inspectable and programmatically enforceable.

Its design direction includes:

- deterministic and auditable economic rules;
- explicit solvency and liability constraints;
- programmable state transitions;
- blockchain-enforced settlement;
- transparent verification;
- participatory and extensible protocol design;
- open research and community development.

## Scratch & Win

The first implementation is a Cardano-based on-chain scratch-and-win system using:

- unique NFT tickets;
- commit-reveal;
- deterministic outcome derivation;
- Beacon-based randomness;
- liability-first accounting;
- non-custodial claims;
- protocol-controlled settlement.

The current operational architecture is **B1 (Authorized Publisher)**. B3 is the longer-term publisher-independent target.

**B1 is not presented as B3.**

## Current economic baseline

The frozen normative baseline includes:

- USDM as canonical economic unit;
- KA = 8, KC = 4, KD = 4;
- Genesis = 1 USDM;
- verified PRE Treasury bootstrap threshold >= 4,000 USDM;
- 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM classes;
- maximum normal payout of 500× ticket price;
- liability-first accounting;
- ProtectedCapital / RawSurplus boundary;
- deterministic worst-case exposure;
- distinction between `CurrentActiveClass` and `HighestClassEverActivated`;
- final expiry semantics;
- separate locked Jackpot protection.

The hysteresis semantic principle is **CLOSED**. Remaining quantitative validation is implementation/evidence work.

The only genuinely open policy set is:

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy, but only if an explicit allocation rule is required.

## Architecture and trust

The hierarchy is:

**Constitution → Specifications → Implementation → Tests / Proofs**

The frontend, backend, relayer and data providers are not intended to have discretionary economic authority.

The current B1 Beacon architecture retains an explicit authorized-publisher trust assumption.

## Documentation

Start here:

- [`ROADMAP.md`](ROADMAP.md)
- [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md)
- [`docs/Game-Economy.md`](docs/Game-Economy.md)
- [`docs/Game-Economy-Specification.md`](docs/Game-Economy-Specification.md)
- [`docs/ECONOMIC-ALGORITHM.md`](docs/ECONOMIC-ALGORITHM.md)
- [`docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md`](docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md)
- [`docs/CONSTITUTION-GAP-MATRIX.md`](docs/CONSTITUTION-GAP-MATRIX.md)
- [`docs/architecture-spec.md`](docs/architecture-spec.md)
- [`docs/beacon-trust-model.md`](docs/beacon-trust-model.md)

## Development

```bash
npm install
npm run dev
```

The repository contains Plutus scripts and off-chain components. Full protocol verification requires more than the development server.

## Development status and limitations

No property is considered complete merely because a reference model or TypeScript test passes.

The project distinguishes:

- specification;
- implementation;
- computational/reference-model validation;
- validator/on-chain evidence;
- adversarial/integration evidence.

Current limitations include the remaining B1 conformance work and the absence of an independent external security audit.

## Contributing

Contributions, reviews and security findings are welcome.

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security

This is an active research and development repository and is **not mainnet-ready**.

See [`SECURITY.md`](SECURITY.md) for security reporting guidance.

## License

**License: to be finalized.**

The project will publish an explicit license before claiming a finalized open-source release.
