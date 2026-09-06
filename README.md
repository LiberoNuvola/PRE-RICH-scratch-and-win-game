# PRE-RICH

Experimental Cardano scratch-and-win protocol workspace. This repository is under active development, is not mainnet-ready, and must not be treated as a production deployment or an economic promise.

## Current Architecture Status

- **B1 is the current operational Beacon model:** an authorized publisher provides the external evidence used by the Beacon flow. The publisher/relayer remains inside the trust boundary.
- **V3 economy is the constitutional and economic target:** parts of the B1 implementation exist, but the V3 economic state machine is not fully implemented or fully enforced. The Gap Matrix records the required proof for each invariant.
- **B3 is a future target:** publisher-independent canonical external Beacon verification is not implemented. Neither a PoC nor the presence of an external datum establishes B3 by itself.

The repository documentation distinguishes normative requirements from implemented behavior. Where they differ, the implementation status documents and audit evidence take precedence over an assumption of completion.

## Development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Available workspace scripts are defined in `package.json`. Wallet interactions rely on Lucid. The optional Blockfrost proxy requires `PROXY_API_KEY` and `BLOCKFROST_PROJECT_ID` in its own environment before use.

## Documentation Map

- [Constitution](docs/CONSTITUTION.md): binding protocol principles and economic invariants.
- [Game Economy](docs/Game-Economy.md): normative economic policy, including USDM denomination and liability-first accounting.
- [Economic Implementation Specification](docs/Game-Economy-Specification.md): implementation-facing companion to the economy policy.
- [Treasury Distribution Specification](docs/treasury-distribution-spec.md): Treasury, distributable-surplus and Maintenance requirements.
- [Constitution Gap Matrix](docs/CONSTITUTION-GAP-MATRIX.md): current implementation and enforcement status; `PARTIAL` and `GAP` are not completion states.
- [Master TODO V3](docs/MASTER-TODO-V3.md): the authoritative development roadmap for the V3 economic target.
- [Beacon Trust Model](docs/beacon-trust-model.md): current B1 trust boundary and the future B3 proof path.
- [Architecture Specification](docs/architecture-spec.md): technical system architecture and trust boundaries.
- [Operational Runbook](docs/operational-runbook.md): operational procedures; it is not a source of economic authority.
- [B1 Audit Addendum](docs/B1-Audit-Report-V3-Addendum.md): interpretation of historical B1 validation relative to Constitution V3.

## Scope Notes

`poc/` contains exploratory adapter work and is not a claim of B3 implementation. Historical audit material is retained under `docs/archive/`; it records the revision and scope it assessed and does not override the Constitution, current specifications, or the Gap Matrix.
