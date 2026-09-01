# PoC-1 — Independent GRANDPA Finality Verification

**Status:** Design phase (not yet implemented)

**Purpose:** Verify GRANDPA finality independently of node attestation. Do NOT trust "the node says it's finalized" — verify the cryptographic proof.

**Claim:** Given a checkpoint and a GRANDPA justification, prove that the checkpoint is finalized according to GRANDPA consensus rules.

---

## Architecture Decision

### The Problem

PoC-0 extracts `CanonicalCheckpoint.json` from the Materios node via RPC:

```
Materios node ─RPC→ PoC-0 adapter ─→ CanonicalCheckpoint.json
```

But the adapter trusts the node when it says:
- "Here is the finalized head"
- "Here is the set ID"
- "Here are the authorities"

**The node could be malicious or misconfigured.**

### The Solution: Off-Chain Evidence

Materios does **NOT** expose GRANDPA justifications via RPC. This is by design — justifications are consensus internals.

**Therefore:**
1. The relayer/adapter with local Materios node access fetches justification
2. The relayer submits: `CanonicalCheckpoint + GrandpaJustification`
3. **PoC-1 verifier** (untrusted adapter) receives both
4. Verifier proves: `checkpoint is finalized according to GRANDPA rules`

**Result:** Verifier is truly independent. It does NOT contact Materios.

```
Materios node
    │
    ├─→ [Relayer] ─→ CanonicalCheckpoint + GrandpaJustification
    │
    └─→ [Off-chain evidence]
             │
             ▼
     ┌──────────────────────────┐
     │ PoC-1 Verifier           │
     │ (completely independent) │
     └──────────────────────────┘
             │
        ┌────┴────┐
        │          │
      VALID      INVALID
```

---

## Input Specification

### CanonicalCheckpoint (from PoC-0)

```json
{
  "chain_id": "materios_preprod_v6",
  "runtime_spec_version": 235,
  "runtime_spec_name": "materios",
  "checkpoint": {
    "block_number": "123",
    "block_hash": "0x...",
    "state_root": "0x...",
    "parent_hash": "0x..."
  },
  "grandpa": {
    "set_id": "0",
    "authority_count": 2,
    "authorities": [
      {
        "public_key": "0x...",      // 32-byte sr25519 key
        "weight": "1"               // u64
      }
    ],
    "authority_commitment": "0x..."  // SHA256(count || per-auth[key || weight])
  },
  "extraction": {
    "rpc_endpoint": "...",
    "timestamp_iso8601": "..."
  }
}
```

### GrandpaJustification (from Relayer)

**Format:** SCALE-encoded bytes, decoded to:

```rust
struct GrandpaJustification<Block> {
    round: u64,
    commit: Commit<Block>,
    votes_ancestries: Vec<Block::Header>,
}

struct Commit<Block> {
    target_hash: Block::Hash,      // 32 bytes
    target_number: u32,             // block height
    precommits: Vec<SignedPrecommit<Block>>,
}

struct SignedPrecommit<Block> {
    precommit: Precommit<Block>,
    signature: Signature,           // sr25519 signature (64 bytes)
    signer: AuthorityId,            // sr25519 public key (32 bytes)
}

struct Precommit<Block> {
    target_hash: Block::Hash,       // 32 bytes
    target_number: u32,
}
```

**Source:** Extracted from real Materios node justification storage (requires local node or relayer access).

**Format is SCALE-encoded (not JSON).** See:
- https://github.com/paritytech/polkadot-sdk at tag `polkadot-stable2409-4`
- `sp_consensus_grandpa::Justification<Block>`

---

## Verification Algorithm

### Step 1: Parse Justification

```
Input: SCALE bytes
  │
  ├─→ Decode round (u64, LE)
  ├─→ Decode commit.target_hash (32 bytes)
  ├─→ Decode commit.target_number (u32, LE)
  ├─→ Decode precommits: Vec<SignedPrecommit>
  │   ├─→ For each precommit:
  │   │   ├─→ Decode precommit.target_hash (32 bytes)
  │   │   ├─→ Decode precommit.target_number (u32, LE)
  │   │   ├─→ Decode signature (64 bytes sr25519)
  │   │   ├─→ Decode signer public key (32 bytes sr25519)
  │   └
  └─→ Decode votes_ancestries: Vec<Header>
         (optional; needed only if justifying non-contiguous chain)
```

**Failure case:** Malformed SCALE, trailing bytes, EOF → REJECT

### Step 2: Validate Authority Set

```
For each SignedPrecommit:
  │
  ├─→ signer_pubkey must be in checkpoint.authorities
  ├─→ No duplicates: same public_key appears only once
  ├─→ Extract authority.weight for valid signers
  │
└─→ Total weight ≥ 2/3 of sum(all authorities' weights)?
     (GRANDPA finality threshold)
```

**Failure cases:**
- Unknown authority → REJECT
- Duplicate signer → REJECT
- Insufficient weight → REJECT

### Step 3: Verify Signatures

```
For each SignedPrecommit:
  │
  ├─→ Construct GRANDPA signed message:
  │   message = SCALE_encode({
  │       target_hash: precommit.target_hash,
  │       target_number: precommit.target_number,
  │       set_id: checkpoint.grandpa.set_id,
  │       round: justification.round,
  │   })
  │
  ├─→ sr25519_verify(
  │       public_key = signer_pubkey,
  │       message = message,
  │       signature = precommit.signature
  │   )
  │
  └─→ All signatures valid?
```

**Failure cases:**
- Invalid sr25519 signature → REJECT
- Signature over wrong message → REJECT
- Signature doesn't match signer public key → REJECT

### Step 4: Validate Target

```
Does justification.commit.target match checkpoint.block?
  │
  ├─→ target_hash == checkpoint.block_hash? YES
  ├─→ target_number == checkpoint.block_number? YES
  │
  └─→ Both match: PASS
      Either mismatch: REJECT
```

### Step 5: Validate Set ID

```
justification must belong to the authority set being verified:
  │
  └─→ Does implicit set_id in proof match checkpoint.grandpa.set_id?
      (Set ID is encoded in the GRANDPA message signature context)
```

**Failure case:** Proof replayed from different authority set → REJECT

### Step 6: Verify Authority Commitment

```
Reconstruct authority_commitment from authorities in checkpoint:
  │
  ├─→ SHA256(
  │     SCALE_compact(authority_count) ||
  │     for_each_authority[pubkey || weight_u64_LE]
  │   )
  │
  └─→ Does reconstructed == checkpoint.grandpa.authority_commitment?
      YES: PASS
      NO: REJECT (authorities were tampered with)
```

---

## PASS / FAIL Test Matrix

**PoC-1 will include adversarial test cases:**

| Scenario | Status | Expected |
|----------|--------|----------|
| Valid justification + matching checkpoint | ✅ PASS | Finalized |
| Wrong target hash in justification | ❌ FAIL | Finalized |
| Wrong target number in justification | ❌ FAIL | Finalized |
| Wrong set_id in proof context | ❌ FAIL | Finalized |
| Unknown authority in precommit | ❌ FAIL | Finalized |
| Invalid sr25519 signature | ❌ FAIL | Finalized |
| Modified signature | ❌ FAIL | Finalized |
| Duplicate authority precommit | ❌ FAIL | Finalized |
| Insufficient voting weight | ❌ FAIL | Finalized |
| Wrong GRANDPA message payload | ❌ FAIL | Finalized |
| Replayed commit (different set_id) | ❌ FAIL | Finalized |
| Malformed SCALE encoding | ❌ FAIL | Finalized |
| Trailing bytes in encoding | ❌ FAIL | Finalized |
| Empty authority set | ❌ FAIL | Finalized |
| Empty precommits list | ❌ FAIL | Finalized |

**Critical adversarial test:**
```
Same target block
+ Plausible-looking GRANDPA commit
+ But insufficient weight to reach 2/3 threshold
= MUST REJECT (even though commit looks reasonable)
```

---

## Implementation Requirements

### 1. SCALE Decoder
- Decode compact integers (0x00, 0x01, 0x10, 0x11 modes)
- Decode u32, u64 (little-endian)
- Decode Vecs (with compact count prefix)
- Decode sr25519 public keys (32 bytes)
- Decode sr25519 signatures (64 bytes)
- Reject trailing bytes
- No silent truncation

### 2. sr25519 Signature Verification
- Library: libsodium / tweetnacl / ed25519-donna (sr25519 is ed25519 variant)
- Construct correct GRANDPA signed message
- Domain separation (must use GRANDPA domain, not generic signing)

### 3. Authority Weight Aggregation
- Parse weight (u64) as bigint (no precision loss)
- Sum weights of valid signers
- Verify sum ≥ (2/3) * sum(all weights)
  - Formula: `3 * valid_weight ≥ 2 * total_weight`

### 4. Hash Validation
- Extract block_hash from checkpoint (32 bytes)
- Compare against justification target_hash (byte-for-byte)
- No conversion, no normalization

### 5. Error Reporting
Each test failure must report **exactly why** it failed:
- "Authority 0x... not in set"
- "Signature invalid for public key 0x..."
- "Weight 5 < threshold 7 (requires 2/3 of 10)"
- "Target hash mismatch: expected 0x..., got 0x..."
- "Trailing 3 bytes in SCALE encoding"

---

## Input/Output Contract

### Inputs

```typescript
interface PoC1Input {
  checkpoint: CanonicalCheckpoint;           // JSON from PoC-0
  justification_hex: string;                 // 0x-prefixed SCALE bytes
  expected_set_id: number;                   // Should match checkpoint
}
```

### Output

```typescript
type PoC1Result = 
  | { status: "PASS"; message: string }
  | { status: "FAIL"; reason: string; details: string };
```

**Example PASS:**
```json
{
  "status": "PASS",
  "message": "Block 123 finalized by GRANDPA with 8/10 authority weight"
}
```

**Example FAIL:**
```json
{
  "status": "FAIL",
  "reason": "Insufficient voting weight",
  "details": "Valid weight: 5 (50%), threshold: 7 (66.7% of 10). Need 5 more weight."
}
```

---

## Known Limitations & Out-of-Scope

### ✓ In Scope (PoC-1)
- GRANDPA signature verification
- Authority set validation
- Weight aggregation
- Target block matching
- Set ID context validation

### ✗ Out of Scope (Future PoCs)
- GRANDPA finality rule enforcement (no equivocation detection)
- Chain ancestry validation (`votes_ancestries`)
- GRANDPA round protocol (commit rules)
- Historical authority set changes
- Non-contiguous finality

**These belong to PoC-3 (complete proof) and PoC-4 (succinct proof).**

---

## References

### Substrate Crates (polkadot-stable2409-4)
- https://github.com/paritytech/polkadot-sdk/tree/polkadot-stable2409-4/substrate/primitives/consensus/grandpa
- `sp_consensus_grandpa::Justification`
- `sp_consensus_grandpa::Precommit`
- `sp_consensus_grandpa::SignedPrecommit`

### Materios
- Runtime: `/workspaces/materios/partnerchain/runtime/src/`
- Consensus: `/workspaces/materios/partnerchain/node/src/service.rs` (lines 37, 120-130)
- GRANDPA period: 512 blocks

### Beacon Trust Model
- Section 6: PoC-0 (this document)
- Section 7: PoC-1 specification
- Section 8: PoC-2 storage proof
- Section 16-30: Full B3 architecture

---

## Next Steps

1. **Verify exact GrandpaJustification format** from `sp_consensus_grandpa` in polkadot-stable2409-4
2. **Extract SCALE encoding rules** for all types used
3. **Define test vectors** with known-good justifications from real Materios node
4. **Implement SCALE decoder** (independent of Substrate)
5. **Implement sr25519 verifier** (independent of Substrate)
6. **Implement verification algorithm** with full test matrix
7. **Compare against Substrate's own justification verifier** (for correctness validation)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-01 | Off-chain evidence provisioning | Materios does not expose GRANDPA justification via RPC; relayer must supply it |
| 2026-09-01 | Independent verifier (no node contact) | Matches beacon-trust-model design; verifier doesn't need to trust node |
| 2026-09-01 | Adversarial test matrix | PoC-1 must reject plausible-looking but invalid proofs |
| 2026-09-01 | Domain separation in GRANDPA messages | Must use correct signing context (not generic) |
