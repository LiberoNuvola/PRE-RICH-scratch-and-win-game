import {
  describe,
  expect,
  it
} from "vitest";

import {
  verifyFinality,
  VerificationError
} from "../src/verifier.js";

import type {
  GrandpaJustification
} from "../src/grandpa.js";

import type {
  TrustedAuthorityState
} from "../src/authority.js";

import type {
  Ed25519Verifier
} from "../src/crypto.js";

function makeState(
  weights = [1n, 1n, 1n, 1n]
): TrustedAuthorityState {
  return {
    chainId: "materios",
    genesisHash:
      new Uint8Array(32).fill(0x01),
    setId: 0n,
    authorities: weights.map(
      (weight, index) => ({
        publicKey:
          new Uint8Array(32).fill(
            index + 1
          ),
        weight
      })
    )
  };
}

function makeCheckpoint() {
  return {
    chainId: "materios",
    genesisHash:
      new Uint8Array(32).fill(0x01),
    blockHash:
      new Uint8Array(32).fill(0xaa),
    blockNumber: 100n
  };
}

function makeJustification(
  signers: number[]
): GrandpaJustification {
  return {
    round: 7n,
    commit: {
      targetHash:
        new Uint8Array(32).fill(0xaa),
      targetNumber: 100n,
      precommits: signers.map(
        signer => ({
          precommit: {
            targetHash:
              new Uint8Array(32).fill(
                0xbb
              ),
            targetNumber: 99n
          },
          signature:
            new Uint8Array(64).fill(0x55),
          signer:
            new Uint8Array(32).fill(
              signer
            )
        })
      )
    },
    votesAncestries: []
  };
}

const alwaysValidCrypto: Ed25519Verifier = {
  async verify() {
    return true;
  }
};

describe("verifier", () => {
  it("rejects a precommit signed by an unknown authority", async () => {
    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification([99]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: false }
      )
    ).rejects.toMatchObject({
      code: "UNKNOWN_AUTHORITY"
    });
  });

  it("rejects duplicate signer", async () => {
    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification([
          1,
          1,
          2
        ]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: false }
      )
    ).rejects.toMatchObject({
      code: "DUPLICATE_SIGNER"
    });
  });

  it("rejects insufficient quorum", async () => {
    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification([1, 2]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: false }
      )
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_WEIGHT"
    });
  });

  it("rejects wrong checkpoint hash", async () => {
    const checkpoint =
      makeCheckpoint();

    checkpoint.blockHash =
      new Uint8Array(32).fill(0xcc);

    await expect(
      verifyFinality(
        checkpoint,
        makeJustification([
          1, 2, 3
        ]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: false }
      )
    ).rejects.toMatchObject({
      code: "TARGET_HASH_MISMATCH"
    });
  });

  it("rejects wrong checkpoint number", async () => {
    const checkpoint =
      makeCheckpoint();

    checkpoint.blockNumber =
      101n;

    await expect(
      verifyFinality(
        checkpoint,
        makeJustification([
          1, 2, 3
        ]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: false }
      )
    ).rejects.toMatchObject({
      code: "TARGET_NUMBER_MISMATCH"
    });
  });

  it("does not silently accept ancestry as verified", async () => {
    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification([
          1, 2, 3
        ]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: true }
      )
    ).rejects.toMatchObject({
      code: "ANCESTRY_NOT_VERIFIED"
    });
  });

  it("can verify a single trusted set without ancestry phase", async () => {
    const result =
      await verifyFinality(
        makeCheckpoint(),
        makeJustification([
          1, 2, 3
        ]),
        makeState(),
        alwaysValidCrypto,
        { verifyAncestry: false }
      );

    expect(result.verified).toBe(true);
    expect(result.setId).toBe(0n);
    expect(result.signedWeight).toBe(3n);
    expect(result.totalWeight).toBe(4n);
  });
});
