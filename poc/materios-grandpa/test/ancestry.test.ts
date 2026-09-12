import {
  blake2b
} from "@noble/hashes/blake2.js";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  encodeMateriosHeader,
  isAncestor,
  MATERIOS_HEADER_ENCODING,
  verifyAncestryEvidence,
  verifyHeaderEvidence,
  type GrandpaAncestryHeader,
  type GrandpaDigest
} from "../src/ancestry.js";

const emptyDigest: GrandpaDigest = {
  logs: []
};

function syntheticHeader(
  number: bigint,
  parentHash: Uint8Array,
  digest = emptyDigest
): GrandpaAncestryHeader {
  const decoded = {
    parentHash,
    number,
    stateRoot:
      new Uint8Array(32).fill(0x22),
    extrinsicsRoot:
      new Uint8Array(32).fill(0x33),
    digest
  };

  const rawHeader =
    encodeMateriosHeader(decoded);

  return {
    ...decoded,
    rawHeader,
    hash:
      blake2b(
        rawHeader,
        { dkLen: 32 }
      ),
    encoding:
      MATERIOS_HEADER_ENCODING
  };
}

describe(
  "synthetic Materios header evidence",
  () => {
    it(
      "decodes and verifies a valid Compact<u32> header",
      () => {
        const header =
          syntheticHeader(
            63n,
            new Uint8Array(32)
          );

        const verified =
          verifyHeaderEvidence(
            header
          );

        expect(
          verified.verified
        ).toBe(true);

        expect(
          verified.number
        ).toBe(63n);

        expect(
          verified.rawHeader
        ).toEqual(
          header.rawHeader
        );
      }
    );

    it(
      "supports the exact DigestItem variants",
      () => {
        const header =
          syntheticHeader(
            64n,
            new Uint8Array(32),
            {
              logs: [
                {
                  kind: "Other",
                  data:
                    Uint8Array.of(
                      1,
                      2
                    )
                },
                {
                  kind: "Consensus",
                  engineId:
                    Uint8Array.of(
                      1,
                      2,
                      3,
                      4
                    ),
                  data:
                    Uint8Array.of(5)
                },
                {
                  kind: "Seal",
                  engineId:
                    Uint8Array.of(
                      5,
                      6,
                      7,
                      8
                    ),
                  data:
                    Uint8Array.of(9)
                },
                {
                  kind: "PreRuntime",
                  engineId:
                    Uint8Array.of(
                      9,
                      10,
                      11,
                      12
                    ),
                  data:
                    Uint8Array.of(13)
                },
                {
                  kind:
                    "RuntimeEnvironmentUpdated"
                }
              ]
            }
          );

        expect(
          verifyHeaderEvidence(
            header
          ).digest
        ).toEqual(
          header.digest
        );
      }
    );

    it(
      "uses the canonical Substrate DigestItem discriminants",
      () => {
        const header =
          syntheticHeader(
            64n,
            new Uint8Array(32),
            {
              logs: [
                {
                  kind: "Other",
                  data:
                    Uint8Array.of(1)
                },
                {
                  kind: "Consensus",
                  engineId:
                    Uint8Array.of(
                      1,
                      2,
                      3,
                      4
                    ),
                  data:
                    Uint8Array.of(5)
                },
                {
                  kind: "Seal",
                  engineId:
                    Uint8Array.of(
                      5,
                      6,
                      7,
                      8
                    ),
                  data:
                    Uint8Array.of(9)
                },
                {
                  kind: "PreRuntime",
                  engineId:
                    Uint8Array.of(
                      9,
                      10,
                      11,
                      12
                    ),
                  data:
                    Uint8Array.of(13)
                },
                {
                  kind:
                    "RuntimeEnvironmentUpdated"
                }
              ]
            }
          );

        const raw =
          header.rawHeader;

        /*
         * Header layout:
         *
         * parent_hash       32 bytes
         * block_number      2 bytes for Compact<u32>(64)
         * state_root        32 bytes
         * extrinsics_root   32 bytes
         * digest length     1 byte
         *
         * Therefore the first DigestItem
         * discriminant starts at byte 99.
         */
        const digestStart =
          32 + 2 + 32 + 32 + 1;

        expect(
          raw[digestStart]
        ).toBe(0);

        /*
         * Other:
         *
         * tag       1 byte
         * data len  1 byte
         * data      1 byte
         */
        const consensusTagOffset =
          digestStart +
          1 +
          1 +
          1;

        expect(
          raw[consensusTagOffset]
        ).toBe(4);

        /*
         * Consensus:
         *
         * tag        1 byte
         * engine_id  4 bytes
         * data len   1 byte
         * data       1 byte
         */
        const sealTagOffset =
          consensusTagOffset +
          1 +
          4 +
          1 +
          1;

        expect(
          raw[sealTagOffset]
        ).toBe(5);

        /*
         * Seal:
         *
         * tag        1 byte
         * engine_id  4 bytes
         * data len   1 byte
         * data       1 byte
         */
        const preRuntimeTagOffset =
          sealTagOffset +
          1 +
          4 +
          1 +
          1;

        expect(
          raw[preRuntimeTagOffset]
        ).toBe(6);

        /*
         * PreRuntime:
         *
         * tag        1 byte
         * engine_id  4 bytes
         * data len   1 byte
         * data       1 byte
         */
        const runtimeEnvironmentUpdatedTagOffset =
          preRuntimeTagOffset +
          1 +
          4 +
          1 +
          1;

        expect(
          raw[
            runtimeEnvironmentUpdatedTagOffset
          ]
        ).toBe(8);

        expect(
          verifyHeaderEvidence(
            header
          ).verified
        ).toBe(true);
      }
    );

    it(
      "rejects trailing bytes and malformed digest",
      () => {
        const header =
          syntheticHeader(
            1n,
            new Uint8Array(32)
          );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              rawHeader:
                new Uint8Array([
                  ...header.rawHeader,
                  0xff
                ])
            })
        ).toThrow(
          "TRAILING_BYTES"
        );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              rawHeader:
                new Uint8Array([
                  ...header.rawHeader.slice(
                    0,
                    -1
                  ),
                  0xff
                ])
            })
        ).toThrow();
      }
    );

    it(
      "rejects wrong hash and modified raw header",
      () => {
        const header =
          syntheticHeader(
            1n,
            new Uint8Array(32)
          );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              hash:
                new Uint8Array(
                  32
                ).fill(0xaa)
            })
        ).toThrow(
          "HEADER_HASH_MISMATCH"
        );

        const modified =
          header.rawHeader.slice();

        modified[0] = 0xff;

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              rawHeader: modified
            })
        ).toThrow(
          "HEADER_HASH_MISMATCH"
        );
      }
    );

    it(
      "rejects forged parent, number, state root, extrinsics root and encoding",
      () => {
        const header =
          syntheticHeader(
            1n,
            new Uint8Array(32)
          );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              parentHash:
                new Uint8Array(
                  32
                ).fill(1)
            })
        ).toThrow(
          "PARENT_HASH_MISMATCH"
        );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              number: 2n
            })
        ).toThrow(
          "BLOCK_NUMBER_MISMATCH"
        );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              stateRoot:
                new Uint8Array(
                  32
                ).fill(1)
            })
        ).toThrow(
          "STATE_ROOT_MISMATCH"
        );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              extrinsicsRoot:
                new Uint8Array(
                  32
                ).fill(1)
            })
        ).toThrow(
          "EXTRINSICS_ROOT_MISMATCH"
        );

        expect(
          () =>
            verifyHeaderEvidence({
              ...header,
              encoding:
                "unsupported" as
                  typeof MATERIOS_HEADER_ENCODING
            })
        ).toThrow(
          "UNSUPPORTED_HEADER_ENCODING"
        );
      }
    );
  }
);

describe(
  "verified ancestry",
  () => {
    it(
      "accepts a complete synthetic parent chain",
      () => {
        const ancestor =
          syntheticHeader(
            10n,
            new Uint8Array(32)
          );

        const descendant =
          syntheticHeader(
            11n,
            ancestor.hash
          );

        expect(
          verifyAncestryEvidence(
            [
              ancestor,
              descendant
            ],
            descendant.hash,
            11n
          )
        ).toHaveLength(2);

        expect(
          isAncestor(
            descendant,
            ancestor,
            [ancestor]
          )
        ).toBe(true);
      }
    );

    it(
      "rejects broken, missing and forged ancestry",
      () => {
        const ancestor =
          syntheticHeader(
            10n,
            new Uint8Array(32)
          );

        const descendant =
          syntheticHeader(
            11n,
            ancestor.hash
          );

        const broken =
          syntheticHeader(
            12n,
            new Uint8Array(
              32
            ).fill(9)
          );

        const grandchild =
          syntheticHeader(
            12n,
            descendant.hash
          );

        expect(
          isAncestor(
            broken,
            ancestor,
            [ancestor]
          )
        ).toBe(false);

        expect(
          isAncestor(
            grandchild,
            ancestor,
            []
          )
        ).toBe(false);

        expect(
          () =>
            verifyAncestryEvidence(
              [
                ancestor,
                descendant
              ],
              new Uint8Array(
                32
              ).fill(8),
              11n
            )
        ).toThrow(
          "ANCESTRY_TARGET_MISSING"
        );
      }
    );
  }
);