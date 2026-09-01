/**
 * Strict SCALE helpers for PoC-0 GRANDPA types.
 *
 * AuthorityList = Vec<(AccountId32, u64)>
 * set_id = u64
 *
 * This module deliberately accepts only the exact encoding expected by
 * the Materios runtime API.
 *
 * Properties:
 * - no silent trailing bytes
 * - no JavaScript precision loss
 * - strict hexadecimal validation
 * - strict SCALE compact decoding
 * - bigint for all integer values
 */

export type GrandpaAuthority = {
  public_key: string;
  weight: bigint;
};

/**
 * Decode a hexadecimal string into bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string") {
    throw new Error("hex: expected string");
  }

  const h = hex.startsWith("0x") ? hex.slice(2) : hex;

  if (h.length === 0) {
    return new Uint8Array(0);
  }

  if (h.length % 2 !== 0) {
    throw new Error(`hex: odd length (${h.length})`);
  }

  if (!/^[0-9a-fA-F]+$/.test(h)) {
    throw new Error("hex: invalid hexadecimal characters");
  }

  const out = new Uint8Array(h.length / 2);

  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }

  return out;
}

/**
 * Encode bytes as 0x-prefixed lowercase hexadecimal.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * SCALE compact unsigned integer.
 *
 * Supports:
 *
 * 00xxxxxx
 * 01xxxxxx xxxxxxxx
 * 10xxxxxx xxxxxxxx xxxxxxxx xxxxxxxx
 * 11xxxxxx [N little-endian bytes]
 *
 * The returned value is bigint so no precision can be lost.
 */
export function decodeCompact(
  input: Uint8Array,
  offset: number
): {
  value: bigint;
  offset: number;
} {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`compact: invalid offset ${offset}`);
  }

  if (offset >= input.length) {
    throw new Error("compact: EOF");
  }

  const b0 = input[offset];
  const mode = b0 & 0b11;

  // Single-byte mode.
  if (mode === 0b00) {
    return {
      value: BigInt(b0 >> 2),
      offset: offset + 1,
    };
  }

  // Two-byte mode.
  if (mode === 0b01) {
    if (offset + 2 > input.length) {
      throw new Error("compact: EOF in 2-byte mode");
    }

    const value =
      (BigInt(input[offset]) |
        (BigInt(input[offset + 1]) << 8n)) >>
      2n;

    return {
      value,
      offset: offset + 2,
    };
  }

  // Four-byte mode.
  if (mode === 0b10) {
    if (offset + 4 > input.length) {
      throw new Error("compact: EOF in 4-byte mode");
    }

    const value =
      (BigInt(input[offset]) |
        (BigInt(input[offset + 1]) << 8n) |
        (BigInt(input[offset + 2]) << 16n) |
        (BigInt(input[offset + 3]) << 24n)) >>
      2n;

    return {
      value,
      offset: offset + 4,
    };
  }

  // Big-integer mode.
  const byteLength = (b0 >> 2) + 4;

  if (byteLength > 67) {
    throw new Error(
      `compact: unsupported byte length ${byteLength}`
    );
  }

  if (offset + 1 + byteLength > input.length) {
    throw new Error("compact: EOF in big-integer mode");
  }

  let value = 0n;

  for (let i = 0; i < byteLength; i++) {
    value |=
      BigInt(input[offset + 1 + i]) <<
      BigInt(8 * i);
  }

  return {
    value,
    offset: offset + 1 + byteLength,
  };
}

/**
 * Decode exactly one little-endian SCALE u64.
 */
export function decodeU64LE(
  input: Uint8Array,
  offset: number
): {
  value: bigint;
  offset: number;
} {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`u64: invalid offset ${offset}`);
  }

  if (offset + 8 > input.length) {
    throw new Error("u64: EOF");
  }

  let value = 0n;

  for (let i = 0; i < 8; i++) {
    value |=
      BigInt(input[offset + i]) <<
      BigInt(8 * i);
  }

  return {
    value,
    offset: offset + 8,
  };
}

function bigintToSafeNumber(
  value: bigint,
  field: string
): number {
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new Error(
      `${field} exceeds JavaScript safe integer range: ${value}`
    );
  }

  return Number(value);
}

/**
 * Decode exactly:
 *
 * Vec<(AccountId32, u64)>
 *
 * The entire input must be consumed.
 */
export function decodeAuthorityList(
  hex: string
): GrandpaAuthority[] {
  const bytes = hexToBytes(hex);

  const decoded = decodeAuthorityListAt(bytes, 0);

  if (decoded.offset !== bytes.length) {
    throw new Error(
      `authorities: trailing bytes (${bytes.length - decoded.offset})`
    );
  }

  return decoded.list;
}

function decodeAuthorityListAt(
  input: Uint8Array,
  offset: number
): {
  list: GrandpaAuthority[];
  offset: number;
} {
  const compact = decodeCompact(input, offset);
  const count = compact.value;

  if (count > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      `authorities: count too large: ${count}`
    );
  }

  const n = Number(count);
  const list: GrandpaAuthority[] = [];

  let cursor = compact.offset;

  for (let i = 0; i < n; i++) {
    if (cursor + 32 > input.length) {
      throw new Error(
        `authority[${i}]: public key EOF`
      );
    }

    const id = input.slice(cursor, cursor + 32);
    cursor += 32;

    const weight = decodeU64LE(input, cursor);
    cursor = weight.offset;

    list.push({
      public_key: bytesToHex(id),
      weight: weight.value,
    });
  }

  return {
    list,
    offset: cursor,
  };
}

/**
 * Decode exactly one SCALE u64.
 */
export function decodeSetId(hex: string): bigint {
  const bytes = hexToBytes(hex);

  const decoded = decodeU64LE(bytes, 0);

  if (decoded.offset !== bytes.length) {
    throw new Error(
      `set_id: trailing bytes (${bytes.length - decoded.offset})`
    );
  }

  return decoded.value;
}

/**
 * Parse a Substrate JSON-RPC header block number.
 *
 * Example:
 *   "0x1234" -> 4660n
 */
export function parseHeaderNumber(
  numberField: string
): bigint {
  if (typeof numberField !== "string") {
    throw new Error(
      "header.number: expected string"
    );
  }

  if (!/^0x[0-9a-fA-F]+$/.test(numberField)) {
    throw new Error(
      `header.number: invalid hex value ${numberField}`
    );
  }

  const value = BigInt(numberField);

  if (value < 0n) {
    throw new Error(
      "header.number: negative value"
    );
  }

  return value;
}

/**
 * Convert bigint to a JSON-safe JavaScript number.
 *
 * This must only be used when the caller explicitly requires
 * a JavaScript number.
 */
export function toSafeNumber(
  value: bigint,
  field: string
): number {
  return bigintToSafeNumber(value, field);
}
