export class ScaleDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaleDecodeError";
  }
}

export function hexToBytes(
  hex: string
): Uint8Array {
  const normalized =
    hex.startsWith("0x")
      ? hex.slice(2)
      : hex;

  if (normalized.length % 2 !== 0) {
    throw new Error(
      "hex string must have even length"
    );
  }

  if (!/^[0-9a-fA-F]*$/.test(normalized)) {
    throw new Error(
      "invalid hex string"
    );
  }

  const result =
    new Uint8Array(
      normalized.length / 2
    );

  for (
    let i = 0;
    i < result.length;
    i++
  ) {
    result[i] =
      Number.parseInt(
        normalized.slice(
          i * 2,
          i * 2 + 2
        ),
        16
      );
  }

  return result;
}

export function bytesToHex(
  bytes: Uint8Array
): string {
  return Array.from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}

export function equalBytes(
  a: Uint8Array,
  b: Uint8Array
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

export function concatBytes(
  ...parts: Uint8Array[]
): Uint8Array {
  const length =
    parts.reduce(
      (sum, part) =>
        sum + part.length,
      0
    );

  const result =
    new Uint8Array(length);

  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

export function encodeU32(
  value: bigint
): Uint8Array {
  assertUnsigned(value, 32);

  const result =
    new Uint8Array(4);

  let v = value;

  for (let i = 0; i < 4; i++) {
    result[i] =
      Number(v & 0xffn);

    v >>= 8n;
  }

  return result;
}

export function encodeU64(
  value: bigint
): Uint8Array {
  assertUnsigned(value, 64);

  const result =
    new Uint8Array(8);

  let v = value;

  for (let i = 0; i < 8; i++) {
    result[i] =
      Number(v & 0xffn);

    v >>= 8n;
  }

  return result;
}

export function decodeU32(
  reader: ScaleReader
): bigint {
  return reader.readUnsignedLE(4);
}

export function decodeU64(
  reader: ScaleReader
): bigint {
  return reader.readUnsignedLE(8);
}

/**
 * SCALE Compact<u32/u64-style integer
 * encoding.
 *
 * This implementation supports values up
 * to u64.
 */
export function encodeCompact(
  value: bigint
): Uint8Array {
  if (value < 0n) {
    throw new Error(
      "compact integer cannot be negative"
    );
  }

  if (value < 1n << 6n) {
    return Uint8Array.of(
      Number(value << 2n)
    );
  }

  if (value < 1n << 14n) {
    const encoded =
      Number(
        (value << 2n) |
        0x01n
      );

    return Uint8Array.of(
      encoded & 0xff,
      (encoded >> 8) & 0xff
    );
  }

  if (value < 1n << 30n) {
    const encoded =
      (value << 2n) |
      0x02n;

    const result =
      new Uint8Array(4);

    let v = encoded;

    for (let i = 0; i < 4; i++) {
      result[i] =
        Number(v & 0xffn);

      v >>= 8n;
    }

    return result;
  }

  if (value >= 1n << 64n) {
    throw new Error(
      "compact integer exceeds u64"
    );
  }

  let bytes = 0;
  let tmp = value;

  while (tmp > 0n) {
    bytes++;
    tmp >>= 8n;
  }

  bytes = Math.max(bytes, 4);

  if (bytes > 8) {
    throw new Error(
      "compact integer exceeds u64"
    );
  }

  const first =
    ((bytes - 4) << 2) |
    0x03;

  const result =
    new Uint8Array(
      1 + bytes
    );

  result[0] = first;

  let v = value;

  for (let i = 0; i < bytes; i++) {
    result[i + 1] =
      Number(v & 0xffn);

    v >>= 8n;
  }

  return result;
}

function assertUnsigned(
  value: bigint,
  bits: number
): void {
  if (value < 0n) {
    throw new Error(
      "value cannot be negative"
    );
  }

  const max =
    (1n << BigInt(bits)) - 1n;

  if (value > max) {
    throw new Error(
      `value exceeds u${bits}`
    );
  }
}

export class ScaleReader {
  private offset = 0;

  constructor(
    private readonly data: Uint8Array
  ) {}

  get position(): number {
    return this.offset;
  }

  get remaining(): number {
    return (
      this.data.length -
      this.offset
    );
  }

  readByte(): number {
    if (this.remaining < 1) {
      throw new ScaleDecodeError(
        "UNEXPECTED_EOF"
      );
    }

    const value =
      this.data[this.offset];

    if (value === undefined) {
      throw new ScaleDecodeError(
        "UNEXPECTED_EOF"
      );
    }

    this.offset++;

    return value;
  }

  readBytes(
    length: number
  ): Uint8Array {
    if (
      !Number.isSafeInteger(length) ||
      length < 0
    ) {
      throw new ScaleDecodeError(
        "INVALID_BYTE_LENGTH"
      );
    }

    if (this.remaining < length) {
      throw new ScaleDecodeError(
        "UNEXPECTED_EOF"
      );
    }

    const result =
      this.data.slice(
        this.offset,
        this.offset + length
      );

    this.offset += length;

    return result;
  }

  readUnsignedLE(
    byteLength: number
  ): bigint {
    if (
      !Number.isInteger(byteLength) ||
      byteLength <= 0
    ) {
      throw new ScaleDecodeError(
        "INVALID_INTEGER_WIDTH"
      );
    }

    const bytes =
      this.readBytes(byteLength);

    let value = 0n;

    for (
      let i = 0;
      i < bytes.length;
      i++
    ) {
      const byte = bytes[i];

      if (byte === undefined) {
        throw new ScaleDecodeError(
          "UNEXPECTED_EOF"
        );
      }

      value |=
        BigInt(byte) <<
        BigInt(i * 8);
    }

    return value;
  }

  readU32(): bigint {
    return this.readUnsignedLE(4);
  }

  readU64(): bigint {
    return this.readUnsignedLE(8);
  }

  readCompact(): bigint {
    const first =
      this.readByte();

    const mode =
      first & 0x03;

    if (mode === 0) {
      return BigInt(
        first >> 2
      );
    }

    if (mode === 1) {
      const second =
        this.readByte();

      const encoded =
        BigInt(first) |
        (BigInt(second) << 8n);

      return encoded >> 2n;
    }

    if (mode === 2) {
      const remaining =
        this.readBytes(3);

      const b0 =
        remaining[0];
      const b1 =
        remaining[1];
      const b2 =
        remaining[2];

      if (
        b0 === undefined ||
        b1 === undefined ||
        b2 === undefined
      ) {
        throw new ScaleDecodeError(
          "UNEXPECTED_EOF"
        );
      }

      const encoded =
        BigInt(first) |
        (BigInt(b0) << 8n) |
        (BigInt(b1) << 16n) |
        (BigInt(b2) << 24n);

      return encoded >> 2n;
    }

    const byteLength =
      (first >> 2) + 4;

    if (byteLength > 8) {
      throw new ScaleDecodeError(
        "COMPACT_INTEGER_EXCEEDS_U64"
      );
    }

    const bytes =
      this.readBytes(
        byteLength
      );

    let value = 0n;

    for (
      let i = 0;
      i < bytes.length;
      i++
    ) {
      const byte = bytes[i];

      if (byte === undefined) {
        throw new ScaleDecodeError(
          "UNEXPECTED_EOF"
        );
      }

      value |=
        BigInt(byte) <<
        BigInt(i * 8);
    }

    return value;
  }

  assertEof(): void {
    if (this.remaining !== 0) {
      throw new ScaleDecodeError(
        "TRAILING_BYTES"
      );
    }
  }

  assertEnd(): void {
    this.assertEof();
  }
}