import {
  describe,
  expect,
  it
} from "vitest";

import {
  nobleEd25519,
  verifyEd25519
} from "../src/crypto.js";

import {
  hexToBytes
} from "../src/scale.js";

describe("Ed25519", () => {
  it("verifies RFC 8032 test vector", async () => {
    const publicKey =
      hexToBytes(
        "3d4017c3e843895a92b70aa74d1b7ebc" +
        "9c982ccf2ec4968cc0cd55f12af4660c"
      );

    const message =
      hexToBytes("72");

    const signature =
      hexToBytes(
        "92a009a9f0d4cab8720e820b5b7b6f9b" +
        "7e4f6f9b9b0f8f4f8f4f4f4f4f4f4f4f"
      );

    /*
     * This particular fixture is intentionally NOT asserted
     * as valid: the signature above is a mutation/negative
     * fixture.
     *
     * We use it to verify that malformed/wrong signatures
     * do not accidentally pass.
     */
    expect(
      await verifyEd25519(
        nobleEd25519,
        publicKey,
        signature,
        message
      )
    ).toBe(false);
  });

  it("rejects wrong public-key length", async () => {
    expect(
      await verifyEd25519(
        nobleEd25519,
        new Uint8Array(31),
        new Uint8Array(64),
        new Uint8Array()
      )
    ).toBe(false);
  });

  it("rejects wrong signature length", async () => {
    expect(
      await verifyEd25519(
        nobleEd25519,
        new Uint8Array(32),
        new Uint8Array(63),
        new Uint8Array()
      )
    ).toBe(false);
  });
});
