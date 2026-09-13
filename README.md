PRE-RICH

PRE-RICH is an open-source decentralized economic framework for designing transparent, programmable and resilient systems for coordinating value.

The project explores how economic rules can be expressed as explicit, verifiable mechanisms rather than relying on discretionary economic authority.

Scratch & Win is the first concrete implementation and experimental environment of the PRE-RICH framework, currently being developed on Cardano.

PRE-RICH is research and active development. The current implementation is not mainnet-ready and must not be treated as a production deployment, financial product, or economic promise.

What is PRE-RICH?

PRE-RICH is broader than any single application.

At its core, the project investigates a model in which:

economic rules are explicit and machine-verifiable;

protocol state is transparent and auditable;

economic authority is constrained by deterministic rules;

solvency and exposure are treated as first-class protocol properties;

collective participation can operate without a discretionary economic authority;

open-source implementation, mathematical modelling and verification evolve together.

The objective is not simply to put an existing economic process on a blockchain.

The objective is to explore whether economic coordination itself can be expressed as a transparent, programmable and verifiable system.

The framework

The PRE-RICH architecture is being developed around several connected layers:

Economic Algorithm
The rules governing economic state transitions, capacity, exposure, liabilities and permitted distributions.

Solvency & Viability
Mathematical models and viability-kernel methods used to determine whether economic states remain sustainable under the protocol's permitted transitions and adverse outcomes.

Programmable Economic Rules
Explicit rules defining what the protocol may and may not do, including exposure limits, reserves, payout constraints, class activation and settlement.

Blockchain Enforcement
Cardano smart contracts and authenticated on-chain state provide the enforcement layer for protocol-critical conditions.

Collective Participation
The long-term direction explores mechanisms through which participants can contribute to and govern protocol evolution without giving a single actor discretionary economic authority.

Open Research
The economic model, implementation, tests and proofs are intended to remain inspectable, reproducible and open to external criticism.

The first implementation: Scratch & Win

The current repository contains the first major concrete implementation of the framework:

PRE-RICH Scratch & Win on Cardano.

Scratch & Win is being used as a demanding real-world test case because it requires the framework to solve several difficult problems simultaneously:

deterministic economic rules;

ticket issuance;

commit/reveal mechanics;

randomness verification;

payout determination;

economic exposure management;

unresolved-ticket reserves;

oracle-based asset conversion;

treasury and PrizePool accounting;

expiry;

claim settlement;

concurrency and atomicity;

adversarial testing.

The application therefore serves two purposes:

it is an actual protocol/application under development;

it is an experimental environment in which the broader PRE-RICH economic architecture can be implemented and challenged.

Design principles

PRE-RICH is being developed around a small set of constitutional principles.

1. Economic authority must be constrained

No founder, developer, administrator, backend, relayer or external service should have discretionary authority to determine protocol economic truth.

Off-chain components may observe, construct, transport or submit evidence.

They must not become the economic authority of the protocol.

2. Blockchain is the enforcement layer

The browser, backend, database and APIs are not the final authority for protocol-critical economic conditions.

Where a condition determines an economic right or liability, it should ultimately be enforced by on-chain rules or authenticated on-chain state.

3. Solvency is a protocol property

PRE-RICH does not treat solvency as an accounting report generated after the fact.

Liquidity, crystallized liabilities, unresolved exposure, reserves, safety capital and locked protocol capital are explicitly represented in the economic model.

4. No hidden discretionary economic share

The constitutional model does not assign an automatic economic share to a founder, team, developer, administrator or relayer merely for operating the protocol.

Operational costs and maintenance are protocol concerns and must remain subject to the economic rules.

5. Historical truth must remain immutable

Once an economic result has been validly determined and crystallized, later changes in system state must not retroactively rewrite that result.

6. Open source means inspectable claims

PRE-RICH distinguishes between:

FACT — observed or established property;

NORMATIVE — a rule the protocol is required to follow;

VALIDATION RESULT — a result obtained through bounded computation or testing;

IMPLEMENTATION MISMATCH — a difference between the required model and current code;

OPEN DECISION — a policy choice not yet frozen;

HYPOTHESIS — an idea requiring further validation.

A test passing in a reference model is not automatically proof that the deployed Plutus code enforces the same property.

Current economic baseline

The current constitutional/economic work establishes a baseline including:

canonical economic denomination in USDM;

Genesis ticket price of 1 USDM;

ticket ladder of 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM;

automatic class activation based on verified economic state;

distinction between CurrentActiveClass and HighestClassEverActivated;

maximum normal payout of 500 × ticket price;

deterministic worst-case unresolved exposure of 500 × P × N for price P and N unresolved tickets;

liability-first economic protection;

protected PrizePool capital;

separate locked Jackpot capital;

verified conversion when settlement uses an asset other than USDM;

expiry rules preventing expired economic rights from creating new liabilities;

explicit separation between economic semantics and implementation evidence.

The economic model is substantially consolidated, but implementation conformance and proof work are still in progress.

Current architecture

B1 — current operational Beacon model

The current B1 architecture uses an authorized publisher/relayer to provide external evidence used by the Beacon flow.

The relayer is part of the current trust boundary.

It can submit evidence; the verifier determines whether the submitted evidence is valid according to protocol rules.

B1 must not be represented as B3.

B3 — future target

B3 is a future direction for publisher-independent canonical external Beacon verification.

The existence of an external datum, a proof-of-concept or an adapter does not by itself establish B3.

The repository therefore deliberately distinguishes the current B1 implementation from future B3 architecture.

Development status

PRE-RICH is currently in an implementation and verification hardening phase.

Substantially established

constitutional economic direction;

economic baseline and canonical ladder;

core B1 architecture;

commit/reveal architecture;

core state-machine structure;

oracle model;

PrizePool economic concepts;

protected-capital concepts;

dynamic solvency/viability research;

open-source architectural direction.

Closing / actively being implemented

complete economic-rule enforcement in on-chain code;

class activation and suspension enforcement;

class-aware exposure and reserve enforcement;

sale and settlement correctness;

USDM/ADA and multi-asset settlement;

expiry lifecycle;

Jackpot lifecycle;

treasury distribution enforcement;

adversarial on-chain testing;

concurrency and atomicity evidence;

release and CI hardening.

Future targets

publisher-independent B3 verification;

stronger formal proofs;

broader decentralized participation and governance mechanisms;

additional applications of the PRE-RICH economic framework.

Current status: research-grade open-source development, not mainnet-ready.

Why this is open source

PRE-RICH is intended to be developed in public because the economic model itself should be open to inspection and criticism.

We want external contributors to be able to challenge:

the mathematics;

the economic assumptions;

the smart contracts;

the security model;

the testing methodology;

the governance model;

the implementation.

A protocol designed to reduce discretionary authority should not depend on asking the community to simply trust its authors.

We are looking for contributors

We are looking for contributors, not investors.

PRE-RICH is an active research and engineering project and welcomes people who want to help examine, improve, test or challenge the system.

Useful areas include:

Cardano / Plutus development;

Aiken and smart-contract engineering;

TypeScript;

protocol architecture;

cryptography and randomness;

formal methods and verification;

mathematics;

probability and statistics;

economic modelling;

game theory;

security auditing;

adversarial testing;

distributed systems;

frontend development;

DevOps and reproducible builds;

technical documentation;

governance and mechanism design.

You do not need to agree with the project to contribute.

Finding weaknesses, proving that an assumption is wrong, or demonstrating that an invariant does not hold is valuable contribution.

How to contribute

Start by reading:

docs/CONSTITUTION.md

docs/Game-Economy.md

docs/Game-Economy-Specification.md

docs/CONSTITUTION-GAP-MATRIX.md

docs/MASTER-TODO-V3.md

docs/architecture-spec.md

docs/beacon-trust-model.md

Then look at the current issues and roadmap.

When proposing a change, clearly distinguish whether it is:

a bug fix;

an implementation improvement;

a security finding;

a proof/test improvement;

a normative economic change;

an architectural proposal.

Do not silently change an economic rule in code.

Normative economic changes must be discussed and reconciled with the project's constitutional and economic documentation before implementation.

Development

Install dependencies:

npm install

Start the Vite development environment:

npm run dev

Available workspace scripts are defined in package.json.

Wallet interactions currently rely on Lucid.

Where the optional Blockfrost proxy is used, its required environment variables must be configured separately.

Documentation hierarchy

PRE-RICH uses the following hierarchy:

CONSTITUTION
      ↓
SPECIFICATIONS
      ↓
IMPLEMENTATION
      ↓
TESTS / PROOFS

The Constitution defines what must be true.

Specifications define how those properties are to be implemented.

The implementation attempts to satisfy the specifications.

Tests and proofs provide evidence.

A passing implementation test does not override a constitutional requirement.

Historical documents are retained for traceability but do not automatically override the current normative baseline.

Security and economic disclaimer

PRE-RICH is experimental software and an active research project.

Nothing in this repository should be interpreted as:

a guarantee of profit;

a guarantee of solvency;

an investment offer;

a promise of future token value;

a production-ready financial system;

a guarantee that the current implementation satisfies every stated economic invariant.

Until the relevant implementation, adversarial testing, formal evidence and release gates are complete, do not use the system with funds whose loss would be unacceptable.

Security researchers and contributors are encouraged to report weaknesses responsibly.

Roadmap

Phase 1 — Economic foundation

consolidate normative economic rules;

formalize the economic state model;

establish solvency and viability constraints.

Phase 2 — Protocol implementation

enforce the economic model on-chain;

complete sale, settlement, reserve and treasury mechanisms;

complete lifecycle and Jackpot logic.

Phase 3 — Verification

adversarial Plutus/emulator testing;

concurrency and atomicity testing;

oracle and settlement testing;

mathematical and formal verification;

reproducible release gates.

Phase 4 — Testnet and external review

controlled deployment;

independent security review;

economic-model review;

community testing.

Phase 5 — Mainnet

Mainnet deployment will only be considered after the relevant economic, security, implementation and release gates are satisfied.

Project philosophy

PRE-RICH is an attempt to move from:

"Trust the operator."

towards:

"Inspect the rules.
Inspect the state.
Verify the transition.
Verify the evidence."

The long-term ambition is not merely to create another blockchain application.

It is to explore whether economic systems themselves can become programmable, inspectable, mathematically constrained and collectively developed.

License

See the repository license for the current licensing terms.
