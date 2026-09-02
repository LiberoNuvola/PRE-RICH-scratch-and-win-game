import {
  concatBytes,
  encodeU64
} from "./scale.js";

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
  round: bigint;
  commit: GrandpaCommit;
  votesAncestries?: unknown[];
}

export function encodeLocalizedPrecommitPayload(
  precommit: GrandpaPrecommit,
  round: bigint,
  setId: bigint
): Uint8Array {
  return concatBytes(
    precommit.targetHash,
    encodeU64(precommit.targetNumber),
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
