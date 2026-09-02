import {
  describe,
  expect,
  it
} from "vitest";

import {
  validateAuthorityState,
  findAuthority,
  totalAuthorityWeight,
  authorityMap
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
});
