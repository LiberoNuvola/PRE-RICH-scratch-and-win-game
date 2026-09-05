PRE-RICH Constitution — Gap Matrix

Companion to: docs/CONSTITUTION.md
Protocol baseline: Constitution V3 — Deterministic Economy
Current implementation baseline: B1 (b1-hardening)
Rule: never mark a row DONE unless the relevant Plutus implementation, off-chain implementation, and tests agree.

1. Status Legend

Status

Meaning

DONE

Implemented, aligned and covered by tests/evidence

PARTIAL

Meaningful implementation exists, but one or more invariants, paths or proofs remain incomplete

GAP

Missing, contradictory or not yet enforceable

TARGET

Deliberately future architecture/property

UNKNOWN

Requires a dedicated file-level or integration audit

2. Constitutional Invariants

ID

Invariant

Status

Current assessment / next proof

C1

No privileged team/dev/founder/admin economic share

PARTIAL

Treasury architecture avoids privileged destination; relayer reward and legacy distribution wording require final reconciliation

C2

Protocol-controlled Treasury categories

PARTIAL

Treasury validator targets protocol categories; exact output/remainder enforcement still requires dedicated verification

C3

Ticket identity is unique and transferable

DONE

B1 ticket NFT identity and transfer-oriented architecture present

C4

Ticket not automatically burned on claim

DONE

B1 tests/report preserve NFT after claim; voluntary burn remains separate

C5

Pre-reveal opacity

PARTIAL

Commit-reveal and ticket binding exist; formal non-deducibility/adversarial analysis remains required

C6

Payout crystallized at reveal

PARTIAL

PrizeValidator cross-checks payout/liability; complete state-machine proof and claim-path consolidation remain required

C7

EffectivePool accounting

DONE

B1PrizePool uses liquidity minus pending liabilities, unresolved reserve and locked Jackpot

C8

Unresolved-ticket reserve

DONE

B1 tracks unresolved count and reserve and updates them through lifecycle transitions

C9

Deterministic worst-case exposure limits

GAP

Constitution V3 requires deterministic exposure capacity; current aggregate datum does not yet provide complete per-class worst-case enforcement

C10

Automatic ticket-class activation

GAP

Current code tracks suspended classes but does not yet derive the active class from the full economic state

C11

Automatic ticket-class suspension

PARTIAL

Suspension concept exists; deterministic economic derivation and complete hysteresis remain to be enforced

C12

Hysteresis for class activation/suspension

GAP

Threshold separation not yet encoded as a complete on-chain rule

C13

HighestClassEverActivated monotonic state

GAP

Required by Constitution V3; not yet represented as a complete economic state variable

C14

Genesis = 1 USDM

DONE

B1 baseline and tests explicitly use 1 USDM / 100 USDM sub-units

C15

Genesis PRE bootstrap = 4,000 USDM verified Treasury value

PARTIAL

Normative rule defined; full economic activation path and valuation safeguards require implementation proof

C16

USDM canonical denomination

DONE

B1 economics and oracle model use USDM as reference unit

C17

ADA/other asset settlement preserves USDM economic obligation

PARTIAL

Oracle and multi-asset mirror coverage exists; production claim/payment builder must be aligned

C18

No underpayment due to oracle rounding

DONE

C-03 mirror tests cover ceiling/rounding behaviour

C19

Jackpot separate from normal symbol distribution

PARTIAL

Separate accounting path exists; complete jackpot trigger/selection lifecycle remains incomplete

C20

Jackpot automatically activated from verified state

PARTIAL

EffectivePool/threshold helper exists; complete ladder semantics and trigger integration remain

C21

Jackpot materially exceeds maximum normal payout

PARTIAL

Constitutional ladder defined; numeric runtime configuration not yet fully enforced

C22

Jackpot ladder is deterministic

GAP

Ladder exists normatively; on-chain multi-level state transition not yet complete

C23

Jackpot funded only after mandatory obligations

GAP

Economic priority is normative; complete funding transition is not yet enforced

C24

Jackpot payout is frozen

GAP

Requires complete jackpot winning/reveal/claim state machine

C25

Jackpot post-win reset/rebuild is deterministic

GAP

Reset rule is normative but implementation not complete

C26

Single claim

PARTIAL

Validator protects ownership and payout; legacy and B1 claim paths still need consolidation

C27

Expiry is fixed at mint

PARTIAL

Datum fields exist; complete mint-time duration enforcement must be verified

C28

Historical reveal after expiry does not create a claim

PARTIAL

Normative requirement defined; full implementation path requires verification

C29

Failed proof/data path fails closed

PARTIAL

Core validators reject invalid data; complete cross-component audit required

C30

Backend/relayer cannot determine economic outcome

PARTIAL

Constitutional architecture is explicit; end-to-end adversarial proof remains

C31

Governance cannot override individual outcomes

PARTIAL

Boundaries are documented; exact parameter immutability/limits need implementation proof

C32

On-chain/off-chain economic parity

PARTIAL

Mirrors and tests exist; current claim/payment path still contains known divergence risks

C33

B1/B2/B3 trust model honestly declared

DONE

Repository explicitly distinguishes B1 from B3

C34

Publisher-independent canonicality for B3

TARGET

Requires complete finality/state proof path

C35

Repository-wide non-regression

PARTIAL

Documentation now aligned directionally; remaining economic/legacy docs still require cleanup

3. Deterministic Economy Workstream

3.1 Ticket Ladder

ID

Requirement

Status

Required proof

E1

Canonical ladder = 1/2/3/5/10/25/50/100 USDM

PARTIAL

Align Plutus, TS, UI and tests

E2

Class price is economic USDM value, not fixed ADA

GAP

Replace fixed 1 ADA sale assumption in payment path

E3

Class selection derived from verified economic state

GAP

Implement deterministic CurrentActiveClass derivation

E4

Class availability evaluated post-sale

GAP

Prove reservation + risk-capacity check before mint

E5

Higher class suspension does not invalidate existing tickets

PARTIAL

Add explicit lifecycle tests

E6

Hysteresis prevents oscillation

GAP

Add activation/suspension thresholds and state transition tests

3.2 Exposure and Solvency

ID

Requirement

Status

Required proof

E7

Statistical unresolved reserve

DONE

Formula/model and B1 reserve accounting present

E8

Statistical reserve is explicitly not worst-case guarantee

DONE

Normative documents now distinguish both concepts

E9

Worst-case normal exposure = 500 × P × N

PARTIAL

Formula normative; aggregate/per-class enforcement still missing

E10

Per-class unresolved count/exposure

GAP

Add class-aware economic accounting

E11

Global exposure cap

GAP

Add aggregate deterministic exposure accounting

E12

Safety floor

GAP

Freeze numeric/model rule before implementation

E13

Post-sale solvency invariant

GAP

Validator must reject unsafe class issuance

E14

No double counting of liabilities/reserves/Jackpot

PARTIAL

EffectivePool already separates categories; complete transitions need proof

3.3 Jackpot

ID

Requirement

Status

Required proof

E15

M = 500 × HighestClassEverActivated

GAP

Add historical class state

E16

Jackpot ladder 10/20/50/100/250 × M

PARTIAL

Normative only until state machine is implemented

E17

Threshold distinct from current locked balance

PARTIAL

Datum fields exist; semantics need complete transition tests

E18

Funding only from distributable surplus

GAP

Treasury/PrizePool transition required

E19

Locked Jackpot excluded from EffectivePool

DONE

B1 accounting already includes ppLockedJackpot

E20

Jackpot winner derived from canonical randomness

GAP

Define and implement Jackpot trigger/selection

E21

Jackpot payout becomes immutable

GAP

Add jackpot claim/reveal state

E22

Jackpot paid amount not double-reserved

GAP

Add explicit accounting transition tests

E23

Jackpot resets after payout and rebuilds

GAP

Freeze exact reset rule and implement

4. On-Chain Modules

Module

Constitutional scope

Status

Required action

plutus/Types.hs

Economic/ticket state

PARTIAL

Add class-aware exposure state, active/highest class and Jackpot state as required

plutus/GameRules.hs

Symbols, tiers, normal payout

PARTIAL

Preserve current payout table; extend only where approved by economic spec

plutus/B1PrizePool.hs

Pool, reserve, liabilities, Jackpot

PARTIAL

Extend deterministic class/exposure/Jackpot accounting

plutus/PrizeValidator.hs

Reveal/claim/frozen payout

PARTIAL

Consolidate claim semantics and settlement asset handling

plutus/MintPolicy.hs

Ticket issuance/payment/binding

GAP

Remove fixed 1 ADA economic assumption; bind exact USDM-equivalent payment and class eligibility

plutus/Treasury.hs

Treasury allocations

PARTIAL

Enforce exact category destinations/remainder rules

plutus/Beacon.hs

Randomness/domain separation

PARTIAL

Preserve current derivation; add any Jackpot domain separation only after specification freeze

plutus/BeaconRegistry.hs

B1 Beacon publication

PARTIAL

Keep B1 trust boundary explicit; do not claim B3

Script export/factories

Artifact parity

PARTIAL

Regenerate after datum/redeemer changes

5. Off-Chain / Frontend

File / area

Requirement

Status

Required action

src/mint.ts

Dynamic class/payment construction

GAP

Build selected class and exact USDM-equivalent payment

src/tickets.ts

Ticket sale semantics

GAP

Remove non-atomic legacy assumptions

src/gameFlow.ts

Reveal/claim pool update

PARTIAL

Align USDM payout with actual settlement asset

src/claim.ts / src/claimFlow.ts

Canonical claim path

GAP

Remove legacy competing path and use frozen payout

src/gameRules.ts

Mirror GameRules

PARTIAL

Keep byte-for-byte parity with Plutus

src/config.ts

Economic parameters

PARTIAL

Separate constitutional constants from governed parameters

UI

Active class/payment presentation

GAP

Show verified active class and exact settlement quote

UI

Honest B1 disclosure

PARTIAL

Ensure no UI implies B3

Metadata

Pre-reveal opacity

PARTIAL

Audit public ticket fields and metadata

Settlement builder

USDM/ADA/other assets

GAP

Implement verified conversion and no-underpayment rounding

6. Oracle / Settlement

Requirement

Status

Required action

Oracle freshness

DONE

Existing C-03 coverage

Oracle authorization

DONE

Existing C-03 coverage

Asset identity

DONE

Existing C-03 coverage

Precision

DONE

Existing C-03 coverage

Min-UTxO exclusion

DONE

Existing C-03 coverage

Ceiling rounding

DONE

Existing C-03 coverage

USDM + ADA valuation

DONE

Existing mirror coverage

Multi-asset pool valuation

DONE

Existing mirror coverage

Ticket purchase quote

GAP

Apply same verified mechanism to sale path

Claim settlement quote

PARTIAL

Validator path strong; TS builder must be aligned

Stale/invalid settlement quote rejection

PARTIAL

Verify end-to-end transaction construction

7. Beacon / B3

Requirement

Status

Required action

B1 authorized publisher

DONE

Current scope

PoC-0 extraction

PARTIAL

Evidence extraction only

GRANDPA signature verification

PARTIAL

PoC-1A coverage exists

Quorum math

PARTIAL

Verified mirror logic; full integration pending

Ancestry proof

GAP

Current PoC intentionally rejects unverified ancestry

State/storage proof

GAP

Future B3 work

Publisher-independent canonicality

TARGET

Future B3

Cardano final verifier

TARGET

Future B3

Conflicting-root rejection

PARTIAL

Normative requirement; complete B3 path pending

8. Documentation Set

Document

Role

Status

Required action

docs/CONSTITUTION.md

Binding invariants

READY FOR ECONOMIC BASELINE

Replace old 2-USDM text with Constitution V3

docs/Game-Economy.md

Normative economic implementation model

READY FOR REVIEW

Keep aligned with Constitution V3

docs/Game-Economy-Specification.md

Detailed economic specification

READY FOR REVIEW

Remove obsolete 2-USDM/floor conflicts

docs/CONSTITUTION-GAP-MATRIX.md

Implementation tracker

UPDATED BASELINE

This document

docs/treasury-distribution-spec.md

Treasury details

GAP

Remove legacy dynamic-pricing model and reconcile allocations

docs/architecture-spec.md

Technical architecture

PARTIAL

Reconcile economic state, class activation and claim semantics

docs/B1-Audit-Report.md

B1 evidence

HISTORICAL/VALID

Do not rewrite as future architecture; append future economic gap references when needed

docs/B1-MIMO-AUDIT-REPORT.txt

Historical audit

HISTORICAL

Keep historical claims tied to tested baseline

docs/poc1-spec.md

B3 evidence path

PARTIAL/TARGET

Preserve B1/B3 separation

9. Required Implementation Order

The economic implementation must proceed in this order:

Documentation freeze

Constitution V3

Game-Economy

Game-Economy-Specification

Gap Matrix

Treasury distribution specification

Economic state model

class identity

unresolved exposure

class caps

active class

highest-ever class

safety floor

Jackpot state

Ticket issuance

selected class

exact USDM-equivalent payment

oracle quote

atomic reservation

post-sale solvency

PrizePool

deterministic exposure accounting

class-aware reserve

activation/suspension

hysteresis

Jackpot funding

Reveal / claim

frozen payout

multi-asset settlement

canonical claim path

no legacy claim divergence

Jackpot

ladder

trigger

selection

payout

reset/rebuild

Adversarial tests

unsafe issuance

class oscillation

over-exposure

stale oracle

Jackpot double reservation

Jackpot double claim

cross-class replay

Only then production gate

10. Definition of DONE

A deterministic economic invariant may be marked DONE only when:

Constitution requirement is explicit

Game-Economy agrees

Game-Economy-Specification agrees

Plutus enforces it

TypeScript mirrors it

UI does not contradict it

tests cover positive and negative cases

generated artifacts are synchronized

no legacy document contradicts it

Until all applicable checks are satisfied:

Status remains PARTIAL or GAP.