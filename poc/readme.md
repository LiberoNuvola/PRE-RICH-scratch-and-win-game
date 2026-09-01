# PoC-0 — Materios CanonicalCheckpoint

**Status:** ✅ IMPLEMENTED & TESTED

**Claim:** Untrusted adapter extracts a reproducible checkpoint from a real Materios node.
**B3 Status:** NOT B3. This is evidence extraction only. No canonicality proof, no finality verification.

## Purpose

Extract the required Materios consensus snapshot (block hash, state root, GRANDPA authorities, set ID) from a real or mocked node without modifying Materios. Demonstrates that the data needed for later PoC stages is available via standard JSON-RPC + Runtime API.

## Architecture

```
Materios node
    |
    | JSON-RPC + state_call
    v
PRE-RICH adapter (untrusted)
    |
    +-- chain_getFinalizedHead
    +-- chain_getHeader
    +-- state_getRuntimeVersion
    +-- state_call("GrandpaApi_grandpa_authorities", ...)
    +-- state_call("GrandpaApi_current_set_id", ...)
    |
    v
CanonicalCheckpoint.json
    |
    | deterministic commitment over authority list
    v
Ready for PoC-1 (GRANDPA finality verification)
```

## PASS Criteria (from beacon-trust-model.md)

- [1] ✅ finalized head
- [2] ✅ header
- [3] ✅ block hash
- [4] ✅ state root
- [5] ✅ runtime version
- [6] ✅ GRANDPA authorities
- [7] ✅ GRANDPA set_id
- [8] ✅ authority commitment
- [9] ✅ CanonicalCheckpoint.json deterministic encoding

## Run with Real Node

```bash
cd poc/materios-checkpoint
npm install
MATERIOS_RPC=http://127.0.0.1:9944 npm run poc0
```

Expected output: `CanonicalCheckpoint.json` in `out/` directory.

## Run with Mock Server (Testing)

No Materios node required. Mock server simulates realistic RPC responses:

```bash
cd poc/materios-checkpoint

# Terminal 1: Start mock server
MOCK_PORT=9955 npm run mock

# Terminal 2 (in same directory): Run PoC-0 against mock
MATERIOS_RPC=http://127.0.0.1:9955 MATERIOS_CHAIN_ID=materios_dev npm run poc0
```

Expected output:

```
PoC-0 Materios checkpoint
...
[1] finalized head: 0x...
[2] header.number: 291n
[3] block_hash: 0x...
[4] state_root: 0x...
[5] specVersion: 235 specName: materios
[6] authorities: 2
    [0] 0x1111... weight=1
    [1] 0x2222... weight=1
[7] set_id: 0n
[8] authority_commitment: 0x...
[9] wrote out/CanonicalCheckpoint.json

=== PASS matrix ===
PASS [1] finalized head
PASS [2] header
PASS [3] block hash
PASS [4] state root
PASS [5] runtime version
PASS [6] GRANDPA authorities
PASS [7] GRANDPA set_id
PASS [8] authority commitment
PASS [9] CanonicalCheckpoint.json

PoC-0 PASSED (extraction only — not B3)
```

## CanonicalCheckpoint.json Schema

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
        "public_key": "0x...",
        "weight": "1"
      }
    ],
    "authority_commitment": "0x..."
  },
  "extraction": {
    "rpc_endpoint": "http://...",
    "timestamp_iso8601": "2026-09-01T17:01:53.884Z"
  }
}
```

### Key Properties

- **chain_id**: Network identifier (configurable via `MATERIOS_CHAIN_ID` env var)
- **runtime_spec_version**: From `state_getRuntimeVersion` (Materios currently: 235)
- **block_number**: Finalized block height (as decimal string for precision)
- **block_hash**: Finalized block hash (32-byte, 0x-prefixed hex)
- **state_root**: State trie root at finalized block
- **GRANDPA set_id**: Current authority set ID from `GrandpaApi::current_set_id`
- **authorities**: Vec<(AccountId32, weight)> from `GrandpaApi::grandpa_authorities` (SCALE decoded)
- **authority_commitment**: SHA256(compact_count || per_authority[public_key || weight LE])
- **rpc_endpoint**: Source node for audit trail
- **timestamp_iso8601**: Extraction timestamp

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Main PoC-0 orchestrator; validates each PASS criterion |
| `src/rpc.ts` | JSON-RPC client; strict validation of Substrate types |
| `src/scale.ts` | SCALE codec for compact integers, u64, authority lists |
| `src/checkpoint.ts` | CanonicalCheckpoint builder; deterministic serialization |
| `src/test-mock.ts` | Mock RPC server for isolated testing |

### SCALE Decoding

- **Compact integers**: 00xxxxxx, 01xxxxxx xxxxxxxx, 10xxxxxx..., 11xxxxxx [N bytes]
- **u64 little-endian**: 8 bytes, no ambiguity
- **Authority list**: compact count || N × (32-byte key || u64 weight)
- **No silent truncation**: Trailing bytes rejected; all input consumed

### Authority Commitment

Deterministic SHA256 over:
1. Count as SCALE compact
2. For each authority: 32-byte public key + 8-byte weight (LE)

This commitment allows later PoC stages to verify authority set hasn't been swapped without signing an entirely new structure.

## Next Steps (PoC-1+)

PoC-0 establishes that Materios data is extractable. The next phases add cryptographic guarantees:

**PoC-1 — Independent GRANDPA Verification**
- Verify finality independently of node attestation
- Reject invalid authority sets or signatures

**PoC-2 — Storage Proof**
- Prove claimed data exists under finalized state root
- Cryptographic binding to root

**PoC-3 — Complete Proof**
- Combine finality + storage
- Establish "RootProof(ref, root, proof) ⟹ Canonical(ref, root)"

**PoC-4 — Succinct Proof**
- Halo2 or equivalent proof system
- Cardano verifier

## Limitations (Intentional)

- ✗ Does NOT verify GRANDPA finality
- ✗ Does NOT verify storage proofs
- ✗ Does NOT prove canonicality
- ✗ Does NOT claim B3 trust model
- ✓ DOES extract real consensus data from unmodified Materios
- ✓ DOES produce deterministic, reproducible checkpoints
- ✓ DOES set up the foundation for later proofs

## Testing

```bash
# Type check
npm run typecheck

# Run against mock (no dependencies)
npm run test

# Run against live node (requires Materios running)
MATERIOS_RPC=http://localhost:9944 npm run poc0
```

## See Also

- [beacon-trust-model.md](../../docs/beacon-trust-model.md) — Full B1→B3 roadmap
- [operios/partnerchain](../../materios/partnerchain/) — Substrate node source
- Section 6 in beacon-trust-model.md — PoC-0 design and success criteria