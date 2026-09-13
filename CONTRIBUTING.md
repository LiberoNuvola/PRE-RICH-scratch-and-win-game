# Contributing to PRE-RICH

Thank you for contributing to PRE-RICH.

PRE-RICH is an open protocol/framework. **Scratch & Win is its first concrete implementation, not the whole protocol.** Contributions are welcome when they improve the protocol, its implementations, documentation, verification, tooling, or research without obscuring the current state of the project.

## Before contributing

Read these documents first:

1. [`README.md`](README.md) — project orientation and current status
2. [`ROADMAP.md`](ROADMAP.md) — release horizons and project direction
3. [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md) — constitutional principles and invariants
4. [`docs/Game-Economy.md`](docs/Game-Economy.md) — normative economic policy
5. [`docs/Game-Economy-Specification.md`](docs/Game-Economy-Specification.md) — implementation-facing economic specification
6. [`docs/ECONOMIC-ALGORITHM.md`](docs/ECONOMIC-ALGORITHM.md) — execution baseline
7. [`docs/ECONOMIC-ALGORITHM-CONFORMANCE-MATRIX.md`](docs/ECONOMIC-ALGORITHM-CONFORMANCE-MATRIX.md) — implementation/conformance evidence status
8. [`docs/CONSTITUTION-GAP-MATRIX.md`](docs/CONSTITUTION-GAP-MATRIX.md) — broader conformance status

The repository deliberately distinguishes **documented**, **implemented**, **verified**, **experimental**, and **target** states. A reference-model result or TypeScript test must not be presented as validator/on-chain proof.

## Contribution principles

- Prefer extending PRE-RICH itself over creating disconnected reimplementations.
- Preserve the authority hierarchy: **Constitution → Specifications → Implementation → Tests / Proofs**.
- Do not silently change normative economic policy in implementation code.
- Do not promote a candidate, simulation parameter, or experimental result to normative status without an explicit decision.
- Preserve the distinction between B1 (Authorized Publisher) and the B3 publisher-independent target.
- Keep changes reviewable and reproducible.

## Economic and protocol changes

Changes affecting normative economic rules require extra care. Before opening a pull request that changes such rules:

- identify the affected normative source;
- identify the relevant decision-register entry, if one exists;
- explain whether the change is normative, implementation-only, experimental, or documentation-only;
- update affected specifications and conformance documentation together when appropriate;
- do not use implementation changes to implicitly settle an OPEN policy choice.

## Development

Install dependencies:

```bash
npm install
```

Run the development application:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Run the repository's current pre-deployment structural check:

```bash
npm run test:predeploy
```

These commands do **not** constitute complete protocol conformance or validator-level verification.

## Pull requests

A useful pull request should contain:

- a concise explanation of the change;
- the motivation and affected protocol area;
- relevant documentation updates;
- the commands/tests actually run;
- known limitations or remaining evidence gaps;
- explicit disclosure when a change is experimental or target-only.

Keep unrelated refactors out of focused protocol changes where practical.

## Documentation changes

Documentation is part of protocol auditability. When changing public documentation:

- preserve the normative source hierarchy;
- update cross-references and relative links;
- avoid duplicate competing sources of truth;
- distinguish historical material from current policy;
- do not claim implementation conformance without evidence.

## Security

Please do **not** disclose a suspected vulnerability in a public issue. Follow [`SECURITY.md`](SECURITY.md) for private reporting guidance.

## License

The project license is finalized separately from this contribution guide. Contributions will be subject to the repository license in force when they are accepted.
