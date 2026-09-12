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

import {
  isAncestor,
  verifyAncestryEvidence
} from "./ancestry.js";

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
  | "INVALID_ANCESTRY"
  | "ANCESTRY_NOT_VERIFIED"
  | "PRECOMMIT_TARGET_MISSING"
  | "PRECOMMIT_TARGET_NUMBER_MISMATCH"
  | "PRECOMMIT_TARGET_NOT_DESCENDANT";

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
   * PoC-1A deliberately gets set_id only
   * from trusted authority state.
   *
   * There is no justification.setId field
   * to trust.
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
    if (
      signed.signer.length !== 32
    ) {
      throw new VerificationError(
        "INVALID_SIGNER"
      );
    }

    if (
      signed.signature.length !== 64
    ) {
      throw new VerificationError(
        "INVALID_SIGNATURE"
      );
    }

    const signerId =
      bytesToHex(signed.signer);

    if (
      seen.has(signerId)
    ) {
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
   * A successful signature + quorum check
   * is NOT enough for finality when ancestry
   * verification has been requested.
   */
  if (options.verifyAncestry) {
    let verifiedAncestry;

    try {
      verifiedAncestry =
        verifyAncestryEvidence(
          justification.votesAncestries,
          justification.commit.targetHash,
          justification.commit.targetNumber
        );
    } catch {
      throw new VerificationError(
        "INVALID_ANCESTRY"
      );
    }

    /*
     * Every signed precommit target must be
     * represented by the verified ancestry
     * evidence and must be a descendant of
     * the commit target.
     *
     * This prevents a valid signature quorum
     * from being assembled from blocks that
     * are unrelated to the committed target.
     */
    for (
      const signed of
      justification.commit.precommits
    ) {
      const precommit =
        signed.precommit;

      const target =
        verifiedAncestry.find(
          header =>
            equalBytes(
              header.hash,
              precommit.targetHash
            )
        );

      if (!target) {
        throw new VerificationError(
          "PRECOMMIT_TARGET_MISSING"
        );
      }

      if (
        target.number !==
        precommit.targetNumber
      ) {
        throw new VerificationError(
          "PRECOMMIT_TARGET_NUMBER_MISMATCH"
        );
      }

      const commitTarget =
        verifiedAncestry.find(
          header =>
            equalBytes(
              header.hash,
              justification.commit.targetHash
            )
        );

      if (!commitTarget) {
        throw new VerificationError(
          "INVALID_ANCESTRY"
        );
      }

      if (
        !isAncestor(
          target,
          commitTarget,
          verifiedAncestry
        )
      ) {
        throw new VerificationError(
          "PRECOMMIT_TARGET_NOT_DESCENDANT"
        );
      }
    }

    /*
     * The ancestry and precommit-target
     * relationships are now structurally
     * verified.
     *
     * This PoC still does not claim production
     * GRANDPA finality because full justification
     * semantics and authenticated authority-set
     * transitions remain separate obligations.
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