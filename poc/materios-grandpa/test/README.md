# Materios GRANDPA PoC-1A

Strict, fail-closed GRANDPA justification verifier for Materios.

## Scope

PoC-1A verifies the portions of a GRANDPA justification that are currently implemented against an already trusted GRANDPA authority set.

The verifier does NOT trust authority-set data supplied by the relayer.

The relayer does NOT provide:

* authority set
* authority weights
* `set_id`

Those values come from `TrustedAuthorityState`.

PoC-1A does not yet claim complete production-grade GRANDPA finality when `verifyAncestry: true`. After the implemented signature, quorum, header, ancestry, and precommit-target checks succeed, the verifier deliberately fails closed with `ANCESTRY_NOT_VERIFIED`.

## Trust model

```text
trusted genesis configuration
        |
        v
TrustedAuthorityState
        |
        +---- set_id
        +---- authorities
        +---- weights
        |
        v
GrandpaJustification
        |
        +---- signed precommits
        |
        v
signature verification
        |
        v
quorum verification
        |
        v
checkpoint binding
        |
        v
header / ancestry evidence
        |
        v
precommit-target binding
        |
        v
FAIL CLOSED
        |
        v
ANCESTRY_NOT_VERIFIED
```

When `verifyAncestry: false`, PoC-1A can return a successful verification result after the trusted authority, checkpoint, signature, and quorum checks succeed.

When `verifyAncestry: true`, the verifier additionally requires the supplied ancestry evidence to pass the implemented cryptographic and structural checks, including:

* canonical Substrate header decoding;
* canonical SCALE re-encoding;
* Blake2b-256 header hashing;
* parent/number/state-root/extrinsics-root consistency;
* ancestry consistency of the supplied evidence;
* presence of the GRANDPA commit target;
* presence of every signed precommit target;
* precommit target-number consistency;
* precommit-target descendant relationship to the commit target.

Even after those checks succeed, PoC-1A deliberately does not return `verified: true`.

## Authority-set trust boundary

`AuthoritySetEvidence` is separate from trusted configuration and is explicitly marked:

```text
untrusted-evidence
```

Adapter or runtime-API data cannot be passed as `TrustedAuthorityState` through the TypeScript type boundary.

`AuthoritySetTransitionEvidence` represents the boundary from set N to set N+1, but transition verification is not implemented.

Therefore the current trusted authority set remains an explicit external trust boundary of PoC-1A.

## Header and ancestry model

`GrandpaAncestryHeader` contains the block hash, parent hash, block number, raw header bytes, and decoded header fields.

The demonstrated Substrate header encoding is:

```text
parent_hash
|| Compact<u32>
|| state_root
|| extrinsics_root
|| Digest
```

`Digest` is encoded as `Vec<DigestItem>` using the canonical Substrate discriminants implemented by the PoC.

The header hash is computed as Blake2b-256 over the canonical SCALE-encoded header.

The implementation explicitly rejects:

* non-canonical Compact encodings;
* block numbers outside the `u32` range;
* invalid header field lengths;
* unsupported `DigestItem` variants;
* oversized digest data;
* trailing bytes;
* header hash mismatches.

## Current ancestry limitation

The ancestry verifier currently establishes structural consistency of the supplied header evidence and binds the supplied GRANDPA precommit targets to the commit target.

It does NOT yet constitute a complete GRANDPA finality proof.

In particular, the current PoC does not yet establish all production-level obligations such as:

* complete justification semantics;
* complete ancestry/finality proof semantics;
* authenticated authority-set transitions;
* transition proofs between GRANDPA authority sets;
* genesis reachability as a standalone finality guarantee;
* a real Materios finality fixture demonstrating the complete production path.

These remain explicit implementation obligations.

## Test fixtures

The current tests use synthetic fixtures only.

No real Materios finalized block, GRANDPA justification, or authenticated authority-set transition fixture is included yet.

Synthetic fixtures are used to test the verifier mechanics, boundary conditions, canonical encoding, cryptographic hashing, ancestry relationships, quorum logic, and adversarial rejection paths.

A real Materios fixture remains a separate requirement before this PoC can make a production-grade finality claim.

## Fail-closed rule

The critical security property of PoC-1A is that successful partial verification is not silently promoted to full finality.

Therefore:

```text
valid signatures
+
valid quorum
+
valid checkpoint binding
+
valid header evidence
+
valid ancestry relationships
+
valid precommit-target binding
        |
        v
NOT YET FULL FINALITY
        |
        v
ANCESTRY_NOT_VERIFIED
```

Until the remaining finality obligations are implemented and independently tested, `verifyAncestry: true` must remain fail-closed.
