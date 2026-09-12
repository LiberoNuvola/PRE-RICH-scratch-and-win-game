import {
  describe,
  expect,
  it
} from "vitest";

import {
  validateAuthorityState,
  findAuthority,
  totalAuthorityWeight,
  authorityMap,
  validateAuthoritySetEvidence,
  validateAuthoritySetTransitionEvidence
} from "../src/authority.js";

describe("authority", () => {
  it("validates a trusted authority set", () => {
    const state = {
      chainId: "materios",
      genesisHash:
        new Uint8Array(32).fill(1),
      setId: 0n,
      authorities: [
        {
          publicKey:
            new Uint8Array(32).fill(1),
          weight: 2n
        },
        {
          publicKey:
            new Uint8Array(32).fill(2),
          weight: 3n
        }
      ]
    };

    expect(() =>
      validateAuthorityState(state)
    ).not.toThrow();

    expect(
      totalAuthorityWeight(state)
    ).toBe(5n);

    expect(
      findAuthority(
        state,
        new Uint8Array(32).fill(1)
      )
    ).toEqual(
      state.authorities[0]
    );

    expect(
      authorityMap(state).size
    ).toBe(2);
  });

  it("rejects duplicate authorities", () => {
    const state = {
      chainId: "materios",
      genesisHash:
        new Uint8Array(32).fill(1),
      setId: 0n,
      authorities: [
        {
          publicKey:
            new Uint8Array(32).fill(1),
          weight: 1n
        },
        {
          publicKey:
            new Uint8Array(32).fill(1),
          weight: 1n
        }
      ]
    };

    expect(() =>
      validateAuthorityState(state)
    ).toThrow(
      "DUPLICATE_AUTHORITY"
    );
  });

  it("rejects invalid authority weight", () => {
    const state = {
      chainId: "materios",
      genesisHash:
        new Uint8Array(32).fill(1),
      setId: 0n,
      authorities: [
        {
          publicKey:
            new Uint8Array(32).fill(1),
          weight: 0n
        }
      ]
    };

    expect(() =>
      validateAuthorityState(state)
    ).toThrow(
      "INVALID_AUTHORITY_WEIGHT"
    );
  });

  it("rejects an invalid authority key", () => {
    const state = {
      chainId: "materios",
      genesisHash: new Uint8Array(32).fill(1),
      setId: 0n,
      authorities: [
        {
          publicKey: new Uint8Array(31),
          weight: 1n
        }
      ]
    };

    expect(() => validateAuthorityState(state)).toThrow(
      "INVALID_AUTHORITY_KEY"
    );
  });

  it("keeps authority evidence explicitly untrusted", () => {
    const evidence = {
      trust: "untrusted-evidence" as const,
      chainId: "materios",
      genesisHash: new Uint8Array(32).fill(1),
      setId: 4n,
      authorities: [
        {
          publicKey: new Uint8Array(32).fill(1),
          weight: 1n
        }
      ],
      provenance: {
        status: "unverified" as const,
        source: "runtime-api" as const
      }
    };

    expect(() => validateAuthoritySetEvidence(evidence)).not.toThrow();
    expect(evidence.trust).toBe("untrusted-evidence");
  });

  it("represents a verified-boundary transition without verifying it", () => {
    const makeEvidence = (setId: bigint) => ({
      trust: "untrusted-evidence" as const,
      chainId: "materios",
      genesisHash: new Uint8Array(32).fill(1),
      setId,
      authorities: [
        {
          publicKey: new Uint8Array(32).fill(Number(setId + 1n)),
          weight: 1n
        }
      ],
      provenance: {
        status: "unverified" as const,
        source: "transition" as const
      }
    });

    const transition = {
      kind: "authority-set-transition-evidence" as const,
      from: makeEvidence(7n),
      to: makeEvidence(8n),
      transition: {
        status: "unverified" as const,
        setId: 7n,
        nextSetId: 8n,
        format: "unresolved" as const
      }
    };

    expect(() => validateAuthoritySetTransitionEvidence(transition)).not.toThrow();

    const mismatched = {
      ...transition,
      transition: {
        ...transition.transition,
        nextSetId: 9n
      }
    };

    expect(() => validateAuthoritySetTransitionEvidence(mismatched)).toThrow(
      "INVALID_AUTHORITY_SET_TRANSITION"
    );
  });
});
