import {
  describe,
  expect,
  it
} from "vitest";

import {
  hasGrandpaQuorum
} from "../src/grandpa.js";

describe("GRANDPA quorum", () => {
  it("accepts > 2/3", () => {
    expect(
      hasGrandpaQuorum(3n, 4n)
    ).toBe(true);
  });

  it("rejects exactly 2/3", () => {
    expect(
      hasGrandpaQuorum(2n, 3n)
    ).toBe(false);
  });

  it("rejects below 2/3", () => {
    expect(
      hasGrandpaQuorum(2n, 4n)
    ).toBe(false);
  });

  it("works with u64 max", () => {
    const max =
      0xffffffffffffffffn;

    expect(
      hasGrandpaQuorum(max, max)
    ).toBe(true);
  });

  it("never converts to Number", () => {
    const total =
      0xffffffffffffffffn;

    const signed =
      0xaaaaaaaaaaaaaaaaan;

    expect(
      hasGrandpaQuorum(
        signed,
        total
      )
    ).toBe(false);
  });
});
