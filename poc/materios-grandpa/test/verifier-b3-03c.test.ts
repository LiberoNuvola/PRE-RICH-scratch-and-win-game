import { describe, expect, it } from "vitest";

import {
  encodeLocalizedPrecommitPayload
} from "../src/grandpa.js";

import {
  nobleEd25519
} from "../src/crypto.js";

import {
  verifyFinality
} from "../src/verifier.js";

import type {
  GrandpaJustification
} from "../src/grandpa.js";

import type {
  TrustedAuthorityState
} from "../src/authority.js";

import {
  bytesToHex,
  hexToBytes
} from "../src/scale.js";

/*
 * B3-03C — real GRANDPA Ed25519 vector.
 *
 * The vector uses the canonical GRANDPA localized payload layout
 * confirmed against sp_consensus_grandpa:
 *
 *   SCALE(message, round, set_id)
 *
 * For this PoC, message is the GRANDPA Precommit:
 *
 *   target_hash || target_number
 *
 * The signatures below are real Ed25519 signatures over that exact
 * 56-byte payload. No test crypto stub is used.
 *
 * IMPORTANT:
 * The current PRE-RICH poc1-spec additionally states a Blake2-256
 * step before Ed25519. This file deliberately records the raw
 * GRANDPA/Substrate vector first; the spec-vs-upstream hashing
 * discrepancy is handled as a separate decision and does not get
 * silently resolved here.
 */

const targetHash = Uint8Array.from(
  Array.from({ length: 32 }, (_, i) => i)
);

const targetNumber = 42n;
const round = 7n;
const setId = 3n;

const expectedPayloadHex =
  "000102030405060708090a0b0c0d0e0f" +
  "101112131415161718191a1b1c1d1e1f" +
  "2a00000000000000" +
  "0700000000000000" +
  "0300000000000000";

const authorities = [
  {
    publicKey: hexToBytes(
      "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
    ),
    weight: 1n
  },
  {
    publicKey: hexToBytes(
      "3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c"
    ),
    weight: 1n
  },
  {
    publicKey: hexToBytes(
      "1838e47a13cef82402b9f642b0b6b3bebf5f46feea1f5f34abc17a002f62470e"
    ),
    weight: 1n
  }
];

const signatures = [
  hexToBytes(
    "bd6d344fb6f8b833469a458d3409fadbcc1e111b624766dd56566d894254342ce08662a1c38a1e4808be2704fc455264bc9f6a580735a86c96463cc4a00c6100"
  ),
  hexToBytes(
    "d4e331b96d2c6cda1f385d7a5de15c6c749575e8d798497f2e4b3d9ab8c3d4e85036c081450756033ee50ffbe302957cb772a2d630f02feefadca55aac252e0f"
  ),
  hexToBytes(
    "f0d9026eac3a57b1e962b6904f7d299914bf7e80e7a0da8943de5c7840328f57317bfa73e00c19ee8e625ae3efd2f0238adb4c7f15ccfa0a7eb1944abbd88c05"
  )
];

function makeState(
  currentSetId = setId
): TrustedAuthorityState {
  return {
    chainId: "materios",
    genesisHash: new Uint8Array(32).fill(0x01),
    setId: currentSetId,
    authorities
  };
}

function makeJustification(
  currentRound = round,
  currentTargetHash = targetHash
): GrandpaJustification {
  return {
    round: currentRound,
    commit: {
      targetHash: currentTargetHash,
      targetNumber,
      precommits: authorities.map(
        (authority, index) => ({
          precommit: {
            targetHash: currentTargetHash,
            targetNumber
          },
          signer: authority.publicKey,
          signature: signatures[index]!
        })
      )
    },
    votesAncestries: []
  };
}

function makeCheckpoint(
  currentTargetHash = targetHash
) {
  return {
    chainId: "materios",
    genesisHash: new Uint8Array(32).fill(0x01),
    blockHash: currentTargetHash,
    blockNumber: targetNumber
  };
}

describe("B3-03C — real GRANDPA Ed25519 vector", () => {
  it("encodes the localized precommit payload exactly", () => {
    const payload = encodeLocalizedPrecommitPayload(
      {
        targetHash,
        targetNumber
      },
      round,
      setId
    );

    expect(payload.length).toBe(56);
    expect(bytesToHex(payload)).toBe(
      expectedPayloadHex
    );
  });

  it("accepts a real Ed25519 signature over the localized payload", async () => {
    const payload =
      encodeLocalizedPrecommitPayload(
        {
          targetHash,
          targetNumber
        },
        round,
        setId
      );

    const valid =
      await nobleEd25519.verify(
        signatures[0]!,
        payload,
        authorities[0]!.publicKey
      );

    expect(valid).toBe(true);
  });

  it("verifies a real GRANDPA quorum without a crypto stub", async () => {
    const result = await verifyFinality(
      makeCheckpoint(),
      makeJustification(),
      makeState(),
      nobleEd25519,
      {
        verifyAncestry: false
      }
    );

    expect(result.verified).toBe(true);
    expect(result.round).toBe(round);
    expect(result.setId).toBe(setId);
    expect(result.signedWeight).toBe(3n);
    expect(result.totalWeight).toBe(3n);
  });

  it("rejects the same signatures when the round changes", async () => {
    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification(round + 1n),
        makeState(),
        nobleEd25519,
        {
          verifyAncestry: false
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE"
    });
  });

  it("rejects the same signatures when trusted setId changes", async () => {
    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification(),
        makeState(setId + 1n),
        nobleEd25519,
        {
          verifyAncestry: false
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE"
    });
  });

  it("rejects the same signatures when the precommit target changes", async () => {
    const changedTarget = new Uint8Array(32).fill(0xff);

    await expect(
      verifyFinality(
        makeCheckpoint(changedTarget),
        makeJustification(round, changedTarget),
        makeState(),
        nobleEd25519,
        {
          verifyAncestry: false
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE"
    });
  });

  it("rejects a mutated signature", async () => {
    const justification = makeJustification();
    justification.commit.precommits[0]!.signature =
      Uint8Array.from(signatures[0]!);

    justification.commit.precommits[0]!.signature[0] ^=
      0x01;

    await expect(
      verifyFinality(
        makeCheckpoint(),
        justification,
        makeState(),
        nobleEd25519,
        {
          verifyAncestry: false
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE"
    });
  });

  it("rejects an authority key that is not the signing key", async () => {
    const state = makeState();

    state.authorities[0] = {
      publicKey: new Uint8Array(32).fill(0x99),
      weight: 1n
    };

    await expect(
      verifyFinality(
        makeCheckpoint(),
        makeJustification(),
        state,
        nobleEd25519,
        {
          verifyAncestry: false
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE"
    });
  });

  it("does not allow trusted weight to turn an invalid signature into quorum", async () => {
    const state = makeState();

    state.authorities[0]!.weight = 100n;

    const justification = makeJustification();
    justification.commit.precommits[0]!.signature =
      new Uint8Array(64);

    await expect(
      verifyFinality(
        makeCheckpoint(),
        justification,
        state,
        nobleEd25519,
        {
          verifyAncestry: false
        }
      )
    ).rejects.toMatchObject({
      code: "INVALID_SIGNATURE"
    });
  });
});
