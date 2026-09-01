import {
  findAuthority,
  totalAuthorityWeight,
  validateAuthorityState,
  type TrustedAuthorityState
} from "./authority.js";

import {
  verifyEd25519,
  type Ed25519Verifier
} from "./crypto.js";

import {
  encodeLocalizedPrecommitPayload,
  hasGrandpaQuorum,
  type GrandpaJustification
} from "./grandpa.js";

import {
  equalBytes,
  bytesToHex
} from "./scale.js";

export interface CanonicalCheckpoint {
  chainId: string;
  genesisHash: Uint8Array;
  blockHash: Uint8Array;
  blockNumber: bigint;
}

export type VerificationErrorCode =
  | "INVALID_AUTHORITY_STATE"
  | "CHAIN_ID_MISMATCH"
  | "GENESIS_HASH_MISMATCH"
  | "SET_ID_MISMATCH"
  | "TARGET_HASH_MISMATCH"
  | "TARGET_NUMBER_MISMATCH"
  | "INVALID_SIGNER"
  | "UNKNOWN_AUTHORITY"
  | "DUPLICATE_SIGNER"
  | "INVALID_SIGNATURE"
  | "INSUFFICIENT_WEIGHT"
  | "ANCESTRY_NOT_VERIFIED";

export class VerificationError extends Error {
  readonly code: VerificationErrorCode;

  constructor(
    code: VerificationErrorCode,
    message = code
  ) {
    super(message);
    this.name = "VerificationError";
    this.code = code;
  }
}

export interface VerificationResult {
  verified: true;
  chainId: string;
  genesisHash: Uint8Array;
  targetHash: Uint8Array;
  targetNumber: bigint;
  round: bigint;
  setId: bigint;
  signedWeight: bigint;
  totalWeight: bigint;
}

export interface VerificationOptions {
  verifyAncestry: boolean;
}

export async function verifyFinality(
  checkpoint: CanonicalCheckpoint,
  justification: GrandpaJustification,
  trusted: TrustedAuthorityState,
  crypto: Ed25519Verifier,
  options: VerificationOptions
): Promise<VerificationResult> {
  try {
    validateAuthorityState(trusted);
  } catch {
    throw new VerificationError(
      "INVALID_AUTHORITY_STATE"
    );
  }

  if (
    checkpoint.chainId !==
    trusted.chainId
  ) {
    throw new VerificationError(
      "CHAIN_ID_MISMATCH"
    );
  }

  if (
    !equalBytes(
      checkpoint.genesisHash,
      trusted.genesisHash
    )
  ) {
    throw new VerificationError(
      "GENESIS_HASH_MISMATCH"
    );
  }

  /*
   * PoC-1A deliberately gets set_id only from the
   * trusted authority state.
   *
   * There is no justification.setId field to trust.
   */
  const setId = trusted.setId;

  if (
    checkpoint.blockHash.length !== 32 ||
    justification.commit.targetHash.length !== 32
  ) {
    throw new VerificationError(
      "TARGET_HASH_MISMATCH"
    );
  }

  if (
    !equalBytes(
      justification.commit.targetHash,
      checkpoint.blockHash
    )
  ) {
    throw new VerificationError(
      "TARGET_HASH_MISMATCH"
    );
  }

  if (
    justification.commit.targetNumber !==
    checkpoint.blockNumber
  ) {
    throw new VerificationError(
      "TARGET_NUMBER_MISMATCH"
    );
  }

  let signedWeight = 0n;

  const totalWeight =
    totalAuthorityWeight(trusted);

  const seen = new Set<string>();

  for (
    const signed of
    justification.commit.precommits
  ) {
    if (signed.signer.length !== 32) {
      throw new VerificationError(
        "INVALID_SIGNER"
      );
    }

    if (signed.signature.length !== 64) {
      throw new VerificationError(
        "INVALID_SIGNATURE"
      );
    }

    const signerId =
      bytesToHex(signed.signer);

    if (seen.has(signerId)) {
      throw new VerificationError(
        "DUPLICATE_SIGNER"
      );
    }

    seen.add(signerId);

    const authority =
      findAuthority(
        trusted,
        signed.signer
      );

    if (!authority) {
      throw new VerificationError(
        "UNKNOWN_AUTHORITY"
      );
    }

    const payload =
      encodeLocalizedPrecommitPayload(
        signed.precommit,
        justification.round,
        setId
      );

    const valid =
      await verifyEd25519(
        crypto,
        signed.signer,
        signed.signature,
        payload
      );

    if (!valid) {
      throw new VerificationError(
        "INVALID_SIGNATURE"
      );
    }

    signedWeight += authority.weight;
  }

  if (
    !hasGrandpaQuorum(
      signedWeight,
      totalWeight
    )
  ) {
    throw new VerificationError(
      "INSUFFICIENT_WEIGHT"
    );
  }

  /*
   * IMPORTANT:
   *
   * A successful signature + quorum check is NOT enough
   * for finality when ancestry verification has been requested.
   */
  if (options.verifyAncestry) {
    /*
     * Header decoding is not yet wired to Materios's actual
     * Header type. Do not silently pass this check.
     */
    throw new VerificationError(
      "ANCESTRY_NOT_VERIFIED"
    );
  }

  return {
    verified: true,
    chainId: trusted.chainId,
    genesisHash: trusted.genesisHash,
    targetHash: checkpoint.blockHash,
    targetNumber: checkpoint.blockNumber,
    round: justification.round,
    setId,
    signedWeight,
    totalWeight
  };
}
