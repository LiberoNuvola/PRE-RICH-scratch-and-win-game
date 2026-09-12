import {
  blake2b
} from "@noble/hashes/blake2.js";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  verifyFinality
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

import {
  encodeMateriosHeader,
  MATERIOS_HEADER_ENCODING,
  type GrandpaAncestryHeader,
  type GrandpaDigest
} from "../src/ancestry.js";

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

function makeCheckpointFromHeader(
  header: GrandpaAncestryHeader
) {
  return {
    chainId: "materios",
    genesisHash:
      new Uint8Array(32).fill(0x01),
    blockHash:
      header.hash,
    blockNumber:
      header.number
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

const emptyDigest: GrandpaDigest = {
  logs: []
};

function syntheticHeader(
  number: bigint,
  parentHash: Uint8Array
): GrandpaAncestryHeader {
  const decoded = {
    parentHash,
    number,
    stateRoot:
      new Uint8Array(32).fill(0x22),
    extrinsicsRoot:
      new Uint8Array(32).fill(0x33),
    digest: emptyDigest
  };

  const rawHeader =
    encodeMateriosHeader(decoded);

  return {
    ...decoded,
    rawHeader,
    hash:
      blake2b(
        rawHeader,
        { dkLen: 32 }
      ),
    encoding:
      MATERIOS_HEADER_ENCODING
  };
}

function makeValidAncestry(): GrandpaAncestryHeader[] {
  const commitTarget =
    syntheticHeader(
      100n,
      new Uint8Array(32)
    );

  const precommitTarget =
    syntheticHeader(
      101n,
      commitTarget.hash
    );

  return [
    precommitTarget
  ];
}

function makeValidJustification(): GrandpaJustification {
  const ancestry =
    makeValidAncestry();

  const commitTarget =
    syntheticHeader(
      100n,
      new Uint8Array(32)
    );

  const precommitTarget =
    ancestry[0];

  return {
    round: 7n,
    commit: {
      targetHash:
        commitTarget.hash,
      targetNumber:
        commitTarget.number,
      precommits: [
        1,
        2,
        3
      ].map(
        signer => ({
          precommit: {
            targetHash:
              precommitTarget.hash,
            targetNumber:
              precommitTarget.number
          },
          signature:
            new Uint8Array(
              64
            ).fill(0x55),
          signer:
            new Uint8Array(
              32
            ).fill(signer)
        })
      )
    },
    votesAncestries:
      ancestry
  };
}

describe("verifier", () => {
  it(
    "rejects a precommit signed by an unknown authority",
    async () => {
      await expect(
        verifyFinality(
          makeCheckpoint(),
          makeJustification([99]),
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              false
          }
        )
      ).rejects.toMatchObject({
        code:
          "UNKNOWN_AUTHORITY"
      });
    }
  );

  it(
    "rejects duplicate signer",
    async () => {
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
          {
            verifyAncestry:
              false
          }
        )
      ).rejects.toMatchObject({
        code:
          "DUPLICATE_SIGNER"
      });
    }
  );

  it(
    "rejects insufficient quorum",
    async () => {
      await expect(
        verifyFinality(
          makeCheckpoint(),
          makeJustification([
            1,
            2
          ]),
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              false
          }
        )
      ).rejects.toMatchObject({
        code:
          "INSUFFICIENT_WEIGHT"
      });
    }
  );

  it(
    "rejects wrong checkpoint hash",
    async () => {
      const checkpoint =
        makeCheckpoint();

      checkpoint.blockHash =
        new Uint8Array(
          32
        ).fill(0xcc);

      await expect(
        verifyFinality(
          checkpoint,
          makeJustification([
            1,
            2,
            3
          ]),
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              false
          }
        )
      ).rejects.toMatchObject({
        code:
          "TARGET_HASH_MISMATCH"
      });
    }
  );

  it(
    "rejects wrong checkpoint number",
    async () => {
      const checkpoint =
        makeCheckpoint();

      checkpoint.blockNumber =
        101n;

      await expect(
        verifyFinality(
          checkpoint,
          makeJustification([
            1,
            2,
            3
          ]),
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              false
          }
        )
      ).rejects.toMatchObject({
        code:
          "TARGET_NUMBER_MISMATCH"
      });
    }
  );

  it(
    "does not silently accept ancestry as verified",
    async () => {
      await expect(
        verifyFinality(
          makeCheckpoint(),
          makeJustification([
            1,
            2,
            3
          ]),
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              true
          }
        )
      ).rejects.toMatchObject({
        code:
          "PRECOMMIT_TARGET_NOT_DESCENDANT"
      });
    }
  );

  it(
    "can verify a single trusted set without ancestry phase",
    async () => {
      const result =
        await verifyFinality(
          makeCheckpoint(),
          makeJustification([
            1,
            2,
            3
          ]),
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              false
          }
        );

      expect(
        result.verified
      ).toBe(true);

      expect(
        result.setId
      ).toBe(0n);

      expect(
        result.signedWeight
      ).toBe(3n);

      expect(
        result.totalWeight
      ).toBe(4n);
    }
  );

  it(
    "accepts structurally valid ancestry binding for every precommit",
    async () => {
      const justification =
        makeValidJustification();

      const commitTarget =
        syntheticHeader(
          100n,
          new Uint8Array(32)
        );

      const checkpoint =
        makeCheckpointFromHeader(
          commitTarget
        );

      await expect(
        verifyFinality(
          checkpoint,
          justification,
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              true
          }
        )
      ).rejects.toMatchObject({
        code:
          "ANCESTRY_NOT_VERIFIED"
      });
    }
  );

  it(
    "rejects a precommit target missing from ancestry",
    async () => {
      const ancestry =
        makeValidAncestry();

      const commitTarget =
        syntheticHeader(
          100n,
          new Uint8Array(32)
        );

      const missingTarget =
        syntheticHeader(
          102n,
          ancestry[0].hash
        );

      const justification:
        GrandpaJustification = {
        round: 7n,
        commit: {
          targetHash:
            commitTarget.hash,
          targetNumber:
            commitTarget.number,
          precommits: [
            1,
            2,
            3
          ].map(
            signer => ({
              precommit: {
                targetHash:
                  missingTarget.hash,
                targetNumber:
                  missingTarget.number
              },
              signature:
                new Uint8Array(
                  64
                ).fill(0x55),
              signer:
                new Uint8Array(
                  32
                ).fill(signer)
            })
          )
        },
        votesAncestries:
          ancestry
      };

      const checkpoint =
        makeCheckpointFromHeader(
          commitTarget
        );

      await expect(
        verifyFinality(
          checkpoint,
          justification,
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              true
          }
        )
      ).rejects.toMatchObject({
        code:
          "PRECOMMIT_TARGET_NOT_DESCENDANT"
      });
    }
  );

  it(
    "rejects a precommit target with a mismatched block number",
    async () => {
      const justification =
        makeValidJustification();

      const ancestry =
        justification
          .votesAncestries!;

      const commitTarget =
        syntheticHeader(
          100n,
          new Uint8Array(32)
        );

      const checkpoint =
        makeCheckpointFromHeader(
          commitTarget
        );

      const precommit =
        justification.commit
          .precommits[0]
          .precommit;

      precommit.targetNumber =
        100n;

      await expect(
        verifyFinality(
          checkpoint,
          justification,
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              true
          }
        )
      ).rejects.toMatchObject({
        code:
          "PRECOMMIT_TARGET_NUMBER_MISMATCH"
      });
    }
  );

  it(
    "rejects a precommit target that is not a descendant of the commit target",
    async () => {
      const commitTarget =
        syntheticHeader(
          100n,
          new Uint8Array(32)
        );

      const unrelatedTarget =
        syntheticHeader(
          101n,
          new Uint8Array(
            32
          ).fill(0xee)
        );

      const justification:
        GrandpaJustification = {
        round: 7n,
        commit: {
          targetHash:
            commitTarget.hash,
          targetNumber:
            commitTarget.number,
          precommits: [
            1,
            2,
            3
          ].map(
            signer => ({
              precommit: {
                targetHash:
                  unrelatedTarget.hash,
                targetNumber:
                  unrelatedTarget.number
              },
              signature:
                new Uint8Array(
                  64
                ).fill(0x55),
              signer:
                new Uint8Array(
                  32
                ).fill(signer)
            })
          )
        },
        votesAncestries: [
          commitTarget,
          unrelatedTarget
        ]
      };

      const checkpoint =
        makeCheckpointFromHeader(
          commitTarget
        );

      await expect(
        verifyFinality(
          checkpoint,
          justification,
          makeState(),
          alwaysValidCrypto,
          {
            verifyAncestry:
              true
          }
        )
      ).rejects.toMatchObject({
        code:
          "PRECOMMIT_TARGET_NOT_DESCENDANT"
      });
    }
  );
});