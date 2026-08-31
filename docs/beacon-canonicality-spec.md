PRE-RICH Beacon Canonicality Specification
Status
Design target — B3.

This document specifies the interface between PRE-RICH and a future canonical Materios proof adapter.

It does not claim that B3 is currently deployed.

The current deployed/operational Beacon path remains B1.

The current investigation has, however, established an important concrete fact about the Materios integration:

Materios uses Aura + GRANDPA.
The Materios runtime exposes the standard GrandpaApi.
GrandpaApi::grandpa_authorities() is implemented by the runtime.
GrandpaApi::current_set_id() is implemented by the runtime.
The runtime therefore exposes the information required to begin constructing an independent finality/checkpoint proof path.
This can be investigated through RPC without modifying the Materios source tree.
The first proof milestone is therefore deliberately smaller than full B3:

obtain a real finalized Materios checkpoint and a real GRANDPA authority-set snapshot through an external adapter, and produce a deterministic CanonicalCheckpoint.

This is a PoC milestone, not yet a B3 security claim.

1. Scope
The purpose of this specification is to answer one precise question:

Given a PRE-RICH roundId and its fixed checkpointRef, how can Cardano determine that a claimed root is the canonical Materios root for that checkpoint without trusting the publisher?

The answer must ultimately be expressible as an on-chain verification predicate.

The investigation is intentionally staged.

First:

Materios
    |
    | RPC
    v
external adapter
    |
    +-- finalized head
    +-- header
    +-- state root
    +-- runtime version
    +-- GRANDPA authority set
    +-- GRANDPA set ID
    |
    v
CanonicalCheckpoint

Only after this is independently understood should the project move toward:

CanonicalCheckpoint
    +
finality proof
    +
storage proof
    |
    v
B3 proof
    |
    v
Cardano verification

No Halo2 implementation is required for the first milestone.

2. Core predicates
Define:

Checkpoint(roundId) -> ref

and:

Canonical(ref, root)

The B3 proof system must implement:

VerifyCanonical(ref, root, proof)

with the security property:

VerifyCanonical(ref, root, proof) = true
    =>
Canonical(ref, root)

The publisher identity is not an input to canonicality.

3. Round binding
Before ticket commitments:

CreateRound(roundId)

must establish:

roundId
checkpointRef
version

Conceptually:

roundId = 42
checkpointRef = C42

Once created:

checkpointRef

is immutable for that round.

The publisher MUST NOT be able to choose a different checkpoint after observing ticket commitments.

4. Deterministic checkpoint function
The protocol defines:

checkpointRef = f(roundId)

The exact function MUST be specified before production implementation.

The specification MUST define:

domain separator;
encoding;
protocol version;
Materios genesis/network identifier;
checkpoint rule;
finality rule;
timeout behavior;
stale checkpoint behavior.
A possible abstract form is:

f(roundId)
    =
    H(
        "PRE-RICH/MATERIOS/CHECKPOINT/V1"
        ||
        materiosGenesisHash
        ||
        roundId
        ||
        checkpointRule
        ||
        checkpointValue
    )

This is an example of the encoding model, not the final byte-level protocol definition.

The PoC MUST first determine what a concrete Materios checkpoint consists of.

5. Materios checkpoint evidence
The first PoC establishes a real checkpoint from the Materios node without modifying Materios.

The intended RPC flow is:

chain_getFinalizedHead
        |
        v
finalized block hash
        |
        +--------------------+
        |                    |
        v                    v
chain_getHeader       state/runtime queries
        |                    |
        v                    |
block number                |
state root <----------------+

The adapter must additionally obtain the runtime version and GRANDPA state associated with the selected checkpoint.

The first concrete GRANDPA Runtime API targets are:

GrandpaApi_grandpa_authorities
GrandpaApi_current_set_id

These correspond to the runtime implementations:

Grandpa::grandpa_authorities()
Grandpa::current_set_id()

The PoC MUST use the actual runtime API responses and decode their SCALE representation.

It MUST NOT infer the current authority set from unrelated metadata when the runtime API is available.

It MUST NOT rely on:

grandpa_pending_change

as a substitute for the current authority list.

6. CanonicalCheckpoint
The first implementation milestone is a deterministic external evidence object:

CanonicalCheckpoint

Conceptually:

{
  "chain_id": "materios",
  "runtime_spec_version": 235,
  "checkpoint": {
    "block_number": 123,
    "block_hash": "0x...",
    "state_root": "0x..."
  },
  "grandpa": {
    "set_id": 0,
    "authorities": [
      {
        "public_key": "0x...",
        "weight": 1
      }
    ]
  }
}

The exact JSON representation is an adapter format and is not itself a proof of canonicality.

Its purpose is to establish a reproducible real-world test vector.

The PoC MUST demonstrate:

finalized head retrieval;
finalized header retrieval;
state-root extraction;
runtime-version extraction;
GRANDPA authority-list extraction;
GRANDPA set-ID extraction;
deterministic authority commitment;
deterministic checkpoint serialization.
This milestone is called POC-0.

7. Important trust boundary
The external adapter is untrusted.

Its role is:

fetch
decode
normalize
construct evidence

It is not allowed to become the source of truth.

Therefore:

Materios
    |
    v
untrusted adapter
    |
    v
CanonicalCheckpoint

does not by itself constitute B3.

The purpose of POC-0 is to establish that the required underlying data is actually available and correctly understood.

The later B3 architecture must independently verify the relevant claims.

8. Canonical Materios state
The selected checkpoint identifies a specific Materios state.

The canonicality relation must eventually mean:

Canonical(ref, root)

if and only if the Materios protocol state associated with ref contains the root selected by the PRE-RICH anchor rule.

The exact state object must be fixed.

For example:

Anchors[K] = AnchorRecord

where:

K = canonicalAnchorKey(roundId, checkpointRef)

and:

AnchorRecord.rootHash = root

The key derivation MUST be deterministic.

The publisher MUST NOT supply the key independently of the round.

9. Canonical anchor key
A recommended conceptual key is:

K =
    H(
        "PRE-RICH/MATERIOS/BEACON/V1"
        ||
        roundId
        ||
        checkpointRef
    )

The production implementation MUST specify:

exact byte encoding;
hash function;
endianness;
length prefixes;
network/domain separation;
protocol version.
The key must be derivable independently by the verifier.

10. Proof statement
The B3 proof statement contains:

roundId
checkpointRef
root
context

and any fixed protocol parameters required to verify the Materios state.

Conceptually:

ProofStatement {
    roundId
    checkpointRef
    root
    context
    protocolVersion
}

The proof must establish:

checkpointRef corresponds to the round;
the referenced Materios state is canonical/finalized;
the canonical state contains the expected key;
the key resolves to the claimed anchor;
the anchor contains root;
context is the context bound to that anchor.
11. Proof-generation boundary
The proof generator is off-chain.

It may perform expensive operations such as:

RPC access;
header retrieval;
finality verification;
authority-set processing;
SCALE decoding;
storage-trie verification;
receipt lookup;
proof construction.
The generator is NOT trusted.

Its output is:

π

Cardano must verify π.

A malicious generator can at most produce an invalid proof which Cardano rejects.

12. Proof discovery: updated architecture
The current investigation should proceed in this order:

Materios node
      |
      | JSON-RPC
      v
chain_getFinalizedHead
      |
      v
finalized header
      |
      +---- block hash
      +---- block number
      +---- state root
      |
      +---- runtime version
      |
      +---- GrandpaApi
               |
               +---- authority list
               |
               +---- set ID
      |
      v
CanonicalCheckpoint
      |
      v
independent finality investigation
      |
      v
storage proof investigation
      |
      v
B3 proof prototype

This ordering is important.

The project must not jump directly from:

RPC -> Halo2

without first demonstrating that the underlying Materios state can be reconstructed and verified.

13. Finality
The proof must not merely prove that a value existed in an arbitrary Materios block.

It must bind the value to a canonical/finalized state according to the selected Materios finality model.

The implementation must specify:

which header is accepted;
what makes it finalized;
which authority set is used;
how authority-set transitions are handled;
how replay is prevented.
The first PoC has already identified the runtime-level sources needed to begin this investigation:

GrandpaApi::grandpa_authorities()
GrandpaApi::current_set_id()

These provide the current GRANDPA authority set and set identifier exposed by the runtime.

They do not, by themselves, constitute a complete finality proof.

The next step is to determine how a verifier can independently establish that the selected finalized header is backed by the appropriate GRANDPA justification and authority-set history.

If the finality proof cannot be verified by the chosen B3 mechanism, the construction MUST NOT claim canonical-state security.

14. Storage proof
The eventual proof should establish a statement equivalent to:

StorageProof(
    stateRoot,
    K,
    AnchorRecord
)

such that:

VerifyStorageProof(
    stateRoot,
    K,
    AnchorRecord,
    π_storage
)

implies that AnchorRecord is the value stored at K in that state.

The proof must bind:

K

to:

roundId + checkpointRef

through the deterministic PRE-RICH key function.

A proof of an arbitrary anchor_id selected by the publisher is insufficient.

15. Succinct proof option
If direct verification of Materios finality and storage proofs is too expensive for Plutus, the target architecture may use a succinct proof.

Conceptually:

Witness:
    finalized header
    finality evidence
    authority data
    state root
    storage proof
    AnchorRecord

Public inputs:
    roundId
    checkpointRef
    root
    context

Circuit:

verify finality
verify state root
verify storage proof
verify canonical key
verify AnchorRecord

Output:

π

Cardano verifies:

Verify(π, publicInputs)

The proof generator remains untrusted.

The exact proof system remains an implementation decision.

Halo2 is therefore a later implementation candidate, not a prerequisite for POC-0.

16. Canonical Beacon Anchor
The verified result should be represented on Cardano by:

CanonicalBeaconAnchor

Conceptual datum:

{
    roundId,
    checkpointRef,
    root,
    context,
    commitment
}

The exact datum encoding is implementation-specific but MUST be versioned.

The anchor MUST be associated with a deterministic identity.

The anchor's existence does not itself establish canonicality.

Canonicality must already have been established by:

RootProof

or by an L1 mechanism whose own validator/policy enforces the required relationship.

17. One-shot anchor policy
The anchor layer MUST provide:

at most one finalized anchor per roundId

Possible mechanisms include:

unique NFT;
deterministic script address plus round token;
immutable round UTxO;
state machine with one-way Pending -> Ready transition.
The one-shot mechanism prevents competing finalized anchors.

It does not establish correctness of the root.

Therefore:

one-shot
+
RootProof

are separate requirements.

18. Anchor state machine
The intended state machine is:

Pending
   |
   | valid B3 proof
   v
Ready

The transition must verify:

roundId
checkpointRef
root
context
proof
deriveBeacon(...)

The transition must reject:

wrong round;
wrong checkpoint;
wrong target;
invalid proof;
conflicting root;
stale checkpoint;
replay;
second finalization.
19. Beacon derivation
After successful canonicalization:

R =
    deriveBeacon(
        target,
        root,
        context
    )

The resulting:

R

is the only Beacon value exposed to the game.

The publisher does not choose R.

R is a deterministic consequence of the canonical anchor.

20. BeaconRegistry integration
The Registry remains intentionally small.

In B3 mode it consumes:

CanonicalBeaconAnchor

through a reference input.

Conceptually:

CanonicalBeaconAnchor
        |
        | reference input
        v
BeaconRegistry
        |
        +-- round check
        +-- target check
        +-- anchor identity
        +-- canonical fields
        +-- deriveBeacon
        |
        v
Beacon

The Registry MUST NOT accept an arbitrary mcHash as a substitute when the B3 anchor is required.

21. PrizeValidator boundary
The PrizeValidator does not verify Materios.

It consumes the Beacon produced by the Registry.

The result path remains:

Beacon
    +
playerSecret
    +
ticket identity / nonce
    +
game version
        |
        v
ticket seed
        |
        v
symbols
        |
        v
prize tier
        |
        v
payout

This keeps external-protocol verification isolated from game-result logic.

22. 8746 handling
The 8746 Materios checkpoint metadata is treated as external evidence.

It may establish useful audit relationships such as:

receipt
    ->
batch
    ->
Merkle root
    ->
Cardano metadata

It does not automatically establish:

roundId
    ->
canonical checkpoint
    ->
unique root

Therefore an implementation MUST NOT do:

read 8746
    ->
take root
    ->
declare B3

unless an independently enforceable rule establishes canonicality.

8746 may be included as witness/evidence inside the proof-generation process.

It is not itself the root of trust.

23. Conflicting-root property
The canonicality implementation MUST satisfy:

Given:

roundId = R
checkpointRef = C
root_A != root_B

and both:

receipt_A
receipt_B

are externally valid receipt evidence, then:

Canonical(C, root_A)

and:

Canonical(C, root_B)

cannot both hold.

The Cardano verifier must reject any proof that does not establish the canonical state.

24. Publisher-independence property
For any valid proof:

π

the following must hold:

Submitter = Alice

and:

Submitter = Bob

must not change:

VerifyCanonical(C, root, π)

The publisher may transport and submit the proof.

It cannot alter the truth of the proof by signing it.

25. Replay protection
A valid proof for:

roundId = A

MUST NOT be usable for:

roundId = B

unless the protocol explicitly defines both rounds as the same canonical checkpoint.

The proof statement MUST therefore bind the round/checkpoint identity.

The anchor state machine MUST also prevent reuse of a finalized anchor.

26. Stale-proof protection
A proof must be bound to the checkpoint selected for the round.

A valid Materios state at an unrelated checkpoint is not sufficient.

The validator must reject:

proof(ref_old)

when:

canonicalCheckpoint(roundId) != ref_old

27. Multiple anchors
The validator MUST NOT select:

first matching reference input

from an arbitrary set.

The anchor identity must be deterministic.

The desired property is:

roundId
    ->
one canonical anchor identity

The one-shot state machine then ensures that identity cannot be finalized twice.

28. Security model
The B3 security boundary is:

                    Materios
                       |
                finalized state
                       |
                proof generation
                       |
                       v
              untrusted adapter
                       |
                       v
                    proof π
                       |
                       v
          +-----------------------+
          | Cardano verifier      |
          |                       |
          | Canonical(ref, root)  |
          +-----------+-----------+
                      |
                      v
           CanonicalBeaconAnchor
                      |
                      v
               BeaconRegistry
                      |
                      v
               PrizeValidator

The following are explicitly NOT trusted as B3 root-of-trust:

browser;
relayer;
ordinary backend;
8746 metadata;
arbitrary Cardano datum;
first publisher;
external adapter.
The adapter is an evidence producer.

The Cardano verifier is the eventual trust boundary.

29. B1 compatibility
The B3 adapter must be introduced without invalidating the current B1 deployment path.

Current:

RegistryPublish
    +
relayer authorization
    ->
Ready

Target:

B3 proof
    ->
CanonicalBeaconAnchor
    ->
Ready

The downstream Beacon derivation remains the same.

This permits a staged migration:

B1
  ->
B2 (optional)
  ->
B3

without changing the game-result pipeline.

30. Implementation phases
Phase 0 — Real Materios checkpoint PoC
This is the newly established immediate milestone.

Build an external adapter inside the PRE-RICH repository, without modifying Materios.

The adapter must:

connect to Materios RPC
        |
        v
obtain finalized head
        |
        v
obtain header
        |
        v
extract block number
extract block hash
extract state root
        |
        v
obtain runtime version
        |
        v
call GrandpaApi
        |
        +-- authorities
        +-- set_id
        |
        v
SCALE decode
        |
        v
deterministic commitment
        |
        v
CanonicalCheckpoint.json

Required PASS conditions:

finalized head;
header;
state root;
runtime spec version;
GRANDPA authority list;
GRANDPA set ID;
authority commitment;
JSON checkpoint.
The adapter is not yet a B3 verifier.

The purpose is to prove that the real Materios runtime exposes the expected data and that our decoding assumptions are correct.

Phase A — Formal model
Implement the abstract model:

Checkpoint(roundId)
Canonical(ref, root)
VerifyCanonical(ref, root, proof)

and property tests.

Phase B — Materios finality proof discovery
Determine the smallest independently verifiable proof that establishes:

canonical finalized state
+
correct GRANDPA authority context
+
canonical checkpoint

Investigate:

finalized headers;
GRANDPA evidence;
authority-set transitions;
current set IDs;
authority-set history;
storage proofs;
existing bridge/anchor objects;
existing certificates.
The POC-0 Runtime API findings are the starting point for this phase.

Phase C — Storage proof discovery
Determine the smallest proof establishing:

stateRoot
+
canonical key K
+
AnchorRecord

The required property is:

VerifyStorageProof(
    stateRoot,
    K,
    AnchorRecord,
    π_storage
)

Phase D — Proof prototype
Build an off-chain prover capable of producing:

π

for a real Materios test vector.

Minimum milestones:

root_correct -> proof verifies

and:

root_wrong -> proof fails

Phase E — Succinct proof / circuit
If direct verification is too expensive for Plutus, construct a succinct proof system.

Candidate architecture:

Materios finality
      +
storage proof
      +
anchor binding
      |
      v
succinct proof
      |
      v
Cardano verifier

Halo2 may be evaluated at this stage.

It is deliberately not part of POC-0.

Phase F — Cardano verifier
Implement the smallest viable on-chain verifier.

Benchmark:

script size;
execution units;
datum/redeemer size;
transaction size;
proof verification cost.
Phase G — CanonicalBeaconAnchor
Implement:

CanonicalBeaconAnchor

with:

one-shot round semantics;
replay protection;
stale checkpoint rejection;
deterministic identity;
proof verification.
Phase H — Registry integration
Replace B1 authorization with the B3 proof path.

The Registry should accept only:

valid CanonicalBeaconAnchor

in B3 mode.

Phase I — Adversarial audit
Test at minimum:

wrong round;
wrong checkpoint;
wrong root;
wrong context;
wrong target;
invalid finality proof;
invalid storage proof;
altered AnchorRecord;
altered key;
duplicate anchor;
replayed proof;
stale proof;
two conflicting roots;
multiple reference inputs;
fake 8746;
valid 8746 with non-canonical root;
publisher substitution.
31. Current architectural conclusion
The investigation has produced the following architecture:

                 ┌─────────────────────┐
                 │      Materios       │
                 │                     │
                 │ Aura + GRANDPA      │
                 │ finalized state     │
                 └──────────┬──────────┘
                            │
                       JSON-RPC
                            │
                            v
                 ┌─────────────────────┐
                 │  PRE-RICH Adapter   │
                 │      untrusted      │
                 │                     │
                 │ fetch / decode      │
                 │ normalize / prove  │
                 └──────────┬──────────┘
                            │
                            v
                 CanonicalCheckpoint
                            │
                            v
                 finality + storage
                       verification
                            │
                            v
                    B3 proof π
                            │
                            v
                 ┌─────────────────────┐
                 │ Cardano verifier    │
                 └──────────┬──────────┘
                            │
                            v
               CanonicalBeaconAnchor
                            │
                            v
                    BeaconRegistry
                            │
                            v
                    PrizeValidator

The critical architectural property is:

Materios remains unchanged. PRE-RICH does not become a fork of Materios. The external adapter is untrusted and exists only to obtain and prove evidence from the real Materios chain.

32. What has actually been established
The current investigation has established:

Materios is a separate repository from PRE-RICH.
The PRE-RICH PoC can therefore be developed independently.
Materios exposes a real runtime GrandpaApi.
The runtime exposes grandpa_authorities().
The runtime exposes current_set_id().
The runtime uses Aura + GRANDPA.
The correct initial investigation target is the real finalized checkpoint, not grandpa_pending_change.
The first PoC does not require modifications to Materios.
The first PoC does not require Halo2.
The first PoC should produce a real CanonicalCheckpoint.
Only after that checkpoint is reproducible should we construct the independent finality/storage proof.
B3 is still a design target, not an implemented security property.
33. B3 completion criteria
B3 is complete only when:

checkpointRef is fixed before ticket commitments;
canonical key derivation is deterministic;
canonicality is formally specified;
the proof binds round, checkpoint and root;
Cardano verifies the proof;
publisher identity is irrelevant to proof validity;
conflicting roots cannot both pass;
anchor finalization is one-shot;
stale/replayed anchors are rejected;
Beacon derivation uses only canonical data;
adversarial property tests pass;
8746 is treated as evidence, not an implicit oracle.
Until all twelve conditions hold:

PRE-RICH = B1

and B3 remains a design target.

34. Design principle
The central rule is:

The publisher may submit evidence. The publisher must not choose truth.

Or, formally:

B3
⇔
UniqueAnchor
∧
PublisherIndependentCanonicality
∧
OnChainVerifiableProof

The BeaconRegistry should remain as small and deterministic as possible.

The difficult trust work belongs in the canonical anchor/proof layer.

If the anchor is weak, B3 is weak.

If the anchor is backed by a verifiable canonical-state proof, the Registry can remain simple.