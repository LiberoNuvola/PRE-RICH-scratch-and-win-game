import { describe, expect, it } from "vitest";

import {
  trustedAuthorityStateFromVerifiedTransition,
  validateAuthorityState
} from "../src/authority.js";

import {
  authoritySetIdentity,
  authoritySetTransitionPublicStatement,
  hashAuthoritySetTransitionStatement,
  hashSelectionInputs,
  validateAuthoritySetTransitionStatement,
  verifyAuthoritySetTransition
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


function currentTrustedState() {
  const statement = baseStatement();

  return {
    chainId: statement.chainId,
    genesisHash: new Uint8Array(
      statement.genesisHash
    ),
    setId: statement.fromSetId,
    authorities:
      statement.fromAuthorities.map(
        authority => ({
          publicKey: new Uint8Array(
            authority.publicKey
          ),
          weight: authority.weight
        })
      )
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


  it("rejects an invalid genesis hash", () => {
    const statement = {
      ...baseStatement(),
      genesisHash: Uint8Array.from({ length: 31 }, () => 0xaa)
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(statement)
    ).toThrow("INVALID_GENESIS_HASH");
  });

  it("rejects an empty chain id", () => {
    const statement = {
      ...baseStatement(),
      chainId: ""
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(statement)
    ).toThrow("INVALID_CHAIN_ID");
  });

  it("rejects an empty proof", () => {
    const statement = {
      ...baseStatement(),
      proofBytes: new Uint8Array()
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(statement)
    ).toThrow("INVALID_PROOF_BYTES");
  });

  it("rejects an empty proof system identifier", () => {
    const statement = {
      ...baseStatement(),
      proofSystem: ""
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(statement)
    ).toThrow("INVALID_PROOF_SYSTEM");
  });

  it("rejects a selection-input mutation even when the old hash is retained", () => {
    const statement = baseStatement();
    const mutated = {
      ...statement,
      selectionInputs: Uint8Array.from([
        0x10, 0x20, 0x30, 0x41
      ])
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(mutated)
    ).toThrow("SELECTION_INPUTS_HASH_MISMATCH");
  });

  it("binds the activation block hash into the public statement", () => {
    const statement = baseStatement();
    const changed = {
      ...statement,
      activationBlock: {
        ...statement.activationBlock,
        hash: Uint8Array.from({ length: 32 }, () => 0xcc)
      }
    };

    expect(
      Array.from(hashAuthoritySetTransitionStatement(statement))
    ).not.toEqual(
      Array.from(hashAuthoritySetTransitionStatement(changed))
    );
  });

  it("binds the genesis UTxO into the public statement", () => {
    const statement = baseStatement();
    const changed = {
      ...statement,
      genesisUtxo: Uint8Array.from([0x09, 0x08, 0x07])
    };

    expect(
      Array.from(hashAuthoritySetTransitionStatement(statement))
    ).not.toEqual(
      Array.from(hashAuthoritySetTransitionStatement(changed))
    );
  });

  it("binds the chain identity into the public statement", () => {
    const statement = baseStatement();
    const changed = {
      ...statement,
      chainId: "different-chain"
    };

    expect(
      Array.from(hashAuthoritySetTransitionStatement(statement))
    ).not.toEqual(
      Array.from(hashAuthoritySetTransitionStatement(changed))
    );
  });

  it("rejects a skipped set id at the uint64 boundary", () => {
    const statement = {
      ...baseStatement(),
      fromSetId: 0xffffffffffffffffn,
      toSetId: 0n
    };

    expect(() =>
      validateAuthoritySetTransitionStatement(statement)
    ).toThrow("INVALID_AUTHORITY_SET_ID_TRANSITION");
  });

  it("does not cross the proof boundary when verification fails", async () => {
    const statement = baseStatement();

    await expect(
      verifyAuthoritySetTransition(statement, {
        verify: () => false
      })
    ).rejects.toThrow(
      "AUTHORITY_TRANSITION_PROOF_NOT_VERIFIED"
    );
  });

  it("creates a verified transition only after the proof verifier accepts", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify: () => true
      }
    );

    expect(
      verified.kind
    ).toBe(
      "verified-materios-authority-set-transition"
    );

    expect(
      verified.__verifiedAuthoritySetTransition
    ).toBe("verified");

    expect(
      Array.from(verified.statementHash)
    ).toEqual(
      Array.from(
        hashAuthoritySetTransitionStatement(
          verified.publicStatement
        )
      )
    );
  });

  it("passes the canonical public statement to the proof verifier", async () => {
    const statement = baseStatement();
    let received: unknown;

    await verifyAuthoritySetTransition(
      statement,
      {
        verify: (_statement, publicStatement) => {
          received = publicStatement;
          return true;
        }
      }
    );

    expect(received).toEqual(
      authoritySetTransitionPublicStatement(statement)
    );
  });

  it("keeps proof bytes out of the semantic statement hash", async () => {
    const statement = baseStatement();
    const changedProof = {
      ...statement,
      proofBytes: Uint8Array.from([0xba, 0xad, 0xf0, 0x0d])
    };

    expect(
      Array.from(
        hashAuthoritySetTransitionStatement(statement)
      )
    ).toEqual(
      Array.from(
        hashAuthoritySetTransitionStatement(changedProof)
      )
    );
  });

  it("does not expose a conversion from an unverified statement to a trusted set", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify: () => true
      }
    );

    expect(
      verified.publicStatement.toAuthorities
    ).toEqual(statement.toAuthorities);

    expect(
      verified.publicStatement.fromAuthorities
    ).toEqual(statement.fromAuthorities);
  });


  it("constructs trusted authority state only from a verified transition", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify() {
          return true;
        }
      }
    );

    const trusted =
      trustedAuthorityStateFromVerifiedTransition(
        currentTrustedState(),
        verified
      );

    validateAuthorityState(trusted);

    expect(trusted.chainId).toBe(
      statement.chainId
    );
    expect(trusted.setId).toBe(
      statement.toSetId
    );
    expect(
      Array.from(trusted.genesisHash)
    ).toEqual(
      Array.from(statement.genesisHash)
    );
    expect(
      trusted.authorities.map(authority => ({
        publicKey: Array.from(
          authority.publicKey
        ),
        weight: authority.weight
      }))
    ).toEqual(
      statement.toAuthorities.map(authority => ({
        publicKey: Array.from(
          authority.publicKey
        ),
        weight: authority.weight
      }))
    );
  });

  it("copies trusted authority state bytes so source mutation cannot alter it", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify() {
          return true;
        }
      }
    );

    const trusted =
      trustedAuthorityStateFromVerifiedTransition(
        currentTrustedState(),
        verified
      );

    statement.genesisHash[0] = 0x11;
    statement.toAuthorities[0].publicKey[0] = 0x22;

    expect(
      trusted.genesisHash[0]
    ).toBe(0xaa);
    expect(
      trusted.authorities[0].publicKey[0]
    ).toBe(0x03);
  });

  it("rejects a forged verified-transition marker", () => {
    const forged = {
      kind:
        "verified-materios-authority-set-transition",
      __verifiedAuthoritySetTransition:
        "forged",
      publicStatement: {
        ...authoritySetTransitionPublicStatement(
          baseStatement()
        )
      }
    } as never;

    expect(() =>
      trustedAuthorityStateFromVerifiedTransition(
        currentTrustedState(),
        forged
      )
    ).toThrow(
      "INVALID_VERIFIED_AUTHORITY_SET_TRANSITION"
    );
  });

  it("does not accept unverified transition evidence as trusted state", () => {
    const evidence = {
      kind:
        "authority-set-transition-evidence",
      from: {
        trust: "untrusted-evidence",
        chainId: "materios",
        genesisHash: Uint8Array.from(
          { length: 32 },
          () => 0xaa
        ),
        setId: 7n,
        authorities: [
          authority(1),
          authority(2)
        ],
        provenance: {
          status: "unverified",
          source: "transition"
        }
      },
      to: {
        trust: "untrusted-evidence",
        chainId: "materios",
        genesisHash: Uint8Array.from(
          { length: 32 },
          () => 0xaa
        ),
        setId: 8n,
        authorities: [
          authority(3),
          authority(4)
        ],
        provenance: {
          status: "unverified",
          source: "transition"
        }
      },
      transition: {
        status: "unverified",
        setId: 7n,
        nextSetId: 8n,
        format: "unresolved"
      }
    };

    expect(() =>
      trustedAuthorityStateFromVerifiedTransition(
        currentTrustedState(),
        evidence as never
      )
    ).toThrow(
      "INVALID_VERIFIED_AUTHORITY_SET_TRANSITION"
    );
  });


  it("rejects a verified transition whose from-set is not the current trusted set", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify() {
          return true;
        }
      }
    );

    const current = currentTrustedState();
    current.setId = 6n;

    expect(() =>
      trustedAuthorityStateFromVerifiedTransition(
        current,
        verified
      )
    ).toThrow(
      "AUTHORITY_TRANSITION_FROM_SET_ID_MISMATCH"
    );
  });

  it("rejects a verified transition with a different current genesis", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify() {
          return true;
        }
      }
    );

    const current = currentTrustedState();
    current.genesisHash[0] = 0xbb;

    expect(() =>
      trustedAuthorityStateFromVerifiedTransition(
        current,
        verified
      )
    ).toThrow(
      "AUTHORITY_TRANSITION_GENESIS_HASH_MISMATCH"
    );
  });

  it("rejects a verified transition whose from authority set differs from the current trusted set", async () => {
    const statement = baseStatement();

    const verified = await verifyAuthoritySetTransition(
      statement,
      {
        verify() {
          return true;
        }
      }
    );

    const current = currentTrustedState();
    current.authorities[0].publicKey[0] ^= 0xff;

    expect(() =>
      trustedAuthorityStateFromVerifiedTransition(
        current,
        verified
      )
    ).toThrow(
      "AUTHORITY_TRANSITION_FROM_AUTHORITY_SET_MISMATCH"
    );
  });

});
