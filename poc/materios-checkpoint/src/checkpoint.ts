/**
 * CanonicalCheckpoint builder for PoC-0.
 *
 * Constructs the deterministic checkpoint object and JSON serialization.
 *
 * Properties:
 * - Strict type enforcement
 * - Deterministic serialization
 * - SHA256 authority commitment
 * - No silent truncation or rounding
 */

import { createHash } from "node:crypto";
import { GrandpaAuthority } from "./scale.js";

export interface CanonicalCheckpointInput {
  chainId: string;
  specVersion: number;
  specName: string;
  blockNumber: bigint;
  blockHash: string;
  stateRoot: string;
  parentHash: string;
  setId: bigint;
  authorities: GrandpaAuthority[];
  rpcEndpoint: string;
}

export interface CanonicalCheckpointObject {
  chain_id: string;
  runtime_spec_version: number;
  runtime_spec_name: string;
  checkpoint: {
    block_number: string;
    block_hash: string;
    state_root: string;
    parent_hash: string;
  };
  grandpa: {
    set_id: string;
    authority_count: number;
    authorities: Array<{
      public_key: string;
      weight: string;
    }>;
    authority_commitment: string;
  };
  extraction: {
    rpc_endpoint: string;
    timestamp_iso8601: string;
  };
}

/**
 * Compute SHA256 hash of authority list.
 *
 * Deterministic commitment over:
 * - count (compact)
 * - each authority: public_key (32 bytes) + weight (u64 LE)
 */
function authorityCommitment(
  authorities: GrandpaAuthority[]
): string {
  const hash = createHash("sha256");

  // Encode count as compact
  const count = authorities.length;
  if (count === 0) {
    hash.update(Buffer.from([0x00])); // compact 0
  } else if (count < 64) {
    hash.update(Buffer.from([count << 2]));
  } else if (count < 16384) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(((count << 2) | 0x01) >>> 0);
    hash.update(b);
  } else {
    // For larger counts, use 4-byte compact
    const b = Buffer.alloc(4);
    b.writeUInt32LE(((count << 2) | 0x02) >>> 0);
    hash.update(b);
  }

  // Encode each authority
  for (const auth of authorities) {
    // Public key as hex
    const pkHex = auth.public_key.startsWith("0x")
      ? auth.public_key.slice(2)
      : auth.public_key;
    const pkBuffer = Buffer.from(pkHex, "hex");
    hash.update(pkBuffer);

    // Weight as u64 little-endian
    const wBuffer = Buffer.alloc(8);
    wBuffer.writeBigUInt64LE(auth.weight);
    hash.update(wBuffer);
  }

  return "0x" + hash.digest("hex");
}

export function buildCheckpoint(
  input: CanonicalCheckpointInput
): CanonicalCheckpointObject {
  const commitment = authorityCommitment(input.authorities);

  return {
    chain_id: input.chainId,
    runtime_spec_version: input.specVersion,
    runtime_spec_name: input.specName,
    checkpoint: {
      block_number: input.blockNumber.toString(),
      block_hash: input.blockHash,
      state_root: input.stateRoot,
      parent_hash: input.parentHash,
    },
    grandpa: {
      set_id: input.setId.toString(),
      authority_count: input.authorities.length,
      authorities: input.authorities.map((a) => ({
        public_key: a.public_key,
        weight: a.weight.toString(),
      })),
      authority_commitment: commitment,
    },
    extraction: {
      rpc_endpoint: input.rpcEndpoint,
      timestamp_iso8601: new Date().toISOString(),
    },
  };
}

export function serializeCheckpoint(
  cp: CanonicalCheckpointObject
): string {
  return JSON.stringify(cp, null, 2);
}
