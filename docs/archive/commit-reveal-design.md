PRE-RICH — Commit-Reveal and Result Secrecy Design

Protocol baseline: Constitution V3 — Deterministic Economy
Status: Normative reconciliation candidate — aligned with the current protocol baseline
Scope: Commit/reveal, deterministic result derivation, Beacon trust, expiry interaction, claim semantics and audit evidence.

1. Core Rule

No ticket result may be known or chosen by the player before the reveal step.

The system MUST use a commit-reveal pattern in which:

the player commits to a secret before reveal;

the Beacon used for the round is fixed according to the configured Beacon trust model;

the player later reveals the secret;

the validator deterministically derives the ticket seed;

the validator deterministically generates the symbols;

the validator derives the prize tier and payout.

The player MUST NOT submit the symbol vector as an authoritative game input.

The validator is the economic and game-state authority.

2. Security Model

The deterministic result is a function of validated protocol inputs:

Beacon
+
playerSecret
+
ticket identity
+
ticket nonce
+
game version
+
other committed game parameters

Conceptually:

validated Beacon
       +
playerSecret
       +
ticket parameters
       ↓
ticketSeed
       ↓
symbolsSeed
       ↓
symbols
       ↓
tier
       ↓
payout

The frontend MAY reproduce this computation for UX and independent verification.

It MUST NOT become the authoritative source of the result.

3. Required Sequence

3.1 Ticket purchase / issuance

The player receives or purchases a unique ticket NFT according to the current issuance architecture.

The player generates a secret and computes the commitment.

The commitment is submitted before the secret is revealed.

The commitment MUST bind the secret to the exact protocol context required by the canonical commit-reveal rules.

3.2 Commitment registration

The commitment is stored in the authoritative on-chain ticket state.

The commitment MUST be sufficient for the validator to establish that the revealed secret is the secret previously committed.

The system MUST NOT rely on a backend database as the authoritative commitment store.

3.3 Beacon finalization

Before the ticket can be revealed, the applicable Beacon for the target round MUST be available.

The Beacon is validated according to the configured trust model:

B1 — authorized publisher
B2 — committee attestation
B3 — publisher-independent canonical-state proof

B3 is the preferred long-term architecture.

A BeaconRegistry entry does not automatically authenticate an arbitrary external value. Its authority depends on the active Beacon trust model and the validation rules governing the accepted Beacon.

4. Reveal

The player reveals:

playerSecret

The validator then:

verifies the player commitment;

reads the correct Beacon reference;

verifies Beacon validity under the active trust model;

derives the ticket seed;

derives the symbols seed;

generates the symbol vector;

classifies the generated vector;

derives the payout amount;

records the resulting ticket state.

The player MUST NOT provide authoritative:

symbols
tier
payout

Those values are derived from validated inputs.

5. Deterministic Result Derivation

The canonical result pipeline is:

Beacon
  │
  ├── round / target binding
  │
  ▼
deriveTicketSeed(...)
  │
  ▼
deriveSymbolsSeed(...)
  │
  ▼
generateSymbols(...)
  │
  ▼
classifyTier(...)
  │
  ▼
prizeAmountForTier(...)

Every cryptographic derivation MUST use the protocol's documented domain separation and versioning.

The same valid inputs MUST produce the same result.

Any change to the cryptographic domain, seed derivation, symbol generation or classification rules is a protocol change and requires updated normative documentation and golden vectors.

6. Why the Player Cannot Choose the Symbols

A reveal transaction contains the committed secret, not an authoritative symbol vector.

Therefore a player cannot submit:

[5,5,5,5,5,5]

or another preferred vector and ask the validator to accept it.

The validator independently calculates:

expectedSymbols = generateSymbols(symbolsSeed)

and derives the tier from those symbols.

This property is mandatory for fairness.

7. Beacon Timing and Grinding

Beacon timing is part of the fairness model.

The Beacon used for a ticket MUST be associated with a deterministic target or round.

The active Beacon trust model MUST be explicit.

B1 does not eliminate publisher bias.

B2 does not eliminate underlying-source bias merely because multiple parties attest to a value.

B3 does not become trustless merely because a value is stored on Cardano.

B3 is trustless with respect to the relevant external canonicality only when the verification/anchor mechanism actually establishes that canonical relationship.

Block-production or source-selection grinding is a separate property and MUST NOT be claimed to be eliminated merely by selecting B1, B2 or B3.

8. Materios, Orynq and External Evidence

External systems may provide:

receipts;

observations;

attestations;

process traces;

batch roots;

audit evidence.

They are not automatically payout authorities.

If an external observation is required for Beacon generation, the observation MUST be bound to Cardano through a verifiable mechanism before it can be treated as a trustless game input.

The architecture therefore distinguishes:

External observation
        ≠
L1-authenticated fact
        ≠
canonical protocol state

unless the required verification chain establishes those relationships.

9. B3 L1-Anchor Model

The target B3 architecture is conceptually:

Materios / Partner Chain / external source
                 │
                 ▼
          authenticated fact
                 │
                 ▼
        Cardano L1 anchor UTxO
                 │
          validator / policy
          enforces validity
                 │
                 ▼
          BeaconRegistry
                 │
                 ▼
          PrizeValidator

Potential anchor mechanisms include:

a bridge/state UTxO whose datum contains the relevant reference and commitment and whose validator enforces update rules;

a Beacon NFT whose minting policy constrains the encoded round and value;

a cryptographic proof-verified state anchor.

A normal metadata field such as:

mcHash = X

is not sufficient by itself.

The B3 security claim depends on the actual verification rules, not on the presence of a hash in metadata.

10. Claim

A claim is accepted only when the on-chain ticket state has reached a valid claimable/revealed winning state under the applicable protocol rules.

The claim validator MUST verify, as applicable:

ticket identity;

valid ticket state;

current owner authorization;

frozen payout state;

payout asset and amount;

expiry validity;

sufficient PrizePool liquidity;

absence of a previous successful claim;

correct state transition.

The claim MUST NOT trust a browser-provided prize value.

10.1 CLAIM is distinct from BURN

CLAIM does not require burning the ticket NFT.

The ticket NFT MAY remain with the claimant as proof of participation and as a collectible, according to the protocol's NFT rules.

Conceptually:

ticket NFT
     │
     ├── proves ticket identity / participation
     │
     └── may survive CLAIM

Burn is therefore a separate operation.

A voluntary or protocol-defined burn, where permitted, MUST NOT be required merely to establish the economic validity of a claim unless a future explicit normative decision changes this rule.

Burning or retaining the NFT MUST NOT alter:

the deterministic result;

the payout amount;

the economic entitlement before expiry;

the historical record.

11. Expiry Semantics

Expiry is an economic state transition, not merely a frontend display condition.

Before expiry, a valid revealed winning ticket may retain its claimable economic right according to the canonical ticket state.

At expiry, the unclaimed economic commitment to pay MUST dissolve.

Therefore:

BEFORE EXPIRY
winning revealed ticket
        ↓
claimable economic right

AFTER EXPIRY
winning revealed ticket
        ↓
historical state only
        ↓
no new claim right

11.1 Reveal after expiry

A reveal submitted after expiry MAY be accepted as a historical state transition if and only if the canonical state machine permits that transition.

However:

REVEAL AFTER EXPIRY
        ≠
RESTORATION OF CLAIMABILITY

A late reveal MUST NOT recreate a payment obligation that expired.

The validator MUST NOT transform an expired ticket into a newly claimable winning ticket.

The expiry rule therefore dissolves the commitment to pay at expiry; subsequent historical evidence cannot recreate that commitment.

11.2 Claim after expiry

A claim that would rely on an economic right already dissolved by expiry MUST be rejected.

Historical reveal evidence does not extend the economic lifetime of the ticket.

12. Receipt Layer

A receipt MAY contain:

ticketId
commitmentHash
playerSecret / reveal reference
gameVersion
Beacon reference
Beacon value
derived symbols
derived tier
derived payout
revealHash
receiptId

However, the receipt is an audit artifact unless it is itself anchored by an L1 object whose validity rules are enforced on-chain.

A backend-produced receipt MUST NOT become authoritative merely because it contains apparently correct values.

The authoritative state remains the validated on-chain state.

13. Ownership and Transfer

The current ticket owner is the relevant owner for permissionless operations requiring ownership.

The protocol MUST NOT assume that the original purchaser remains the owner.

A ticket may therefore follow:

Alice
  ↓
Bob
  ↓
Charlie
  ↓
Reveal
  ↓
Claim

without changing its deterministic result.

Transfer MUST NOT modify:

ticket identity;

commitment;

Beacon binding;

deterministic result;

frozen payout.

14. Domain Separation

Every cryptographic derivation MUST use explicit domain separation.

The domain MUST be:

explicit;

versioned;

deterministic;

documented;

identical between authoritative and independent implementations.

A cryptographic-domain change is a protocol change and requires updated test vectors and conformance evidence.

15. Trust-Model Status

B1 — Authorized Publisher

Status: current interim operational architecture.

Trust assumption:

configured authorized publisher

B1 is operationally useful but is not fully trustless.

B2 — Committee Attestation

Status: optional future architecture.

Trust assumption:

correct attestation set and threshold

B2 reduces dependence on a single publisher but does not automatically prove objective canonicality of the underlying external protocol.

B3 — Canonical-State Proof

Status: target architecture.

Trust assumption:

correct cryptographic verification and/or
correct authenticated L1 anchor enforcement

B3 moves the trust boundary into the verification/anchor mechanism.

B3 MUST NOT be claimed as implemented until the required verification path exists and is independently demonstrated.

16. Acceptance Criteria

The commit-reveal design is accepted only when:

the player cannot choose the symbol vector;

the player cannot alter the committed secret;

the Beacon is fixed according to an explicit trust model;

an arbitrary backend cannot substitute an unauthenticated Beacon;

symbols are deterministically derived by the authoritative implementation;

tier is deterministically derived;

payout is deterministically derived;

the result is bound to the ticket context;

claim depends on validated on-chain state;

claim does not require NFT burn;

expiry dissolves the payment commitment;

a post-expiry reveal cannot recreate claimability;

frontend/backend infrastructure cannot authorize an invalid payout.

For B3 specifically, acceptance additionally requires:

a real L1 anchor or equivalent verification mechanism;

review of its validator/policy or proof verifier;

evidence that the mechanism proves the external fact PRE-RICH actually needs;

canonical Beacon consumption rather than arbitrary publisher input;

uniqueness and conflict handling for the canonical checkpoint.

17. Conformance Requirements

Conformance must be demonstrated across:

Normative specification
        ↓
Plutus types
        ↓
Validator / policy
        ↓
Off-chain transaction construction
        ↓
Frontend derivation
        ↓
Positive tests
        ↓
Negative / adversarial tests
        ↓
Reproducible evidence

A legacy document or checklist entry is not proof of current conformance.

In particular, older implementation claims MUST be re-evaluated against the current V3 economic model.

18. Implementation Status Boundary

This document defines the protocol behavior and acceptance criteria.

It does not claim that every requirement is already implemented.

The repository MUST distinguish:

NORMATIVE REQUIREMENT
        ≠
IMPLEMENTED
        ≠
TESTED
        ≠
PROVEN
        ≠
B3 / MAINNET READY

The current project may therefore have a semantically consolidated economic model while still having implementation-conformance work remaining.

That distinction is mandatory for the open-source baseline.

19. Final Normative Principles

The following principles are non-negotiable:

The player commits before reveal.

The validator derives the result.

The player does not choose authoritative symbols.

Beacon provenance is governed by an explicit trust model.

External evidence is not automatically canonical.

B1 is not B3.

Claim is distinct from NFT burn.

A claim does not require burning the ticket NFT.

Expiry dissolves the unclaimed payment commitment.

A post-expiry reveal cannot recreate claimability.

Historical evidence cannot recreate an expired economic right.

Frontend and backend infrastructure cannot authorize an invalid payout.

Cryptographic derivation is versioned and domain-separated.

Implementation status must never be inferred solely from historical documentation.

These principles form the normative baseline for the commit-reveal and result-secrecy layer
