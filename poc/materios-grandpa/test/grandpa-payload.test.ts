import {
  describe,
  expect,
  it
} from "vitest";

import {
  encodeGrandpaPrecommitMessage,
  encodeLocalizedPrecommitPayload
} from "../src/grandpa.js";

function hex(value: Uint8Array): string {
  return Array.from(value)
    .map(byte =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

describe("GRANDPA localized signing payload", () => {
  it("encodes Message::Precommit with discriminant 1 and u32 block number", () => {
    const precommit = {
      targetHash: Uint8Array.from(
        { length: 32 },
        (_, index) => index
      ),
      targetNumber: 0x11223344n
    };

    const encoded =
      encodeGrandpaPrecommitMessage(
        precommit
      );

    expect(hex(encoded)).toBe(
      "01" +
      "000102030405060708090a0b0c0d0e0f" +
      "101112131415161718191a1b1c1d1e1f" +
      "44332211"
    );
  });

  it("encodes the exact localized payload as (message, round, set_id)", () => {
    const precommit = {
      targetHash: Uint8Array.from(
        { length: 32 },
        (_, index) => 0xa0 + index
      ),
      targetNumber: 0x01020304n
    };

    const encoded =
      encodeLocalizedPrecommitPayload(
        precommit,
        0x1122334455667788n,
        0x99aabbccddeeff00n
      );

    expect(hex(encoded)).toBe(
      "01" +
      "a0a1a2a3a4a5a6a7a8a9aaabacadaeaf" +
      "b0b1b2b3b4b5b6b7b8b9babbbcbdbebf" +
      "04030201" +
      "8877665544332211" +
      "00ffeeddccbbaa99"
    );
  });

  it("rejects a non-u32 Materios block number", () => {
    expect(() =>
      encodeGrandpaPrecommitMessage({
        targetHash: new Uint8Array(32),
        targetNumber: 0x100000000n
      })
    ).toThrow(
      "INVALID_PRECOMMIT_TARGET_NUMBER"
    );
  });

  it("rejects an invalid precommit hash length", () => {
    expect(() =>
      encodeGrandpaPrecommitMessage({
        targetHash: new Uint8Array(31),
        targetNumber: 1n
      })
    ).toThrow(
      "INVALID_PRECOMMIT_TARGET_HASH"
    );
  });

  it("rejects a round outside u64", () => {
    expect(() =>
      encodeLocalizedPrecommitPayload(
        {
          targetHash: new Uint8Array(32),
          targetNumber: 1n
        },
        0x10000000000000000n,
        0n
      )
    ).toThrow("INVALID_ROUND");
  });

  it("rejects a set id outside u64", () => {
    expect(() =>
      encodeLocalizedPrecommitPayload(
        {
          targetHash: new Uint8Array(32),
          targetNumber: 1n
        },
        0n,
        0x10000000000000000n
      )
    ).toThrow("INVALID_SET_ID");
  });
});
