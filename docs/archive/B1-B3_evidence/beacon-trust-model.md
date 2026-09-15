PRE-RICH Beacon Trust Model
1. Purpose
This document defines how PRE-RICH obtains, authenticates, verifies, and consumes the Beacon used by ticket-result generation.

The protocol MUST distinguish between:

a value merely published on Cardano;
a value authorized by a publisher or committee;
a value backed by a cryptographic proof of canonical external state;
a value represented by a Cardano L1 object whose own validator or minting policy enforces the relevant fact.
The system MUST NOT describe a Beacon as "trustless" without identifying the exact rule that makes its value canonical and authentic.

2. Current status
The currently deployed PRE-RICH Beacon path is B1 — Authorized Publisher.

The current operational path is:

Materios / external evidence
        |
        v
RegistryPublish(mcHash, materiosContext)
        |
        | authorized by brRelayerPkh
        v
BeaconRegistry: Pending -> Ready
        |
        v
deriveBeacon(target, mcHash, materiosContext)
        |
        v
Prize Sync / Reveal

This is a publisher-authorized Beacon.

The relayer remains part of the trust boundary because it chooses which mcHash and materiosContext to publish.

B3 described below is the target architecture. It MUST NOT be claimed as implemented until canonicality is established by an independently verifiable proof or by an L1 mechanism whose own validation rules enforce the required relationship.

3. Important architectural decision
The investigation has established that the B3 path should initially be developed as an external PRE-RICH adapter.

The Materios node MUST NOT be modified for the PoC.

The architecture is:

/workspaces/
│
├── PRE-RICH-scratch-and-win-game/
│       |
│       └── pre-rich adapter / PoC
│
└── materios/
        |
        └── partnerchain/
                |
                └── materios-node

The adapter communicates with Materios through its public RPC interface.

Conceptually:

                MATERIOS
                    |
                    | JSON-RPC
                    v
            PRE-RICH ADAPTER
                    |
          +---------+---------+
          |         |         |
          v         v         v
      finalized   state     Runtime
        head      root       APIs
                              |
                              v
                         GrandpaApi
                              |
                    +---------+---------+
                    |                   |
                    v                   v
             authority list          set_id
                    |
                    +--------+
                             |
                             v
                    CanonicalCheckpoint

The adapter is untrusted.

Its job is to:

fetch data;
decode data;
normalize data;
construct evidence;
eventually generate proofs.
The adapter MUST NOT be the source of canonicality.

4. Fundamental distinction
Cardano validators can directly inspect transaction-local information including:

inputs;
outputs;
reference inputs;
datums;
redeemers;
minting and burning;
signatories;
validity interval.
They do not automatically have access to arbitrary historical Cardano state, Materios state, Partner Chain state, or external protocol state.

Therefore:

mcHash = X

being present in a Cardano datum does not imply:

X = authentic Materios value

Likewise:

8746 contains root R

does not imply:

R = canonical PRE-RICH root for roundId

A separate enforceable rule must establish that relationship.

5. Trust levels
5.1 B1 — Authorized publisher
B1 accepts a Beacon because an authorized publisher has attested to it.

Conceptually:

ValidB1(x, roundId)
    :=
        correct round
        &&
        correct target
        &&
        authorized publisher
        &&
        valid Beacon derivation

The trust assumption is:

PRE-RICH trusts the configured publisher.

Advantages:

simple;
inexpensive;
immediately deployable;
compatible with the current Registry architecture.
Disadvantages:

the publisher can choose among otherwise plausible external values;
compromise of the publisher can affect Beacon selection;
the construction does not prove canonical Materios state;
it does not eliminate publisher equivocation.
The current PRE-RICH Registry is B1.

5.2 B2 — Committee-attested root
B2 replaces a single publisher with an attestation set.

Conceptually:

RootProof = N-of-M signatures over (roundId, ref, root)

The trust assumption becomes:

the required committee threshold is honest

B2 reduces dependence on a single publisher but does not establish canonicality from the underlying protocol state unless the committee's attestation mechanism itself provides that property.

B2 is therefore still an attestation-based trust model.

5.3 B3 — Canonical-state proof
B3 removes publisher choice from the canonicality predicate.

The core predicate is:

Canonical(ref, root)

meaning:

root is the canonical Materios value associated with checkpoint ref

The required proof is:

RootProof(ref, root, proof)

such that:

VerifyProof(ref, root, proof) = true
    =>
Canonical(ref, root)

The verifier MUST determine acceptance from:

roundId
checkpointRef
root
context
proof

and MUST NOT determine canonicality from:

publisher identity
publisher signature
first publisher to submit

The publisher becomes a submitter of evidence rather than the root of trust.

6. PoC-0 — Real Materios checkpoint extraction
Before implementing ZK or on-chain proof verification, PRE-RICH will first establish that the required Materios consensus information can be extracted from a real node without modifying Materios.

This experiment is called PoC-0.

The target flow is:

Materios node
      |
      | JSON-RPC
      v
chain_getFinalizedHead
      |
      v
finalized block H
      |
      +------------------+
      |                  |
      v                  v
   blockHash          stateRoot
      |
      v
 runtime version
      |
      v
   GrandpaApi
      |
      +----------------------+
      |                      |
      v                      v
grandpa_authorities()   current_set_id()
      |                      |
      +----------+-----------+
                 |
                 v
       CanonicalCheckpoint

The first concrete output SHOULD have the following conceptual form:

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

The exact values are obtained from the real node and MUST NOT be hard-coded.

PoC-0 success criteria
The following tests constitute PASS:

[1] finalized head
[2] finalized header
[3] block hash
[4] state root
[5] runtime spec version
[6] GRANDPA authority list
[7] GRANDPA set ID
[8] deterministic authority commitment
[9] CanonicalCheckpoint JSON

PoC-0 does not claim cryptographic finality verification.

It demonstrates that the required consensus snapshot can be extracted from the real Materios runtime through the public node interface.

7. Materios runtime discoveries
The current investigation has established several important facts about the Materios runtime.

The runtime currently reports:

spec_version = 235

The runtime uses:

Aura + GRANDPA

The runtime exposes the standard GRANDPA Runtime API:

GrandpaApi::grandpa_authorities()
GrandpaApi::current_set_id()

The runtime implementations delegate directly to the GRANDPA pallet:

Grandpa::grandpa_authorities()
Grandpa::current_set_id()

Therefore the PRE-RICH adapter SHOULD obtain the authority list and set ID through the Runtime API rather than attempting to infer the authority set from internal pallet storage.

This is important because the runtime API is the explicit public interface for the information required by the adapter.

8. Runtime API versus internal storage
The PoC MUST NOT use:

grandpa_pending_change

as a substitute for:

GrandpaApi::grandpa_authorities()

The relevant runtime API calls are:

GrandpaApi_grandpa_authorities
GrandpaApi_current_set_id

The adapter will invoke these through the node's RPC/state-call mechanism and decode the SCALE-encoded results.

This produces a clean separation:

Materios runtime
      |
      | public Runtime API
      v
PRE-RICH adapter

rather than:

PRE-RICH adapter
      |
      | assumptions about internal storage
      v
Materios pallet internals

9. SessionValidatorManagementApi
The runtime also exposes:

SessionValidatorManagementApi

including:

get_current_committee()
calculate_committee()

This is potentially important for the next phase because it allows the investigation to establish the relationship between:

committee selection
        |
        v
validators
        |
        v
GRANDPA authority set
        |
        v
finality

However, this API is deliberately not part of PoC-0.

The first experiment should remain minimal:

finalized checkpoint
+
GRANDPA authority set
+
set ID

Only after this succeeds should committee selection be incorporated.

10. Canonical checkpoint
A central concept of B3 is the canonical checkpoint.

A checkpoint MUST identify enough information to bind the claimed external state.

At minimum:

chain_id
runtime_spec_version
block_number
block_hash
state_root
GRANDPA set_id
authority commitment

The exact serialized representation MUST be deterministic and versioned.

The checkpoint SHOULD be treated as immutable evidence once selected.

Conceptually:

CanonicalCheckpoint
    =
    {
        chain_id,
        runtime_version,
        block_number,
        block_hash,
        state_root,
        grandpa_set_id,
        authority_commitment
    }

The checkpoint is not itself the proof of finality.

It is the object to which the later finality proof and storage proof will be bound.

11. Uniqueness is necessary but not sufficient
For every PRE-RICH round:

| { x | ValidAnchor(x, roundId) } | <= 1

is a required uniqueness property.

However, uniqueness alone does not establish B3.

The following is NOT sufficient:

ValidAnchor(x)
    :=
        signed_by(relayer, x)
        &&
        first_on_chain(x)

There may be only one finalized anchor, but the relayer still determines which root becomes the anchor.

Therefore:

one-shot Registry
!=
canonical root

B3 requires both:

uniqueness;
publisher-independent canonicality.
12. The B1 weakness
Consider:

roundId = 42

with two externally valid pieces of evidence:

receipt_A -> root_A
receipt_B -> root_B

where:

root_A != root_B

Under B1:

relayer signs A
    ->
A can become Ready

or:

relayer signs B
    ->
B can become Ready

The Registry's one-shot transition prevents a second publication after finalization, but it does not decide which root was objectively canonical.

Therefore:

one-shot Registry
!=
canonical root

This distinction MUST remain explicit throughout the implementation and documentation.

13. Required B3 properties
A B3 implementation MUST satisfy the following properties.

P1 — Anchor uniqueness
For a fixed round:

| { x | ValidAnchor(x, roundId) } | <= 1

The Cardano state machine MUST prevent multiple finalized anchors for the same round.

P2 — Publisher independence
For fixed:

roundId
ref
root
proof

the truth value of:

ValidAnchor(...)

MUST NOT depend on who submitted the transaction.

In particular:

ValidAnchor(x, Alice)
=
ValidAnchor(x, Bob)

when Alice and Bob submit identical anchor data and proof.

P3 — Conflicting roots
For:

root_A != root_B

at the same canonical checkpoint:

ref

at most one root may satisfy:

Canonical(ref, root)

The reason one root passes and the other fails MUST be an objective rule encoded in the proof verification path.

It MUST NOT be:

"the relayer signed A"

P4 — On-chain decidability
The Cardano validator MUST eventually be able to determine the validity of the B3 claim from transaction-provided data and the defined proof.

The off-chain adapter may generate the proof.

It MUST NOT become a trusted oracle.

14. Canonical checkpoint selection
The PRE-RICH round MUST determine its Materios checkpoint before ticket commitments are finalized.

Conceptually:

CreateRound(roundId)
    ->
checkpointRef = canonicalCheckpoint(roundId)

Once the round is created:

checkpointRef

MUST NOT be replaced after ticket commitments have been observed.

The checkpoint mapping MUST be deterministic and versioned.

A publisher MUST NOT be able to choose between:

roundId -> ref_A

and:

roundId -> ref_B

after seeing ticket commitments.

15. Canonicality function
The B3 trust boundary is:

roundId
    |
    v
checkpointRef
    |
    v
canonical Materios state
    |
    v
canonical root

Formally:

CanonicalRoot(roundId)
    :=
CanonicalMateriosRoot(
    canonicalCheckpoint(roundId)
)

The exact definition of CanonicalMateriosRoot MUST be fixed by the protocol specification.

Candidate definitions include:

a finalized state value at a deterministic checkpoint;
an authenticated storage value under a finalized state root;
a bridge state UTxO whose validator already enforces the required relationship;
a succinct proof that a specific state value is canonical.
The implementation MUST specify exactly which interpretation is being used.

16. From PoC-0 to actual B3
PoC-0 establishes:

real Materios
      |
      v
external adapter
      |
      v
real finalized checkpoint
      |
      v
real GRANDPA authority set
      |
      v
CanonicalCheckpoint

This is not yet B3.

The next phases add the missing cryptographic guarantees.

The intended progression is:

POC-0
real finalized checkpoint
        |
        v
POC-1
independent GRANDPA finality verification
        |
        v
POC-2
stateRoot + storage proof
        |
        v
POC-3
GRANDPA + storage + checkpoint proof
        |
        v
POC-4
succinct proof / Halo2
        |
        v
Cardano verification

This staged approach is intentional.

ZK proof construction MUST NOT begin before the underlying canonicality path has been demonstrated with real Materios data.

17. RootProof
The B3 abstraction is:

RootProof(ref, root, proof)

with:

VerifyRootProof(ref, root, proof) = true
    =>
Canonical(ref, root)

The proof MUST bind:

the checkpoint;
the storage key or anchor identity;
the claimed root;
any context consumed by deriveBeacon;
the relevant protocol version;
domain separation;
the relevant finality information.
A proof that merely says:

"some Materios operator attests to root"

is B1/B2, not B3.

18. Canonical Beacon Anchor
PRE-RICH SHOULD expose the result of B3 verification through a dedicated L1 object:

CanonicalBeaconAnchor

Conceptual state:

{
    roundId,
    checkpointRef,
    root,
    context,
    commitment
}

The anchor is a game-facing representation of an already verified external fact.

It MUST NOT be interpreted as creating canonicality merely because it exists on Cardano.

The security relationship is:

RootProof
    |
    v
CanonicalBeaconAnchor
    |
    v
BeaconRegistry

not:

arbitrary UTxO
    |
    v
"therefore canonical"

19. One-shot semantics
Uniqueness and canonicality are separate properties.

A one-shot NFT or UTxO can establish:

one finalized anchor per round

but cannot by itself establish:

this anchor contains the canonical root

Therefore the B3 construction requires both:

one-shot state transition

and:

canonical RootProof

20. Materios and metadata label 8746
The current investigation treats Materios checkpoint metadata identified by label 8746 as audit evidence.

Conceptually:

8746
    ->
checkpoint / batch metadata
    ->
Merkle root of certified receipt batch

This is useful for auditability and receipt inclusion.

However, 8746 MUST NOT automatically be treated as:

Canonical(ref, root)

A metadata record does not, by itself, establish:

uniqueness for a PRE-RICH roundId;
a deterministic PRE-RICH checkpoint;
canonicality of one root among multiple valid receipts;
a Plutus-readable state transition;
a Cardano validator-enforced relationship between roundId and root.
Therefore:

8746 = evidence / audit

not:

8746 = B3 RootProof

unless a separate enforceable mechanism establishes the missing properties.

21. Candidate B3 sources
The following are candidate sources for the canonicality proof.

A. Materios / Partner Chain finalized state
A proof establishes that:

Anchors[K] = AnchorRecord

in a finalized Materios state.

Potential implementation:

finalized header
+
GRANDPA finality proof
+
storage proof

This is the most direct canonical-state model.

B. Cardano bridge/state UTxO
A Cardano UTxO represents the canonical external state and its own validator enforces updates.

The Registry can then consume the UTxO as a reference input.

This is B3 only if the anchor validator actually enforces the relationship between external state and stored root.

C. Succinct proof adapter
An off-chain adapter proves:

Materios finality
+
canonical storage lookup
+
anchor value

and supplies a succinct proof to Cardano.

Cardano verifies only:

VerifyProof(...)

The adapter is untrusted.

This is currently the most promising architecture if direct verification of Materios finality and storage proofs is too expensive for Plutus.

D. Committee certificate
An N-of-M certificate provides strong attestation but retains committee trust.

This is B2 unless the certificate itself is the protocol's canonical-state proof.

22. Recommended B3 architecture
The target architecture is:

                  Materios
                     |
             finalized state
                     |
             proof generation
                     |
                     v
              +-------------+
              | B3 Prover   |
              +------+------+
                     |
                     | proof π
                     v
              Cardano transaction
                     |
             +-------+-------+
             |               |
             v               v
       proof verifier   one-shot anchor
             |               |
             +-------+-------+
                     |
                     v
              BeaconRegistry
                     |
                     v
              deriveBeacon()
                     |
                     v
             PrizeValidator

The prover may be malicious.

The verifier MUST reject an invalid proof.

The crucial trust boundary is therefore moved from:

relayer

to:

cryptographic verification

23. Beacon derivation
After canonicalization:

R = deriveBeacon(target, root, context)

The derivation MUST use the canonical root and canonical context.

The publisher MUST NOT be able to select an arbitrary context after the checkpoint has been fixed.

The resulting Beacon should be deterministic with respect to the canonical inputs.

24. Registry responsibilities
The BeaconRegistry SHOULD remain small.

It SHOULD verify:

anchor identity
+
round
+
target
+
checkpoint
+
required fields
+
Beacon derivation
+
state transition

It SHOULD NOT duplicate:

Materios consensus verification
bridge consensus verification
external protocol parsing
large proof generation

Those responsibilities belong to the anchor/proof layer.

25. End-to-end B3 flow
The target game flow is:

CreateRound
    |
    | freeze roundId + checkpointRef
    v
Ticket commitments
    |
    v
Materios canonical state
    |
    v
B3 proof generation
    |
    v
CanonicalBeaconAnchor
    |
    | reference input
    v
BeaconRegistry
    |
    | deriveBeacon
    v
Prize Sync
    |
    v
Reveal(playerSecret)
    |
    v
Claim

The critical ordering is:

checkpoint fixed
    BEFORE
ticket commitments
    BEFORE
Beacon finalization

26. Adversarial acceptance test
A B3 implementation MUST pass this conceptual test.

Given:

roundId = 42
ref = C42

root_A != root_B

and:

receipt_A -> root_A
receipt_B -> root_B

the verifier must evaluate:

Verify(C42, root_A, proof_A)

and:

Verify(C42, root_B, proof_B)

with at most one accepting.

The decisive question is:

Why does one root pass?

Acceptable answer:

because it is proven to be the canonical state at C42

Unacceptable answer:

because the authorized relayer signed it first

27. Anti-grinding
Canonicality does not automatically eliminate grinding.

Even if:

| { root | Canonical(ref, root) } | <= 1

the checkpoint selection itself may remain biasable.

Therefore:

canonicality

and:

anti-grinding

are separate security properties.

The checkpoint rule MUST be frozen before ticket commitments and MUST specify:

reference rule;
finality rule;
timing window;
protocol/runtime version;
handling of stale checkpoints;
handling of missing checkpoints;
deterministic selection rules.
28. Current versus target claim
Current implementation: B1
The current PRE-RICH implementation is B1 because:

mcHash + context

are authorized by the configured publisher.

Therefore PRE-RICH MUST currently describe the Beacon path as:

publisher-authorized

and not as trustless.

Target: B3
The target becomes B3 when:

Canonical(ref, root)

is established by an independently verifiable proof or by an L1 anchor whose own validator/policy enforces that relationship.

The existence of a Cardano UTxO is not sufficient.

The existence of an NFT is not sufficient.

The presence of metadata is not sufficient.

The presence of 8746 is not sufficient.

A one-shot transition is not sufficient.

B3 requires:

canonicality
+
publisher independence

29. Development roadmap
The current research should proceed in the following order.

POC-0 — Real Materios checkpoint
Goal:

real Materios node
    ->
RPC
    ->
finalized block
    ->
state root
    ->
runtime version
    ->
GrandpaApi
    ->
authority set + set ID
    ->
CanonicalCheckpoint.json

Constraints:

no Materios code modifications;
external adapter only;
real node;
real SCALE decoding;
deterministic checkpoint encoding.
POC-1 — Independent GRANDPA verification
Goal:

CanonicalCheckpoint
        +
GRANDPA authority set
        +
set ID
        +
finality evidence
        |
        v
independent verification

The purpose is to stop trusting the node merely because it reported a finalized block.

POC-2 — Storage proof
Goal:

finalized state root
        +
storage key
        +
storage proof
        |
        v
authenticated AnchorRecord

This establishes that the claimed value actually exists under the finalized state root.

POC-3 — Complete external canonicality proof
Goal:

GRANDPA finality
+
state root
+
storage proof
+
AnchorRecord
        |
        v
RootProof

At this point the system should be able to answer:

Why is this root canonical?

with a cryptographic verification procedure rather than:

because the relayer said so.

POC-4 — Succinct proof / ZK
Only after POC-3 succeeds:

GRANDPA + storage proof
        |
        v
succinct proof
        |
        v
Cardano verifier

Halo2 or another proof system belongs here, not earlier.

30. Immediate TODO
PoC-0
 Keep PRE-RICH repository unchanged except for the external PoC files.
 Keep Materios repository unchanged.
 Build materios-node using its pinned Rust toolchain.
 Start a local development node.
 Confirm RPC availability.
 Call chain_getFinalizedHead.
 Fetch the corresponding header.
 Extract block number, block hash and state root.
 Obtain runtime spec version.
 Invoke GrandpaApi::grandpa_authorities.
 Invoke GrandpaApi::current_set_id.
 Decode SCALE responses.
 Compute deterministic authority commitment.
 Emit CanonicalCheckpoint.json.
 Test that the checkpoint is reproducible.
PoC-1
 Determine exact GRANDPA proof format exposed by Materios.
 Obtain the required finality evidence.
 Implement independent GRANDPA verification.
 Test invalid authority set.
 Test invalid set ID.
 Test invalid signature/finality evidence.
 Test conflicting checkpoints.
PoC-2
 Identify exact storage key for the relevant Materios anchor.
 Obtain storage proof against the finalized state root.
 Verify the proof independently.
 Confirm that changing the claimed root causes rejection.
PoC-3
 Define RootProof.
 Bind checkpoint, root, context and protocol version.
 Define canonicality predicate.
 Implement adversarial conflicting-root test.
 Demonstrate publisher independence.
 Demonstrate stale-checkpoint rejection.
 Demonstrate replay protection.
PoC-4
 Benchmark the complete proof.
 Determine which parts are too expensive for Plutus.
 Design succinct proof circuit.
 Evaluate Halo2 or equivalent.
 Implement Cardano-side verification.
 Connect verified proof to CanonicalBeaconAnchor.
31. Current security classification
The system MUST currently be described as:

PRE-RICH Beacon
    |
    v
B1 — Authorized Publisher

The external Materios adapter being developed is:

untrusted evidence adapter

It does not itself create B3.

PoC-0 establishes the factual foundation for the B3 architecture:

REAL MATERIOS
      |
      v
external adapter
      |
      v
real finalized checkpoint
      |
      v
real GRANDPA authority set
      |
      v
CanonicalCheckpoint

B3 begins only when the subsequent proof chain establishes:

CanonicalCheckpoint
      |
      v
verified finality
      |
      v
verified storage state
      |
      v
CanonicalRoot

and Cardano can verify that claim without trusting the adapter or publisher.

32. Final architectural principle
The central security rule is:

Publisher
    submits evidence

not:

Publisher
    defines truth

The intended final trust boundary is:

Materios canonical state
        |
        v
cryptographic proof
        |
        v
Cardano verification
        |
        v
CanonicalBeaconAnchor
        |
        v
BeaconRegistry
        |
        v
Prize logic

This preserves the desirable property that PRE-RICH's game logic does not need to understand Materios consensus.

It only needs to consume a Beacon whose external origin has already been proven canonical.

Until that proof path exists and is verified, the correct claim remains:

B1 — publisher-authorized Beacon

not B3.