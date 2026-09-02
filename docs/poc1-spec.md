# PRE-RICH PoC-1 Specification

## Status

**PoC-1A — Structural and cryptographic GRANDPA verification**

This document defines the verification boundary for the first GRANDPA verification stage of PRE-RICH.

PoC-1A is an intermediate security component.

It MUST NOT be described as B3 canonical-state verification.

The current PRE-RICH Beacon path remains **B1** until the complete canonicality chain is independently verified and enforced by Cardano.

---

# 1. Purpose

The purpose of PoC-1 is to establish a verifiable relationship between a Materios block and a valid GRANDPA finality justification.

The verification pipeline is intended to evolve as follows:

```text
Materios block
     |
     v
GRANDPA justification
     |
     v
PoC-1A
structural + cryptographic verification
     |
     v
PoC-1B
ancestry verification
     |
     v
PoC-1C
authority-set transition verification
     |
     v
canonical finalized state
     |
     v
storage proof
     |
     v
B3 proof
```

PoC-1A therefore establishes an important prerequisite, but not the complete B3 property.

---

# 2. Security objective

PoC-1A MUST answer:

> Given a GRANDPA justification, a target block, and an already trusted GRANDPA authority state, did enough authorized authorities cryptographically sign the target precommit to satisfy GRANDPA's quorum rule?

It MUST NOT answer:

> Is this block objectively the canonical Materios state for PRE-RICH?

That second question belongs to the later B3 verification layer.

---

# 3. Trust boundary

The verifier receives:

```text
GRANDPA justification
target block hash
target block number
TrustedAuthorityState
```

The `TrustedAuthorityState` is trusted input in PoC-1A.

Conceptually:

```text
TrustedAuthorityState
        |
        v
+-----------------------+
|      PoC-1A           |
|                       |
| SCALE decoding        |
| signer validation     |
| authority membership  |
| signature validation  |
| quorum validation     |
+-----------------------+
        |
        v
valid GRANDPA commit
```

The relayer MAY provide the justification.

The relayer MUST NOT provide the authority set used to validate that justification.

The relayer MUST NOT choose the authority weights used for quorum calculation.

The relayer MUST NOT choose the GRANDPA `setId` used by the verifier.

---

# 4. PoC-1A scope

PoC-1A MUST verify:

1. justification structure;
2. SCALE encoding;
3. target hash;
4. target block number;
5. GRANDPA round;
6. GRANDPA `setId` binding;
7. signer encoding;
8. signer uniqueness;
9. signer membership;
10. signer weight;
11. Ed25519 signatures;
12. GRANDPA quorum.

PoC-1A MAY expose ancestry verification as an optional interface, but MUST NOT claim that ancestry is verified when it is not.

---

# 5. Non-goals of PoC-1A

PoC-1A does NOT by itself establish:

* canonical checkpoint selection;
* Materios storage state;
* storage-trie inclusion;
* PRE-RICH anchor correctness;
* authority-set transition history;
* first authority-set bootstrap;
* complete GRANDPA ancestry;
* canonical PRE-RICH root;
* B3 canonicality.

Therefore:

```text
PoC-1A valid
    !=
B3 valid
```

and:

```text
GRANDPA signature quorum
    !=
PRE-RICH canonical root
```

---

# 6. Materios runtime facts

The current discovery establishes that Materios uses:

```text
sp-consensus-grandpa 21.0.0
Polkadot SDK: polkadot-stable2409-4
```

with runtime commit:

```text
c455194a2ae2f613c1c671e00dbf397b83ed8171
```

The runtime uses:

```text
GrandpaApi::grandpa_authorities()
GrandpaApi::current_set_id()
```

The GRANDPA authority identifier is:

```text
Ed25519 public key
```

not sr25519.

Therefore PRE-RICH MUST use:

```text
Ed25519
```

for the currently verified Materios GRANDPA implementation.

Any previous specification referring to sr25519 for Materios GRANDPA MUST be treated as obsolete.

---

# 7. GRANDPA data model

The relevant justification structure is conceptually:

```text
Justification {
    round,
    commit,
    votes_ancestries
}
```

where:

```text
Commit {
    target_hash,
    target_number,
    precommits
}
```

and:

```text
SignedPrecommit {
    precommit,
    signature,
    signer
}
```

The verifier MUST parse the complete structure using strict SCALE decoding.

---

# 8. SCALE decoding

The decoder MUST be strict.

It MUST reject:

* unexpected EOF;
* malformed compact integers;
* malformed vectors;
* invalid fixed-length fields;
* trailing bytes;
* ambiguous encodings.

Successful decoding MUST consume the complete expected byte sequence.

Conceptually:

```text
decode(bytes)
    |
    +-- malformed -> reject
    |
    +-- trailing bytes -> reject
    |
    +-- valid complete object -> continue
```

A parser accepting a valid prefix while ignoring trailing data MUST NOT be considered secure.

---

# 9. Ed25519 parameters

The current Materios GRANDPA implementation uses:

```text
public key: 32 bytes
signature: 64 bytes
```

The verifier MUST perform standard Ed25519 signature verification.

The implementation MUST NOT silently accept another signature scheme.

The cryptographic boundary is:

```text
Ed25519.Verify(
    authorityPublicKey,
    signingPayload,
    signature
)
```

Failure MUST reject the justification.

---

# 10. GRANDPA signing payload

The signed message is the localized GRANDPA payload.

Conceptually:

```text
LocalizedPayload {
    round,
    setId,
    message
}
```

where `message` is the GRANDPA precommit.

The implementation MUST reproduce the exact Materios signing serialization.

The signed data is:

```text
Blake2-256(
    SCALE_encode(LocalizedPayload)
)
```

followed by Ed25519 verification according to the verified Materios implementation.

The verifier MUST NOT reconstruct the payload using an alternative serialization.

---

# 11. Target binding

The justification MUST be bound to the expected target.

The verifier MUST check:

```text
commit.target_hash == expectedTargetHash
```

and:

```text
commit.target_number == expectedTargetNumber
```

A valid signature over a different target MUST fail.

This prevents substitution of a different finalized block.

---

# 12. Round binding

The GRANDPA round MUST be taken from the justification itself and used in construction of the localized signing payload.

The verifier MUST NOT allow a caller to substitute a different round after decoding.

Conceptually:

```text
justification.round
        |
        v
localized payload
        |
        v
signature verification
```

Changing the round MUST invalidate the signature.

---

# 13. setId binding

The GRANDPA `setId` MUST come from the trusted authority state.

Conceptually:

```text
TrustedAuthorityState.setId
             |
             v
       localized payload
```

The justification MUST NOT be permitted to introduce its own trusted `setId`.

This is important because:

```text
setId
```

is part of the signing domain.

A malicious submitter MUST NOT be able to choose an authority set identifier that causes otherwise invalid signatures to be accepted.

---

# 14. TrustedAuthorityState

PoC-1A requires a trusted authority state containing at minimum:

```text
TrustedAuthorityState {
    chainId,
    genesisHash,
    setId,
    authorities
}
```

where each authority contains:

```text
authorityId
weight
```

The verifier MUST validate the internal consistency of this state before using it.

---

# 15. Chain identity

The verifier MUST bind verification to the expected Materios chain.

At minimum:

```text
chainId
genesisHash
```

MUST be part of the trusted configuration.

A justification valid for another chain MUST NOT be accepted merely because the authority public keys happen to match.

---

# 16. Authority membership

For every signed precommit:

```text
signer
```

MUST exist in the trusted authority set.

Unknown signers MUST be rejected.

The verifier MUST NOT accept a signer merely because the signature is cryptographically valid.

The required relationship is:

```text
valid Ed25519 signature
        &&
trusted authority membership
```

---

# 17. Duplicate signer protection

An authority MUST contribute at most once to quorum.

Therefore the verifier MUST reject duplicate signer identities within the same commit.

Conceptually:

```text
seen = {}

for precommit:
    if signer in seen:
        reject
    else:
        seen.add(signer)
```

This prevents duplicated signatures from artificially increasing quorum weight.

---

# 18. Authority weight

Each signer contributes the weight associated with that signer in the trusted authority state.

The signer MUST NOT be allowed to supply or modify its own weight.

Conceptually:

```text
weight(signer)
```

is obtained exclusively from:

```text
TrustedAuthorityState
```

---

# 19. GRANDPA quorum

The current implementation uses the strict GRANDPA threshold:

```text
3 * signedWeight > 2 * totalWeight
```

This MUST be evaluated using integer-safe arithmetic.

Acceptance requires:

```text
3 * signedWeight > 2 * totalWeight
```

not:

```text
>=
```

and not a floating-point percentage comparison.

The implementation MUST avoid overflow or truncation in the calculation.

---

# 20. Commit verification algorithm

Conceptually:

```text
verifyGrandpa(
    justification,
    expectedTarget,
    trustedAuthorityState
)
```

performs:

```text
1. validate TrustedAuthorityState
2. decode justification
3. validate target hash
4. validate target number
5. obtain round
6. obtain trusted setId
7. obtain trusted authorities
8. reject duplicate signers
9. reject unknown signers
10. reconstruct localized payload
11. verify every Ed25519 signature
12. sum signer weights
13. verify 2/3+ quorum
14. return valid
```

Any failure MUST result in rejection.

---

# 21. Fail-closed rule

PoC-1A MUST fail closed.

Examples:

```text
missing authority
    -> reject

unknown signer
    -> reject

duplicate signer
    -> reject

invalid signature
    -> reject

wrong target
    -> reject

wrong target number
    -> reject

wrong setId
    -> reject

malformed SCALE
    -> reject

insufficient quorum
    -> reject
```

There MUST NOT be a fallback such as:

```text
"signature verification failed, but the relayer is trusted"
```

---

# 22. Ancestry

GRANDPA justifications contain:

```text
votes_ancestries
```

because validating the commit can require proving that the relevant precommit targets are descendants of the committed target according to the GRANDPA rules.

The current PoC-1A implementation does not yet complete this verification.

Therefore:

```text
verifyAncestry = false
```

MUST NOT be represented as complete GRANDPA finality verification.

The current explicit behavior of the implementation is:

```text
verifyAncestry = true
    ->
ANCESTRY_NOT_VERIFIED
```

until ancestry verification is actually implemented.

---

# 23. PoC-1B — ancestry verification

The next stage MUST implement ancestry verification independently of the network.

The verifier should receive the required ancestry evidence and establish that the relevant block relationships are valid.

The verifier MUST NOT trust:

* the relayer's assertion that blocks are related;
* a block-number comparison alone;
* arbitrary RPC responses without cryptographic/header validation.

PoC-1B should establish:

```text
precommit target
       |
       v
valid ancestry relation
       |
       v
commit target
```

---

# 24. PoC-1C — authority-set transitions

A complete finality verifier must establish which authority set was authoritative at the relevant GRANDPA round.

This requires handling authority-set transitions.

The investigation MUST therefore determine:

* scheduled authority changes;
* forced authority changes;
* session-related authority management;
* GRANDPA digest handling;
* `pallet_grandpa` state;
* Materios-specific validator-management behavior;
* authority-set bootstrap.

The verifier MUST NOT assume that a single hard-coded authority set is valid forever.

---

# 25. First authority-set bootstrap

The first trusted authority set remains an explicit security boundary.

The implementation MUST document how the initial set is established.

It MUST NOT silently treat:

```text
RPC response
```

as proof of the initial trust root.

Possible future approaches include:

* protocol genesis configuration;
* independently verified genesis data;
* an explicitly governed trusted checkpoint;
* a Cardano-enforced bootstrap commitment.

The final choice is outside PoC-1A.

---

# 26. PoC-1 test-vector requirements

A real Materios justification MUST be included as a test vector.

The vector SHOULD contain:

```text
chainId
genesisHash
setId
authority set
target hash
target number
round
justification
expected signatures
expected quorum
```

The test MUST demonstrate that the implementation reproduces the expected signing payload.

---

# 27. Positive tests

At minimum:

```text
valid justification
valid signatures
valid target
valid setId
valid authority membership
valid quorum
```

MUST pass.

A real Materios-produced justification SHOULD be used rather than only synthetic signatures.

---

# 28. Negative tests

The test suite MUST include:

```text
wrong target hash
wrong target number
wrong round
wrong setId
unknown signer
duplicate signer
invalid signature
modified precommit
modified signature
modified authority key
modified authority weight
insufficient quorum
malformed SCALE
trailing SCALE bytes
empty precommit list
invalid authority state
wrong chain identity
```

Every case MUST fail closed.

---

# 29. Adversarial quorum tests

The implementation MUST specifically test the quorum boundary.

For:

```text
3 * signedWeight == 2 * totalWeight
```

the result MUST be:

```text
REJECT
```

For:

```text
3 * signedWeight > 2 * totalWeight
```

the result MAY be:

```text
ACCEPT
```

provided all other verification conditions pass.

---

# 30. Relayer boundary

The relayer is an evidence transport mechanism.

It MAY:

* query Materios;
* retrieve justifications;
* package evidence;
* submit evidence to Cardano;
* retry failed submissions.

It MUST NOT:

* define the trusted authority set;
* define authority weights;
* redefine `setId`;
* alter signatures;
* choose which authority identities count;
* declare a block final without verifier acceptance.

The rule is:

> The relayer may provide evidence. The verifier determines validity.

---

# 31. Relationship with B1

The current Beacon path remains:

```text
Materios evidence
       |
       v
relayer
       |
       v
RegistryPublish
       |
       v
B1 authorization
       |
       v
BeaconRegistry
```

PoC-1A does not automatically change this.

Even if PoC-1A successfully verifies a GRANDPA justification:

```text
verified GRANDPA justification
        !=
B3 canonical root
```

because the system still needs to establish:

```text
deterministic checkpoint
        +
finality
        +
canonical state
        +
storage proof
        +
canonical AnchorRecord
```

---

# 32. Relationship with B3

The intended future pipeline is:

```text
Materios
   |
   v
GRANDPA evidence
   |
   v
PoC-1 complete verification
   |
   v
finalized header
   |
   v
state root
   |
   v
storage proof
   |
   v
canonical AnchorRecord
   |
   v
B3 proof
   |
   v
Cardano verification
```

Only after the complete chain is independently verified can the result establish:

```text
Canonical(ref, root)
```

---

# 33. B3 prohibition

PoC-1 MUST NOT be used as an implicit B3 oracle.

The following statement is invalid:

```text
GRANDPA quorum exists
    ->
therefore root is canonical PRE-RICH root
```

The correct chain is:

```text
GRANDPA quorum
    ->
finalized Materios block
    ->
state root
    ->
authenticated storage lookup
    ->
AnchorRecord
    ->
canonicality proof
    ->
Cardano verification
```

---

# 34. Proof-generator boundary

Future B3 proof generation may be performed off-chain.

The generator may:

```text
query Materios
retrieve headers
retrieve GRANDPA evidence
process authorities
decode SCALE
verify ancestry
verify storage
construct witness
construct proof
```

The generator MUST remain untrusted.

Its output is only:

```text
proof π
```

Cardano must determine whether:

```text
Verify(π, publicInputs)
```

is valid.

---

# 35. Required future public inputs

The future B3 proof SHOULD bind at minimum:

```text
roundId
checkpointRef
root
context
protocolVersion
```

PoC-1 does not yet implement this complete public-input model.

---

# 36. Security invariants

The implementation MUST preserve the following invariants:

### I1 — Signatures are authoritative only through the trusted authority set

```text
signature validity
+
authority membership
```

are both required.

### I2 — Signatures cannot create authority weight

Weights come from trusted authority state.

### I3 — A relayer cannot manufacture quorum

The relayer cannot:

```text
add authority
change weight
change setId
duplicate valid authority weight
```

### I4 — Target substitution is impossible

The signed target MUST equal the expected target.

### I5 — Invalid cryptography fails closed

There is no trusted fallback.

### I6 — PoC-1A does not claim B3

A valid PoC-1A result remains an intermediate finality-verification result until the complete canonical-state proof exists.

---

# 37. Implementation status

Current implementation:

```text
PoC-1A
    structural verification       YES
    SCALE verification            YES
    Ed25519 verification          YES
    authority membership          YES
    duplicate protection          YES
    weighted quorum               YES
    target binding                YES
    ancestry                      NO
    authority transitions         NO
    initial-set bootstrap         OPEN
    canonical storage proof       NO
    Cardano B3 verification       NO
```

Therefore:

```text
PoC-1A = partial GRANDPA verification
```

and:

```text
PRE-RICH = B1
```

until the B3 completion criteria are satisfied.

---

# 38. Completion criteria for PoC-1A

PoC-1A is complete when:

1. the Materios GRANDPA implementation is correctly identified;
2. Ed25519 is used for the verified Materios runtime;
3. the SCALE decoder is strict;
4. target hash and number are bound;
5. round is bound;
6. trusted `setId` is used;
7. authority membership is enforced;
8. duplicate signers are rejected;
9. authority weights come from trusted state;
10. every signature is independently verified;
11. the strict `3W > 2T` quorum rule is enforced;
12. real Materios test vectors pass;
13. adversarial negative vectors fail;
14. the implementation does not claim complete finality where ancestry is absent.

---

# 39. Completion criteria for full PoC-1

PoC-1 as a complete finality component requires, in addition:

```text
PoC-1A
   +
PoC-1B
   +
PoC-1C
```

where:

```text
PoC-1A = cryptographic verification
PoC-1B = ancestry verification
PoC-1C = authority-set transition verification
```

Only then can PoC-1 provide the finality component required by the future B3 pipeline.

---

# 40. Central design principle

The central rule remains:

> The relayer may submit evidence. The relayer must not choose truth.

PoC-1 strengthens this boundary.

It does not by itself make PRE-RICH B3.

The architectural destination remains:

```text
external protocol truth
        |
        v
cryptographically verifiable evidence
        |
        v
Cardano-enforced verification
        |
        v
canonical Beacon
        |
        v
deterministic game result
```

This preserves the constitutional objective of PRE-RICH:

```text
100% trustless
100% on-chain
100% secure
100% automatic
```

with B1/B2 treated as transitional trust models rather than alternative final identities of the protocol.
