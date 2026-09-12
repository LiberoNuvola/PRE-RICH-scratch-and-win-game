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

export type DigestItem =
  | {
      kind: "Other";
      data: Uint8Array;
    }
  | {
      kind: "Consensus";
      engineId: Uint8Array;
      data: Uint8Array;
    }
  | {
      kind: "Seal";
      engineId: Uint8Array;
      data: Uint8Array;
    }
  | {
      kind: "PreRuntime";
      engineId: Uint8Array;
      data: Uint8Array;
    }
  | {
      kind: "RuntimeEnvironmentUpdated";
    };

export interface SubstrateHeader {
  parentHash: Uint8Array;
  number: bigint;
  stateRoot: Uint8Array;
  extrinsicsRoot: Uint8Array;
  digest: DigestItem[];
}

export interface VerifiedHeaderEvidence
  extends SubstrateHeader {
  rawHeader: Uint8Array;
  hash: Uint8Array;
}

const HASH_LENGTH = 32;
const ENGINE_ID_LENGTH = 4;
const U32_MAX = 0xffffffffn;

const MAX_DIGEST_ITEMS = 1024;
const MAX_DIGEST_PAYLOAD_BYTES =
  1024 * 1024;

/**
 * Decode a Materios/Substrate
 * generic::Header<u32, BlakeTwo256>.
 *
 * SCALE field order:
 *
 *   parent_hash
 *   Compact<u32> number
 *   state_root
 *   extrinsics_root
 *   Digest
 */
export function decodeSubstrateHeader(
  rawHeader: Uint8Array
): SubstrateHeader {
  try {
    const reader =
      new ScaleReader(rawHeader);

    const parentHash =
      reader.readBytes(HASH_LENGTH);

    const number =
      readCanonicalCompactU32(reader);

    const stateRoot =
      reader.readBytes(HASH_LENGTH);

    const extrinsicsRoot =
      reader.readBytes(HASH_LENGTH);

    const digestCount =
      readCanonicalCompactU32(reader);

    if (
      digestCount >
      BigInt(MAX_DIGEST_ITEMS)
    ) {
      throw new ScaleDecodeError(
        "DIGEST_TOO_LARGE"
      );
    }

    const digest: DigestItem[] = [];

    for (
      let i = 0;
      i < Number(digestCount);
      i++
    ) {
      digest.push(
        readDigestItem(reader)
      );
    }

    reader.assertEof();

    return {
      parentHash,
      number,
      stateRoot,
      extrinsicsRoot,
      digest
    };
  } catch (error) {
    if (
      error instanceof
      ScaleDecodeError
    ) {
      throw error;
    }

    throw new ScaleDecodeError(
      "MALFORMED_HEADER"
    );
  }
}

/**
 * Canonically encode a Substrate header.
 */
export function encodeSubstrateHeader(
  header: SubstrateHeader
): Uint8Array {
  if (
    header.parentHash.length !==
    HASH_LENGTH
  ) {
    throw new Error(
      "INVALID_PARENT_HASH_LENGTH"
    );
  }

  if (
    header.stateRoot.length !==
    HASH_LENGTH
  ) {
    throw new Error(
      "INVALID_STATE_ROOT_LENGTH"
    );
  }

  if (
    header.extrinsicsRoot.length !==
    HASH_LENGTH
  ) {
    throw new Error(
      "INVALID_EXTRINSICS_ROOT_LENGTH"
    );
  }

  if (
    header.number < 0n ||
    header.number > U32_MAX
  ) {
    throw new Error(
      "HEADER_NUMBER_OUT_OF_RANGE"
    );
  }

  if (
    header.digest.length >
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
    encodeCompact(
      BigInt(header.digest.length)
    ),
    ...header.digest.map(
      encodeDigestItem
    )
  );
}

/**
 * Materios uses BlakeTwo256.
 *
 * This is Blake2 with a 32-byte digest.
 *
 * We use Noble's native BLAKE2b implementation
 * with the requested 32-byte output length.
 */
export function hashSubstrateHeader(
  rawHeader: Uint8Array
): Uint8Array {
  return blake2b(
    rawHeader,
    {
      dkLen: HASH_LENGTH
    }
  );
}

/**
 * Decode, canonicalize, hash and optionally
 * compare against an externally supplied hash.
 */
export function verifyHeaderEvidence(
  rawHeader: Uint8Array,
  expectedHash?: Uint8Array
): VerifiedHeaderEvidence {
  const header =
    decodeSubstrateHeader(
      rawHeader
    );

  const canonical =
    encodeSubstrateHeader(
      header
    );

  if (
    !equalBytes(
      canonical,
      rawHeader
    )
  ) {
    throw new ScaleDecodeError(
      "NON_CANONICAL_HEADER"
    );
  }

  const hash =
    hashSubstrateHeader(
      rawHeader
    );

  if (
    expectedHash !== undefined &&
    !equalBytes(
      hash,
      expectedHash
    )
  ) {
    throw new ScaleDecodeError(
      "HEADER_HASH_MISMATCH"
    );
  }

  return {
    ...header,
    rawHeader:
      rawHeader.slice(),
    hash
  };
}

/**
 * Decode Compact<u32>.
 *
 * The generic SCALE reader can represent u64,
 * therefore the u32 range is enforced explicitly.
 *
 * Canonical re-encoding also rejects non-canonical
 * compact representations.
 */
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

/**
 * Decode the exact SCALE DigestItem
 * discriminants used by sp_runtime::generic.
 *
 *   Other                     = 0
 *   Consensus                 = 4
 *   Seal                      = 5
 *   PreRuntime                = 6
 *   RuntimeEnvironmentUpdated = 8
 */
function readDigestItem(
  reader: ScaleReader
): DigestItem {
  const index =
    reader.readByte();

  switch (index) {
    case 0:
      return {
        kind: "Other",
        data:
          readBoundedBytes(reader)
      };

    case 4:
      return {
        kind: "Consensus",
        engineId:
          reader.readBytes(
            ENGINE_ID_LENGTH
          ),
        data:
          readBoundedBytes(reader)
      };

    case 5:
      return {
        kind: "Seal",
        engineId:
          reader.readBytes(
            ENGINE_ID_LENGTH
          ),
        data:
          readBoundedBytes(reader)
      };

    case 6:
      return {
        kind: "PreRuntime",
        engineId:
          reader.readBytes(
            ENGINE_ID_LENGTH
          ),
        data:
          readBoundedBytes(reader)
      };

    case 8:
      return {
        kind:
          "RuntimeEnvironmentUpdated"
      };

    default:
      throw new ScaleDecodeError(
        "INVALID_DIGEST_ITEM_INDEX"
      );
  }
}

function readBoundedBytes(
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
      "DIGEST_PAYLOAD_TOO_LARGE"
    );
  }

  return reader.readBytes(
    Number(length)
  );
}

function encodeDigestItem(
  item: DigestItem
): Uint8Array {
  switch (item.kind) {
    case "Other":
      return concatBytes(
        Uint8Array.of(0),
        encodeBoundedBytes(
          item.data
        )
      );

    case "Consensus":
      return concatBytes(
        Uint8Array.of(4),
        fixedEngineId(
          item.engineId
        ),
        encodeBoundedBytes(
          item.data
        )
      );

    case "Seal":
      return concatBytes(
        Uint8Array.of(5),
        fixedEngineId(
          item.engineId
        ),
        encodeBoundedBytes(
          item.data
        )
      );

    case "PreRuntime":
      return concatBytes(
        Uint8Array.of(6),
        fixedEngineId(
          item.engineId
        ),
        encodeBoundedBytes(
          item.data
        )
      );

    case "RuntimeEnvironmentUpdated":
      return Uint8Array.of(8);
  }
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

function fixedEngineId(
  data: Uint8Array
): Uint8Array {
  if (
    data.length !==
    ENGINE_ID_LENGTH
  ) {
    throw new Error(
      "INVALID_ENGINE_ID_LENGTH"
    );
  }

  return data;
}