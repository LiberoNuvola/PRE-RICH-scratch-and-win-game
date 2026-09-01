import {
  describe,
  expect,
  it
} from "vitest";

import {
  ScaleReader,
  concatBytes,
  encodeCompact,
  encodeU32,
  encodeU64,
  hexToBytes
} from "../src/scale.js";

describe("SCALE", () => {
  it("encodes u32 little endian", () => {
    expect(
      Array.from(
        encodeU32(0x12345678n)
      )
    ).toEqual([
      0x78,
      0x56,
      0x34,
      0x12
    ]);
  });

  it("encodes u64 little endian", () => {
    expect(
      Array.from(
        encodeU64(
          0x0102030405060708n
        )
      )
    ).toEqual([
      0x08,
      0x07,
      0x06,
      0x05,
      0x04,
      0x03,
      0x02,
      0x01
    ]);
  });

  it("round trips compact integers", () => {
    const values = [
      0n,
      1n,
      63n,
      64n,
      255n,
      16383n,
      16384n,
      1_000_000n,
      1n << 30n,
      1n << 40n
    ];

    for (const value of values) {
      const encoded =
        encodeCompact(value);

      const reader =
        new ScaleReader(encoded);

      expect(
        reader.readCompact()
      ).toBe(value);

      reader.assertEof();
    }
  });

  it("rejects trailing bytes", () => {
    const encoded = concatBytes(
      encodeU32(42n),
      Uint8Array.of(0xaa)
    );

    const reader =
      new ScaleReader(encoded);

    expect(
      reader.readU32()
    ).toBe(42n);

    expect(
      () => reader.assertEof()
    ).toThrow("TRAILING_BYTES");
  });

  it("rejects truncated input", () => {
    const reader =
      new ScaleReader(
        hexToBytes("010203")
      );

    expect(
      () => reader.readU32()
    ).toThrow("UNEXPECTED_EOF");
  });
});
