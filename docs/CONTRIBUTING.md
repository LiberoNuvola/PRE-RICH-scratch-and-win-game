# Contributing to PRE-RICH

Thank you for contributing to PRE-RICH.

PRE-RICH is an open protocol/framework. **Scratch & Win is its first concrete implementation, not the whole protocol.**

## Before contributing

Read these documents first:

1. [`README.md`](README.md)
2. [`ROADMAP.md`](ROADMAP.md)
3. [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md)
4. [`docs/Game-Economy.md`](docs/Game-Economy.md)
5. [`docs/Game-Economy-Specification.md`](docs/Game-Economy-Specification.md)
6. [`docs/ECONOMIC-ALGORITHM.md`](docs/ECONOMIC-ALGORITHM.md)
7. [`docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md`](docs/ECONOMIC-ALGORITHM_CONFORMANCE-MATRIX.md)
8. [`docs/CONSTITUTION-GAP-MATRIX.md`](docs/CONSTITUTION-GAP-MATRIX.md)

The repository deliberately distinguishes documented, implemented, verified, experimental and target states.

## Contribution principles

- Prefer extending PRE-RICH itself over creating disconnected reimplementations.
- Preserve **Constitution → Specifications → Implementation → Tests / Proofs**.
- Do not silently change normative economic policy in implementation code.
- Do not promote candidate, simulation or experimental parameters to normative status without an explicit decision.
- Preserve the distinction between B1 Authorized Publisher and the B3 publisher-independent target.
- Keep changes reviewable and reproducible.
- Treat implementation gaps as implementation work, not as permission to redefine the protocol.

## Economic and protocol changes

Before changing normative economic rules:

- identify the affected normative source;
- identify the relevant decision-register entry;
- explain whether the change is normative, implementation-only, experimental or documentation-only;
- update affected specifications and conformance documentation together when appropriate;
- do not use implementation changes to implicitly settle an OPEN policy choice.

The current frozen economic baseline includes KA=8, KC=4, KD=4. The hysteresis semantic principle is CLOSED; remaining quantitative validation is implementation/evidence work.

The current genuinely open policy set is limited to:

1. Jackpot payout mode;
2. exact ticket expiry duration;
3. future Jackpot allocation policy, but only if an explicit allocation rule is required.

## Development

```bash
npm install
npm run dev
npm run build
npm run test:predeploy
```

These commands do not constitute complete protocol conformance or validator-level verification.

## Pull requests

A useful pull request should contain:

- concise explanation of the change;
- motivation and affected protocol area;
- relevant documentation updates;
- commands/tests actually run;
- known limitations or evidence gaps;
- explicit disclosure when a change is experimental or target-only.

Keep unrelated refactors out of focused protocol changes where practical.

## Documentation changes

Documentation is part of protocol auditability.

- preserve the normative source hierarchy;
- update cross-references and relative links;
- avoid duplicate competing sources of truth;
- distinguish historical material from current policy;
- do not claim implementation conformance without evidence.

## Security

Do not disclose a suspected vulnerability in a public issue. Follow [`SECURITY.md`](SECURITY.md) for private reporting guidance.

## License

The project license is finalized separately from this contribution guide. Contributions will be subject to the repository license in force when they are accepted.
