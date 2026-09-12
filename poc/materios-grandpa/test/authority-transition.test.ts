import { describe, expect, it } from "vitest";

import {
  authoritySetIdentity,
  hashAuthoritySetTransitionStatement,
  hashSelectionInputs,
  validateAuthoritySetTransitionStatement
} from "../src/authority-transition.js";

function authority(seed: number, weight = 1n) {
  return {
    publicKey: Uint8Array.from(
      { length: 32 },
      (_, index) => (seed + index) & 0xff
    ),
    weight
  };
}

function baseStatement() {
  const selectionInputs = Uint8Array.from([
    0x10, 0x20, 0x30, 0x40
  ]);

  return {
    kind:
      "materios-authority-set-transition" as const,
    protocolVersion: 1 as const,
    chainId: "materios",
    genesisHash: Uint8Array.from(
      { length: 32 },
      () => 0xaa
    ),
    genesisUtxo: Uint8Array.from([
      0x01, 0x02, 0x03
    ]),
    fromSetId: 7n,
    fromAuthorities: [
      authority(1),
      authority(2)
    ],
    sidechainEpoch: 42n,
    selectionInputs,
    selectionInputsHash:
      hashSelectionInputs(selectionInputs),
    toAuthorities: [
      authority(3),
      authority(4)
    ],
    activationBlock: {
      hash: Uint8Array.from(
        { length: 32 },
        () => 0xbb
      ),
      number: 123n
    },
    toSetId: 8n,
    proofSystem: "unresolved",
    proofBytes: Uint8Array.from([
      0xde, 0xad
    ])
  };
}

describe("authority transition boundary", () => {
  it("accepts a structurally valid transition", () => {
    expect(() =>
      validateAuthoritySetTransitionStatement(
        baseStatement()
      )
    ).not.toThrow();
  });

  it("requires a monotonic one-step set-id transition", () => {
    const statement = {
      ...baseStatement(),
      toSetId: 9n
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(
        statement
      )
    ).toThrow(
      "INVALID_AUTHORITY_SET_ID_TRANSITION"
    );
  });

  it("binds the raw selection inputs to their hash", () => {
    const statement = {
      ...baseStatement(),
      selectionInputsHash:
        Uint8Array.from(
          { length: 32 },
          () => 0xff
        )
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(
        statement
      )
    ).toThrow(
      "SELECTION_INPUTS_HASH_MISMATCH"
    );
  });

  it("rejects duplicate authorities", () => {
    const duplicate = authority(1);
    const statement = {
      ...baseStatement(),
      toAuthorities: [
        duplicate,
        duplicate
      ]
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(
        statement
      )
    ).toThrow(
      "INVALID_TO_AUTHORITY_SET_DUPLICATE"
    );
  });

  it("rejects an invalid activation block number", () => {
    const statement = {
      ...baseStatement(),
      activationBlock: {
        ...baseStatement().activationBlock,
        number: 0x100000000n
      }
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(
        statement
      )
    ).toThrow(
      "INVALID_ACTIVATION_BLOCK_NUMBER"
    );
  });

  it("produces a stable identity for the same authority set", () => {
    const authorities = [
      authority(1, 3n),
      authority(2, 5n)
    ];

    expect(
      authoritySetIdentity(authorities)
    ).toBe(
      authoritySetIdentity([
        authority(1, 3n),
        authority(2, 5n)
      ])
    );
  });

  it("binds the complete public transition statement", () => {
    const statement = baseStatement();
    const changed = {
      ...statement,
      sidechainEpoch:
        statement.sidechainEpoch + 1n
    };

    expect(
      Array.from(
        hashAuthoritySetTransitionStatement(
          statement
        )
      )
    ).not.toEqual(
      Array.from(
        hashAuthoritySetTransitionStatement(
          changed
        )
      )
    );
  });

  it("does not claim to verify Materios committee derivation", () => {
    const statement = baseStatement();

    expect(
      statement.proofSystem
    ).toBe("unresolved");

    expect(() =>
      validateAuthoritySetTransitionStatement(
        statement
      )
    ).not.toThrow();
  });
});
