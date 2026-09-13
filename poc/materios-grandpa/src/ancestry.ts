import {
  blake2b
} from "@noble/hashes/blake2.js";

import {
  concatBytes,
  encodeCompact,
  equalBytes,
  ScaleDecodeError,
  ScaleReader
} from "./scale.js";

export const MATERIOS_HEADER_ENCODING =
  "materios-substrate-header-v1" as const;

export type GrandpaDigestItem =
  | {
      readonly kind: "Other";
      readonly data: Uint8Array;
    }
  | {
      readonly kind: "Consensus" | "Seal" | "PreRuntime";
      readonly engineId: Uint8Array;
      readonly data: Uint8Array;
    }
  | {
      readonly kind: "RuntimeEnvironmentUpdated";
    };

export interface GrandpaDigest {
  readonly logs: readonly GrandpaDigestItem[];
}

export interface GrandpaAncestryHeader {
  readonly hash: Uint8Array;
  readonly parentHash: Uint8Array;
  readonly number: bigint;
  readonly stateRoot: Uint8Array;
  readonly extrinsicsRoot: Uint8Array;
  readonly digest: GrandpaDigest;
  readonly rawHeader: Uint8Array;
  readonly encoding: typeof MATERIOS_HEADER_ENCODING;
}

export interface VerifiedHeader extends GrandpaAncestryHeader {
  readonly verified: true;
}

const DIGEST_ITEM_TAGS = {
  Other: 0,
  Consensus: 4,
  Seal: 5,
  PreRuntime: 6,
  RuntimeEnvironmentUpdated: 8
} as const;

const U32_MAX = 0xffffffffn;
const MAX_DIGEST_ITEMS = 1024;
const MAX_DIGEST_PAYLOAD_BYTES = 1024 * 1024;

type DecodedHeader = Omit<
  GrandpaAncestryHeader,
  "hash" | "rawHeader" | "encoding"
>;

export function decodeMateriosHeader(
  rawHeader: Uint8Array
): DecodedHeader {
  try {
    const reader = new ScaleReader(rawHeader);

    const parentHash =
      reader.readBytes(32);

    const number =
      readCanonicalCompactU32(reader);

    const stateRoot =
      reader.readBytes(32);

    const extrinsicsRoot =
      reader.readBytes(32);

    const digest =
      decodeDigest(reader);

    reader.assertEof();

    return {
      parentHash,
      number,
      stateRoot,
      extrinsicsRoot,
      digest
    };
  } catch (error) {
    if (error instanceof ScaleDecodeError) {
      throw error;
    }

    throw new ScaleDecodeError(
      "MALFORMED_HEADER"
    );
  }
}

export function encodeMateriosHeader(
  header: DecodedHeader
): Uint8Array {
  if (
    header.parentHash.length !== 32 ||
    header.stateRoot.length !== 32 ||
    header.extrinsicsRoot.length !== 32
  ) {
    throw new Error(
      "INVALID_HEADER_HASH_LENGTH"
    );
  }

  if (
    header.number < 0n ||
    header.number > U32_MAX
  ) {
    throw new Error(
      "INVALID_BLOCK_NUMBER"
    );
  }

  if (
    header.digest.logs.length >
    MAX_DIGEST_ITEMS
  ) {
    throw new Error(
      "DIGEST_TOO_LARGE"
    );
  }

  return concatBytes(
    header.parentHash,
    encodeCompact(header.number),
    header.stateRoot,
    header.extrinsicsRoot,
    encodeDigest(header.digest)
  );
}

export function verifyHeaderEvidence(
  evidence: GrandpaAncestryHeader
): VerifiedHeader {
  if (
    evidence.encoding !==
    MATERIOS_HEADER_ENCODING
  ) {
    throw new Error(
      "UNSUPPORTED_HEADER_ENCODING"
    );
  }

  if (
    evidence.hash.length !== 32
  ) {
    throw new Error(
      "INVALID_ANCESTRY_HASH"
    );
  }

  const decoded =
    decodeMateriosHeader(
      evidence.rawHeader
    );

  const canonical =
    encodeMateriosHeader(
      decoded
    );

  if (
    !equalBytes(
      canonical,
      evidence.rawHeader
    )
  ) {
    throw new Error(
      "NON_CANONICAL_HEADER"
    );
  }

  const calculatedHash =
    blake2b(
      canonical,
      { dkLen: 32 }
    );

  if (
    !equalBytes(
      calculatedHash,
      evidence.hash
    )
  ) {
    throw new Error(
      "HEADER_HASH_MISMATCH"
    );
  }

  if (
    !equalBytes(
      decoded.parentHash,
      evidence.parentHash
    )
  ) {
    throw new Error(
      "PARENT_HASH_MISMATCH"
    );
  }

  if (
    decoded.number !==
    evidence.number
  ) {
    throw new Error(
      "BLOCK_NUMBER_MISMATCH"
    );
  }

  if (
    !equalBytes(
      decoded.stateRoot,
      evidence.stateRoot
    )
  ) {
    throw new Error(
      "STATE_ROOT_MISMATCH"
    );
  }

  if (
    !equalBytes(
      decoded.extrinsicsRoot,
      evidence.extrinsicsRoot
    )
  ) {
    throw new Error(
      "EXTRINSICS_ROOT_MISMATCH"
    );
  }

  return {
    ...evidence,
    ...decoded,
    verified: true
  };
}

export function verifyAncestryEvidence(
  headers:
    | readonly GrandpaAncestryHeader[]
    | undefined,
  targetHash: Uint8Array,
  targetNumber: bigint
): readonly VerifiedHeader[] {
  if (
    headers === undefined ||
    headers.length === 0
  ) {
    throw new Error(
      "MISSING_ANCESTRY"
    );
  }

  if (
    targetHash.length !== 32
  ) {
    throw new Error(
      "INVALID_TARGET_HASH"
    );
  }

  if (
    targetNumber < 0n ||
    targetNumber > U32_MAX
  ) {
    throw new Error(
      "INVALID_TARGET_NUMBER"
    );
  }

  const verified =
    headers.map(
      verifyHeaderEvidence
    );

  const byHash =
    new Map<string, VerifiedHeader>();

  for (
    const header of verified
  ) {
    const key =
      toHex(header.hash);

    if (
      byHash.has(key)
    ) {
      throw new Error(
        "DUPLICATE_ANCESTRY_HEADER"
      );
    }

    byHash.set(
      key,
      header
    );
  }

  const target =
    byHash.get(
      toHex(targetHash)
    );

  if (
    !target ||
    target.number !== targetNumber
  ) {
    throw new Error(
      "ANCESTRY_TARGET_MISSING"
    );
  }

  /*
   * Walk every parent edge that is actually
   * represented by the supplied evidence.
   *
   * We deliberately stop when the supplied
   * evidence reaches a header whose parent is
   * not included. This function proves only
   * structural consistency of the supplied
   * ancestry evidence.
   *
   * It does NOT claim that the chain reaches
   * genesis, nor that all GRANDPA precommit
   * targets have been connected to the commit
   * target. Those are separate verification
   * obligations.
   */
  let current = target;

  while (true) {
    const parent =
      byHash.get(
        toHex(current.parentHash)
      );

    if (!parent) {
      break;
    }

    if (
      parent.number + 1n !==
      current.number
    ) {
      throw new Error(
        "NON_SEQUENTIAL_ANCESTRY"
      );
    }

    current = parent;
  }

  return verified;
}

export function isAncestor(
  descendant: GrandpaAncestryHeader,
  candidateAncestor: GrandpaAncestryHeader,
  knownHeaders:
    readonly GrandpaAncestryHeader[]
): boolean {
  try {
    const verified = [
      ...knownHeaders,
      descendant,
      candidateAncestor
    ].map(
      verifyHeaderEvidence
    );

    const byHash =
      new Map(
        verified.map(
          header => [
            toHex(header.hash),
            header
          ]
        )
      );

    let current =
      byHash.get(
        toHex(descendant.hash)
      );

    const candidate =
      byHash.get(
        toHex(candidateAncestor.hash)
      );

    if (
      !current ||
      !candidate ||
      candidate.number >
        current.number
    ) {
      return false;
    }

    while (
      current.number >
      candidate.number
    ) {
      const parent =
        byHash.get(
          toHex(current.parentHash)
        );

      if (
        !parent ||
        parent.number + 1n !==
          current.number
      ) {
        return false;
      }

      current = parent;
    }

    return equalBytes(
      current.hash,
      candidate.hash
    );
  } catch {
    return false;
  }
}

export function validateAncestryHeader(
  header: GrandpaAncestryHeader
): void {
  verifyHeaderEvidence(header);
}

export function validateAncestry(
  headers:
    | readonly GrandpaAncestryHeader[]
    | undefined
): void {
  if (
    headers === undefined
  ) {
    throw new Error(
      "MISSING_ANCESTRY"
    );
  }

  for (
    const header of headers
  ) {
    verifyHeaderEvidence(header);
  }
}

function decodeDigest(
  reader: ScaleReader
): GrandpaDigest {
  const length =
    readCanonicalCompactU32(
      reader
    );

  if (
    length >
    BigInt(MAX_DIGEST_ITEMS)
  ) {
    throw new ScaleDecodeError(
      "DIGEST_TOO_LARGE"
    );
  }

  const logs:
    GrandpaDigestItem[] = [];

  for (
    let index = 0n;
    index < length;
    index++
  ) {
    const tag =
      reader.readByte();

    if (
      tag === DIGEST_ITEM_TAGS.Other
    ) {
      logs.push({
        kind: "Other",
        data:
          readCompactBytes(reader)
      });
      continue;
    }

    if (
      tag === DIGEST_ITEM_TAGS.Consensus ||
      tag === DIGEST_ITEM_TAGS.Seal ||
      tag === DIGEST_ITEM_TAGS.PreRuntime
    ) {
      const engineId =
        reader.readBytes(4);

      const kind =
        tag === DIGEST_ITEM_TAGS.Consensus
          ? "Consensus"
          : tag === DIGEST_ITEM_TAGS.Seal
            ? "Seal"
            : "PreRuntime";

      logs.push({
        kind,
        engineId,
        data:
          readCompactBytes(reader)
      });
      continue;
    }

    if (
      tag ===
      DIGEST_ITEM_TAGS.RuntimeEnvironmentUpdated
    ) {
      logs.push({
        kind:
          "RuntimeEnvironmentUpdated"
      });
      continue;
    }

    throw new ScaleDecodeError(
      "UNKNOWN_DIGEST_ITEM"
    );
  }

  return { logs };
}

function encodeDigest(
  digest: GrandpaDigest
): Uint8Array {
  if (
    digest.logs.length >
    MAX_DIGEST_ITEMS
  ) {
    throw new Error(
      "DIGEST_TOO_LARGE"
    );
  }

  const encoded = [
    encodeCompact(
      BigInt(digest.logs.length)
    )
  ];

  for (
    const item of digest.logs
  ) {
    if (
      item.kind === "Other"
    ) {
      encoded.push(
        Uint8Array.of(
          DIGEST_ITEM_TAGS.Other
        )
      );

      encoded.push(
        encodeBoundedBytes(
          item.data
        )
      );

      continue;
    }

    if (
      item.kind ===
      "RuntimeEnvironmentUpdated"
    ) {
      encoded.push(
        Uint8Array.of(
          DIGEST_ITEM_TAGS
            .RuntimeEnvironmentUpdated
        )
      );

      continue;
    }

    if (
      item.engineId.length !== 4
    ) {
      throw new Error(
        "INVALID_DIGEST_ENGINE_ID"
      );
    }

    encoded.push(
      Uint8Array.of(
        DIGEST_ITEM_TAGS[item.kind]
      ),
      item.engineId,
      encodeBoundedBytes(
        item.data
      )
    );
  }

  return concatBytes(
    ...encoded
  );
}

function readCompactBytes(
  reader: ScaleReader
): Uint8Array {
  const length =
    readCanonicalCompactU32(
      reader
    );

  if (
    length >
    BigInt(
      MAX_DIGEST_PAYLOAD_BYTES
    )
  ) {
    throw new ScaleDecodeError(
      "DIGEST_PAYLOAD_TOO_LARGE"
    );
  }

  if (
    length >
    BigInt(reader.remaining)
  ) {
    throw new ScaleDecodeError(
      "BYTE_LENGTH_EXCEEDS_INPUT"
    );
  }

  return reader.readBytes(
    Number(length)
  );
}

function encodeBoundedBytes(
  data: Uint8Array
): Uint8Array {
  if (
    data.length >
    MAX_DIGEST_PAYLOAD_BYTES
  ) {
    throw new Error(
      "DIGEST_PAYLOAD_TOO_LARGE"
    );
  }

  return concatBytes(
    encodeCompact(
      BigInt(data.length)
    ),
    data
  );
}

function readCanonicalCompactU32(
  reader: ScaleReader
): bigint {
  const before =
    reader.remaining;

  const value =
    reader.readCompact();

  if (
    value > U32_MAX
  ) {
    throw new ScaleDecodeError(
      "COMPACT_U32_OUT_OF_RANGE"
    );
  }

  const consumed =
    before -
    reader.remaining;

  const canonicalLength =
    encodeCompact(value).length;

  if (
    consumed !==
    canonicalLength
  ) {
    throw new ScaleDecodeError(
      "NON_CANONICAL_COMPACT"
    );
  }

  return value;
}

function toHex(
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