/**
 * Minimal SCALE helpers for PoC-0 GRANDPA types.
 * AuthorityList = Vec<(AccountId32, u64)>
 * set_id = u64
 */

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error(`odd hex length: ${hex}`);
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(b: Uint8Array): string {
  return (
    "0x" +
    Array.from(b)
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** SCALE compact integer (enough for small Vec lengths). */
export function decodeCompact(input: Uint8Array, offset: number): {
  value: number;
  offset: number;
} {
  if (offset >= input.length) throw new Error("compact: EOF");
  const b0 = input[offset];
  const mode = b0 & 0b11;
  if (mode === 0b00) {
    return { value: b0 >> 2, offset: offset + 1 };
  }
  if (mode === 0b01) {
    if (offset + 1 >= input.length) throw new Error("compact: EOF");
    const v = (b0 | (input[offset + 1] << 8)) >> 2;
    return { value: v, offset: offset + 2 };
  }
  if (mode === 0b10) {
    if (offset + 3 >= input.length) throw new Error("compact: EOF");
    const v =
      (b0 |
        (input[offset + 1] << 8) |
        (input[offset + 2] << 16) |
        (input[offset + 3] << 24)) >>>
      2;
    return { value: v, offset: offset + 4 };
  }
  throw new Error("compact: big-integer mode not needed for PoC-0");
}

export function decodeU64LE(input: Uint8Array, offset: number): {
  value: bigint;
  offset: number;
} {
  if (offset + 8 > input.length) throw new Error("u64: EOF");
  let v = 0n;
  for (let i = 0; i < 8; i++) {
    v |= BigInt(input[offset + i]) << BigInt(8 * i);
  }
  return { value: v, offset: offset + 8 };
}

export type GrandpaAuthority = {
  public_key: string;
  weight: number;
};

/**
 * Decode AuthorityList: Vec<( [u8;32], u64 )>
 * Some runtimes wrap with a version byte — try bare list first, then versioned.
 */
export function decodeAuthorityList(hex: string): GrandpaAuthority[] {
  const bytes = hexToBytes(hex);
  try {
    return decodeAuthorityListAt(bytes, 0).list;
  } catch {
    // VersionedAuthorityList: (u8 version, AuthorityList)
    if (bytes.length < 1) throw new Error("authorities: empty");
    const version = bytes[0];
    if (version !== 1) {
      // still attempt decode after first byte
    }
    return decodeAuthorityListAt(bytes, 1).list;
  }
}

function decodeAuthorityListAt(
  input: Uint8Array,
  offset: number
): { list: GrandpaAuthority[]; offset: number } {
  const c = decodeCompact(input, offset);
  offset = c.offset;
  const n = c.value;
  const list: GrandpaAuthority[] = [];
  for (let i = 0; i < n; i++) {
    if (offset + 32 > input.length) throw new Error("authority id EOF");
    const id = input.slice(offset, offset + 32);
    offset += 32;
    const w = decodeU64LE(input, offset);
    offset = w.offset;
    list.push({
      public_key: bytesToHex(id),
      weight: Number(w.value),
    });
  }
  return { list, offset };
}

export function decodeSetId(hex: string): number {
  const bytes = hexToBytes(hex);
  // u64 LE
  const { value } = decodeU64LE(bytes, 0);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`set_id too large: ${value}`);
  }
  return Number(value);
}

/** Hex block number from header.number (hex string). */
export function parseHeaderNumber(numberField: string): number {
  if (typeof numberField !== "string") {
    throw new Error(`header.number type: ${typeof numberField}`);
  }
  return Number(BigInt(numberField));
}