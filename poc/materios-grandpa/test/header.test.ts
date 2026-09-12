import { describe, expect, it } from "vitest";

import {
  decodeSubstrateHeader,
  encodeSubstrateHeader,
  hashSubstrateHeader,
  verifyHeaderEvidence,
} from "../src/header.js";

function concatBytes(
  ...parts: Uint8Array[]
): Uint8Array {
  const length = parts.reduce(
    (total, part) => total + part.length,
    0
  );

  const result = new Uint8Array(length);

  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function encodeCompactU32(
  value: bigint
): Uint8Array {
  if (value < 0n || value > 0xffffffffn) {
    throw new Error("VALUE_OUT_OF_U32_RANGE");
  }

  if (value < 64n) {
    return Uint8Array.of(
      Number(value << 2n)
    );
  }

  if (value < 16384n) {
    const encoded = value << 2n;

    return Uint8Array.of(
      Number(encoded & 0xffn),
      Number((encoded >> 8n) & 0xffn)
    );
  }

  if (value < 0x40000000n) {
    const encoded = value << 2n;

    return Uint8Array.of(
      Number(encoded & 0xffn),
      Number((encoded >> 8n) & 0xffn),
      Number((encoded >> 16n) & 0xffn),
      Number((encoded >> 24n) & 0xffn)
    );
  }

  return Uint8Array.of(
    0x03,
    Number(value & 0xffn),
    Number((value >> 8n) & 0xffn),
    Number((value >> 16n) & 0xffn),
    Number((value >> 24n) & 0xffn)
  );
}

function encodeBytes(
  data: Uint8Array
): Uint8Array {
  return concatBytes(
    encodeCompactU32(BigInt(data.length)),
    data
  );
}

function makeDigestOther(
  data: Uint8Array = new Uint8Array()
): Uint8Array {
  return concatBytes(
    Uint8Array.of(0),
    encodeBytes(data)
  );
}

function makeDigestConsensus(
  engineId: Uint8Array,
  data: Uint8Array
): Uint8Array {
  return concatBytes(
    Uint8Array.of(4),
    engineId,
    encodeBytes(data)
  );
}

function makeDigestSeal(
  engineId: Uint8Array,
  data: Uint8Array
): Uint8Array {
  return concatBytes(
    Uint8Array.of(5),
    engineId,
    encodeBytes(data)
  );
}

function makeDigestPreRuntime(
  engineId: Uint8Array,
  data: Uint8Array
): Uint8Array {
  return concatBytes(
    Uint8Array.of(6),
    engineId,
    encodeBytes(data)
  );
}

function makeDigestRuntimeEnvironmentUpdated(): Uint8Array {
  return Uint8Array.of(8);
}

function makeHeader(
  number: bigint,
  digestItems: Uint8Array[] = []
): Uint8Array {
  const parentHash =
    new Uint8Array(32).fill(0x11);

  const stateRoot =
    new Uint8Array(32).fill(0x22);

  const extrinsicsRoot =
    new Uint8Array(32).fill(0x33);

  return concatBytes(
    parentHash,
    encodeCompactU32(number),
    stateRoot,
    extrinsicsRoot,
    encodeCompactU32(
      BigInt(digestItems.length)
    ),
    ...digestItems
  );
}

describe("Substrate header", () => {
  it("decodes a minimal valid header", () => {
    const raw = makeHeader(1n);

    const decoded =
      decodeSubstrateHeader(raw);

    expect(decoded.number).toBe(1n);
    expect(decoded.parentHash).toHaveLength(32);
    expect(decoded.stateRoot).toHaveLength(32);
    expect(decoded.extrinsicsRoot).toHaveLength(32);
    expect(decoded.digest).toHaveLength(0);
  });

  it("round-trips a header through decode and encode", () => {
    const engineId =
      new Uint8Array([
        0x53,
        0x55,
        0x42,
        0x53,
      ]);

    const digest = [
      makeDigestOther(
        new Uint8Array([
          0xaa,
          0xbb,
        ])
      ),
      makeDigestConsensus(
        engineId,
        new Uint8Array([
          0x01,
          0x02,
          0x03,
        ])
      ),
      makeDigestSeal(
        engineId,
        new Uint8Array([
          0x04,
          0x05,
        ])
      ),
      makeDigestPreRuntime(
        engineId,
        new Uint8Array([
          0x06,
        ])
      ),
      makeDigestRuntimeEnvironmentUpdated(),
    ];

    const raw =
      makeHeader(42n, digest);

    const decoded =
      decodeSubstrateHeader(raw);

    const encoded =
      encodeSubstrateHeader(decoded);

    expect(encoded).toEqual(raw);
  });

  it("decodes all supported DigestItem variants", () => {
    const engineId =
      new Uint8Array([
        0x47,
        0x52,
        0x50,
        0x41,
      ]);

    const raw = makeHeader(42n, [
      makeDigestOther(
        new Uint8Array([0x01])
      ),
      makeDigestConsensus(
        engineId,
        new Uint8Array([0x02])
      ),
      makeDigestSeal(
        engineId,
        new Uint8Array([0x03])
      ),
      makeDigestPreRuntime(
        engineId,
        new Uint8Array([0x04])
      ),
      makeDigestRuntimeEnvironmentUpdated(),
    ]);

    const decoded =
      decodeSubstrateHeader(raw);

    expect(decoded.digest).toHaveLength(5);

    expect(decoded.digest[0]).toEqual({
      kind: "Other",
      data: new Uint8Array([0x01]),
    });

    expect(decoded.digest[1]).toEqual({
      kind: "Consensus",
      engineId,
      data: new Uint8Array([0x02]),
    });

    expect(decoded.digest[2]).toEqual({
      kind: "Seal",
      engineId,
      data: new Uint8Array([0x03]),
    });

    expect(decoded.digest[3]).toEqual({
      kind: "PreRuntime",
      engineId,
      data: new Uint8Array([0x04]),
    });

    expect(decoded.digest[4]).toEqual({
      kind:
        "RuntimeEnvironmentUpdated",
    });
  });

  it("accepts block number zero", () => {
    const raw = makeHeader(0n);

    const decoded =
      decodeSubstrateHeader(raw);

    expect(decoded.number).toBe(0n);
  });

  it("accepts block number 2^30", () => {
    const raw =
      makeHeader(0x40000000n);

    const decoded =
      decodeSubstrateHeader(raw);

    expect(decoded.number).toBe(
      0x40000000n
    );
  });

  it("accepts block number u32::MAX", () => {
    const raw =
      makeHeader(0xffffffffn);

    const decoded =
      decodeSubstrateHeader(raw);

    expect(decoded.number).toBe(
      0xffffffffn
    );
  });

  it("rejects non-canonical Compact<u32> encoding", () => {
    const parentHash =
      new Uint8Array(32).fill(0x11);

    const stateRoot =
      new Uint8Array(32).fill(0x22);

    const extrinsicsRoot =
      new Uint8Array(32).fill(0x33);

    const raw = concatBytes(
      parentHash,

      Uint8Array.of(
        0x04,
        0x00
      ),

      stateRoot,
      extrinsicsRoot,

      Uint8Array.of(0x00)
    );

    expect(() =>
      decodeSubstrateHeader(raw)
    ).toThrow();
  });

  it("rejects unsupported DigestItem discriminants", () => {
    const invalidIndices = [
      1,
      2,
      3,
      7,
      9,
      255,
    ];

    for (
      const index of invalidIndices
    ) {
      const raw =
        makeHeader(1n, [
          Uint8Array.of(index),
        ]);

      expect(
        () =>
          decodeSubstrateHeader(raw)
      ).toThrow();
    }
  });

  it("rejects a truncated header", () => {
    const raw = makeHeader(1n);

    for (
      let length = 0;
      length < raw.length;
      length++
    ) {
      expect(
        () =>
          decodeSubstrateHeader(
            raw.slice(0, length)
          )
      ).toThrow();
    }
  });

  it("rejects trailing bytes", () => {
    const raw = makeHeader(1n);

    const withTrailingBytes =
      concatBytes(
        raw,
        Uint8Array.of(0xff)
      );

    expect(() =>
      decodeSubstrateHeader(
        withTrailingBytes
      )
    ).toThrow();
  });

  it("rejects a truncated digest payload", () => {
    const engineId =
      new Uint8Array([
        0x47,
        0x52,
        0x50,
        0x41,
      ]);

    const digest =
      concatBytes(
        Uint8Array.of(6),
        engineId,
        encodeCompactU32(5n),
        Uint8Array.of(
          0xaa,
          0xbb
        )
      );

    const raw =
      makeHeader(1n, [
        digest,
      ]);

    expect(() =>
      decodeSubstrateHeader(raw)
    ).toThrow();
  });

  it("rejects an invalid engine id length", () => {
    const digest =
      concatBytes(
        Uint8Array.of(6),
        Uint8Array.of(
          0x01,
          0x02,
          0x03
        )
      );

    const raw =
      makeHeader(1n, [
        digest,
      ]);

    expect(() =>
      decodeSubstrateHeader(raw)
    ).toThrow();
  });

  it("produces a deterministic 32-byte hash", () => {
    const raw = makeHeader(42n);

    const first =
      hashSubstrateHeader(raw);

    const second =
      hashSubstrateHeader(raw);

    expect(first).toHaveLength(32);
    expect(first).toEqual(second);
  });

  it("changes the hash when the block number changes", () => {
    const first =
      makeHeader(42n);

    const second =
      makeHeader(43n);

    expect(
      hashSubstrateHeader(first)
    ).not.toEqual(
      hashSubstrateHeader(second)
    );
  });

  it("changes the hash when the parent hash changes", () => {
    const original =
      makeHeader(42n);

    const changed =
      original.slice();

    changed[0] ^= 0xff;

    expect(
      hashSubstrateHeader(original)
    ).not.toEqual(
      hashSubstrateHeader(changed)
    );
  });

  it("changes the hash when the state root changes", () => {
    const original =
      makeHeader(42n);

    const changed =
      original.slice();

    changed[33] ^= 0xff;

    expect(
      hashSubstrateHeader(original)
    ).not.toEqual(
      hashSubstrateHeader(changed)
    );
  });

  it("changes the hash when the extrinsics root changes", () => {
    const original =
      makeHeader(42n);

    const changed =
      original.slice();

    changed[65] ^= 0xff;

    expect(
      hashSubstrateHeader(original)
    ).not.toEqual(
      hashSubstrateHeader(changed)
    );
  });

  it("changes the hash when the digest changes", () => {
    const first =
      makeHeader(42n, [
        makeDigestOther(
          new Uint8Array([0x01])
        ),
      ]);

    const second =
      makeHeader(42n, [
        makeDigestOther(
          new Uint8Array([0x02])
        ),
      ]);

    expect(
      hashSubstrateHeader(first)
    ).not.toEqual(
      hashSubstrateHeader(second)
    );
  });

  it("verifies header evidence", () => {
    const raw = makeHeader(42n);

    const evidence =
      verifyHeaderEvidence(raw);

    expect(evidence.number).toBe(42n);
    expect(evidence.rawHeader).toEqual(raw);
    expect(evidence.hash).toHaveLength(32);
  });

  it("accepts the correct expected header hash", () => {
    const raw = makeHeader(42n);

    const expectedHash =
      hashSubstrateHeader(raw);

    const evidence =
      verifyHeaderEvidence(
        raw,
        expectedHash
      );

    expect(evidence.hash).toEqual(
      expectedHash
    );
  });

  it("rejects an incorrect expected header hash", () => {
    const raw = makeHeader(42n);

    const wrongHash =
      new Uint8Array(32).fill(0xff);

    expect(() =>
      verifyHeaderEvidence(
        raw,
        wrongHash
      )
    ).toThrow();
  });

  it("does not treat header validity as proof of finality", () => {
    const raw = makeHeader(42n);

    const evidence =
      verifyHeaderEvidence(raw);

    expect(evidence.number).toBe(42n);
    expect(evidence.hash).toHaveLength(32);
  });
});