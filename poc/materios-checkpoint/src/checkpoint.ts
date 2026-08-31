import { createHash } from "node:crypto";
import type { GrandpaAuthority } from "./scale.js";

export type CanonicalCheckpoint = {
  schema: "PRE-RICH/CanonicalCheckpoint/V0";
  chain_id: string;
  /** PoC-0: head at query time — NOT yet f(roundId). */
  binding: "finalized_head_at_query_time";
  runtime_spec_version: number;
  runtime_spec_name: string;
  checkpoint: {
    block_number: number;
    block_hash: string;
    state_root: string;
    parent_hash: string;
  };
  grandpa: {
    set_id: number;
    authorities: GrandpaAuthority[];
    authority_commitment: string;
  };
  meta: {
    produced_at_utc: string;
    rpc_endpoint: string;
    note: string;
  };
};

/**
 * Deterministic commitment over authority set.
 * Domain-separated; stable field order.
 */
export function authorityCommitment(
  setId: number,
  authorities: GrandpaAuthority[]
): string {
  const payload = [
    "PRE-RICH/GRANDPA/AUTHORITY_COMMITMENT/V0",
    String(setId),
    ...authorities.map((a) => `${a.public_key}:${a.weight}`),
  ].join("|");

  return (
    "0x" + createHash("sha256").update(payload, "utf8").digest("hex")
  );
}

export function buildCheckpoint(args: {
  chainId: string;
  specVersion: number;
  specName: string;
  blockNumber: number;
  blockHash: string;
  stateRoot: string;
  parentHash: string;
  setId: number;
  authorities: GrandpaAuthority[];
  rpcEndpoint: string;
}): CanonicalCheckpoint {
  const commitment = authorityCommitment(args.setId, args.authorities);

  return {
    schema: "PRE-RICH/CanonicalCheckpoint/V0",
    chain_id: args.chainId,
    binding: "finalized_head_at_query_time",
    runtime_spec_version: args.specVersion,
    runtime_spec_name: args.specName,
    checkpoint: {
      block_number: args.blockNumber,
      block_hash: args.blockHash,
      state_root: args.stateRoot,
      parent_hash: args.parentHash,
    },
    grandpa: {
      set_id: args.setId,
      authorities: args.authorities,
      authority_commitment: commitment,
    },
    meta: {
      produced_at_utc: new Date().toISOString(),
      rpc_endpoint: args.rpcEndpoint,
      note:
        "PoC-0 evidence only. Not a finality proof. Not B3. Adapter is untrusted.",
    },
  };
}

/** Stable JSON for reproducibility checks (sorted keys via fixed structure). */
export function serializeCheckpoint(cp: CanonicalCheckpoint): string {
  return JSON.stringify(cp, null, 2) + "\n";
}