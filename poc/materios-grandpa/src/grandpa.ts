import {
  concatBytes,
  encodeU32,
  encodeU64
} from "./scale.js";

import type {
  GrandpaAncestryHeader
} from "./ancestry.js";

export interface GrandpaPrecommit {
  targetHash: Uint8Array;
  targetNumber: bigint;
}

export interface GrandpaSignedPrecommit {
  precommit: GrandpaPrecommit;
  signer: Uint8Array;
  signature: Uint8Array;
}

export interface GrandpaCommit {
  targetHash: Uint8Array;
  targetNumber: bigint;
  precommits: GrandpaSignedPrecommit[];
}

export interface GrandpaJustification {
  readonly round: bigint;
  readonly commit: GrandpaCommit;
  readonly votesAncestries?: readonly GrandpaAncestryHeader[];
}

/**
 * Materios uses the standard finality-grandpa Message encoding.
 *
 * Message::Precommit has SCALE enum discriminant 1, followed by:
 *   - target_hash: H256, 32 bytes
 *   - target_number: BlockNumber, u32 little-endian
 */
export function encodeGrandpaPrecommitMessage(
  precommit: GrandpaPrecommit
): Uint8Array {
  if (precommit.targetHash.length !== 32) {
    throw new Error("INVALID_PRECOMMIT_TARGET_HASH");
  }

  if (
    precommit.targetNumber < 0n ||
    precommit.targetNumber > 0xffffffffn
  ) {
    throw new Error("INVALID_PRECOMMIT_TARGET_NUMBER");
  }

  return concatBytes(
    Uint8Array.of(1),
    precommit.targetHash,
    encodeU32(precommit.targetNumber)
  );
}

/**
 * Exact GRANDPA localized signing payload used by Materios.
 *
 * sp_consensus_grandpa constructs:
 *
 *   (message, round, set_id).encode()
 *
 * and signs those bytes directly with the GRANDPA ed25519 key.
 *
 * There is no additional Blake2 hash in this function.
 */
export function encodeLocalizedPrecommitPayload(
  precommit: GrandpaPrecommit,
  round: bigint,
  setId: bigint
): Uint8Array {
  if (
    round < 0n ||
    round > 0xffffffffffffffffn
  ) {
    throw new Error("INVALID_ROUND");
  }

  if (
    setId < 0n ||
    setId > 0xffffffffffffffffn
  ) {
    throw new Error("INVALID_SET_ID");
  }

  return concatBytes(
    encodeGrandpaPrecommitMessage(precommit),
    encodeU64(round),
    encodeU64(setId)
  );
}

export function hasGrandpaQuorum(
  signedWeight: bigint,
  totalWeight: bigint
): boolean {
  if (signedWeight < 0n) {
    return false;
  }

  if (totalWeight <= 0n) {
    return false;
  }

  if (signedWeight > totalWeight) {
    return false;
  }

  /*
   * Strictly greater than 2/3:
   *
   * signed / total > 2 / 3
   *
   * => 3 * signed > 2 * total
   *
   * Everything stays as bigint.
   */
  return (
    3n * signedWeight >
    2n * totalWeight
  );
}
