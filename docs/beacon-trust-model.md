Beacon Trust Model
1. Purpose

This document defines how PRE-RICH obtains and validates the Beacon used as an input to ticket-result generation.

The purpose is to distinguish:

a value merely published on Cardano;
a value authorized by a signer;
a value proven by an on-chain cryptographic proof;
a value represented by an L1 object whose own validator/policy enforces its correctness.

The system MUST NOT describe a Beacon as "100% trustless" without identifying the exact rule that makes its value trustworthy.

2. Fundamental distinction

Cardano validators can directly inspect the transaction being validated, including:

inputs;
outputs;
reference inputs;
datums;
redeemers;
minting/burning;
signatories;
validity interval.

They do not automatically have access to arbitrary historical or external state.

Therefore:

Cardano datum contains mcHash = X


does not imply:

X is the authentic external/mainchain hash.


A separate on-chain rule must establish that relationship.

3. Trust models
B1 — Authorized publisher

A publisher is authorized to publish a Beacon.

The Registry verifies:

authorized signer
+
correct round
+
correct target
+
valid Beacon derivation


Security depends on the publisher or publisher committee.

Advantages:

simple;
low engineering cost;
immediately deployable.

Disadvantages:

not fully trustless;
publisher compromise can affect Beacon selection;
governance/key management required.

B1 is the recommended interim architecture for v1.02.

B2 — Proof-verified anchor

The Beacon update contains a cryptographic proof.

The Registry verifies the proof on-chain.

Security depends on:

correctness of the proof system;
correctness of the Plutus verifier;
validity of the underlying protocol assumptions.

B2 can reduce or remove trusted publisher assumptions but may have significant implementation complexity.

B3 — L1 anchor

An existing Cardano L1 object is used as the Beacon source.

The object may be:

a UTxO with a known validator;
a datum controlled by a known state-transition script;
an NFT governed by a specific minting policy;
a bridge/state anchor;
another L1 object whose validity is cryptographically constrained.

The PRE-RICH BeaconRegistry reads that object through a reference input.

The Registry verifies:

canonical anchor identity;
expected round;
expected target;
expected fields;
Beacon derivation;
freshness.

The Registry does not need to trust a backend publisher if the anchor's own script guarantees the relevant fact.

4. B3 is not automatically trustless

B3 is trustless only if:

Anchor exists
+
Anchor identity is canonical
+
Anchor creation/update is constrained
+
Anchor data is tied to the fact PRE-RICH needs


For example:

Bridge validator
    ↓
only allows datum {ref, mcHash}
when valid according to bridge rules
    ↓
Anchor UTxO
    ↓
BeaconRegistry


is fundamentally different from:

backend
    ↓
creates arbitrary UTxO
    ↓
datum {ref, mcHash}
    ↓
BeaconRegistry


The second construction does not prove the external fact.

5. Examples
Valid candidate

A Partner Chain bridge/state validator maintains:

{
  "slot": 12345,
  "ref": "...",
  "mcHash": "..."
}


and its validator only permits state transitions that satisfy the Partner Chain consensus/proof rules.

PRE-RICH may consume that UTxO as an L1 anchor.

Invalid trust assumption

A relayer writes:

{
  "mcHash": "..."
}


to an ordinary script UTxO.

The datum is on Cardano, but there is no rule proving why the relayer was entitled to write that value.

This is not trustless B3.

Committee bridge

An N-of-M bridge publishes:

mcHash


and the bridge validator checks the committee signatures.

This may be cryptographically enforced on L1, but its security remains dependent on the committee.

It is therefore an L1-enforced B1-style trust model, not pure consensus-derived B3.

6. Materios / Orynq / Flux

The current operational assumption is:

Materios observes mcHash / external state


This observation alone is not sufficient to claim a trustless Beacon.

The team must identify exactly what Materios/Orynq/Flux already writes to Cardano and determine:

what UTxO contains the relevant data;
what validator or policy controls that UTxO;
who can create/update it;
what proof or consensus rule constrains the data;
whether the reference is deterministic;
whether the object is unique for a round;
whether stale or conflicting anchors are rejected.

Only after this analysis can that object be promoted to the PRE-RICH B3 anchor.

7. The 8746 question

A Materios-related metadata/anchor such as "8746" must not automatically be treated as the Beacon source.

The operational question is:

Does the 8746 object prove exactly the fact required by PRE-RICH for the round?

If it is merely:

Partner Chain state → Cardano metadata


then it may be useful as an audit anchor but not necessarily as a Beacon trust anchor.

The correct evaluation is:

What does 8746 prove?
        ↓
Is that fact the required mcHash/ref?
        ↓
Who can write it?
        ↓
What script/policy constrains it?
        ↓
Can PRE-RICH verify those constraints?


Until these questions are answered, 8746 remains an investigated candidate, not an assumed trust anchor.

8. Canonical anchor requirements

The future B3 implementation SHOULD identify the anchor using a deterministic mechanism.

Preferred mechanisms:

unique Beacon/anchor NFT;
deterministic script address plus unique round token;
deterministic reference UTxO known from an authenticated state transition.

The Registry should not select:

"first matching reference input"


from an arbitrary set.

It should establish:

exactly one canonical anchor


for the requested round/target.

9. Registry responsibilities

The BeaconRegistry should remain intentionally small.

It should verify:

anchor identity
+
round
+
target
+
required fields
+
Beacon derivation
+
state transition


It should not duplicate:

external consensus verification;
bridge proof verification;
Materios protocol verification.

Those responsibilities belong to the anchor layer.

10. Security boundary

The intended architecture is:

                 ┌──────────────────────────┐
                 │ External protocol        │
                 │ / Materios / Partner     │
                 └────────────┬─────────────┘
                              │
                    observation / proof
                              │
                              ▼
                 ┌──────────────────────────┐
                 │ L1 Anchor                │
                 │ validator / mint policy  │
                 └────────────┬─────────────┘
                              │
                       canonical UTxO
                              │
                              ▼
                 ┌──────────────────────────┐
                 │ BeaconRegistry            │
                 │ deterministic adapter     │
                 └────────────┬─────────────┘
                              │
                         Beacon value
                              │
                              ▼
                 ┌──────────────────────────┐
                 │ PrizeValidator            │
                 │ game fairness + payout    │
                 └──────────────────────────┘


This is the target trust boundary.

11. Roadmap
Phase 1 — v1.02

Use B1:

authorized publisher;
canonical Registry identity;
exact round/target checks;
no arbitrary publisher replacement.
Phase 2 — anchor discovery

Investigate existing:

Materios anchors;
Orynq proof objects;
Flux/Partner Chain bridge UTxOs;
metadata/NFT anchors;
existing Cardano scripts.
Phase 3 — B3 specification

For the selected anchor define:

datum schema;
asset identity;
creation rule;
update rule;
round mapping;
reference mapping;
freshness;
replay protection;
conflict handling.
Phase 4 — B3 implementation

Change BeaconRegistry so that it reads only the canonical L1 anchor.

Phase 5 — adversarial audit

Test:

fake anchor;
duplicate anchor;
stale anchor;
wrong round;
wrong target;
conflicting anchors;
fake mcHash;
replayed anchor;
malformed datum;
missing reference input;
multiple reference inputs;
unauthorized anchor update.
12. Claims policy

PRE-RICH may use the following language:

Allowed

"Beacon is derived from a Cardano L1 anchor whose validity is enforced by an on-chain validator."

when B3 has been verified.

Not allowed

"Beacon is trustless because it is stored on Cardano."

A datum being on Cardano is not sufficient.

Allowed for B1

"Beacon publication is controlled by an authorized publisher/committee."

Allowed for external receipts

"Materios/Orynq provides an audit/attestation layer."

unless a specific on-chain proof binds the external fact.

13. Final principle

The security of B3 is not created by the BeaconRegistry.

It is inherited from the object that the BeaconRegistry reads.

Therefore:

The Registry should be as dumb as possible; the anchor should be as provable as necessary.

If the anchor is weak, B3 is weak.

If the anchor is consensus-grade or proof-verified, the Registry can remain simple and deterministic.