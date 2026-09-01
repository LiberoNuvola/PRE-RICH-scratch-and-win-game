import {
  equalBytes
} from "./scale.js";

export interface HeaderLike {
  hash: Uint8Array;
  parentHash: Uint8Array;
  number: bigint;
}

/**
 * Returns true if candidateAncestor is the same block
 * as descendant or lies on its direct parent chain.
 *
 * The caller must provide the headers necessary to walk
 * the chain. We intentionally do not fetch anything here.
 */
export function isAncestor(
  descendant: HeaderLike,
  candidateAncestor: HeaderLike,
  knownHeaders: readonly HeaderLike[]
): boolean {
  if (
    candidateAncestor.number >
    descendant.number
  ) {
    return false;
  }

  const headers = new Map<string, HeaderLike>();

  for (const header of knownHeaders) {
    headers.set(
      toHex(header.hash),
      header
    );
  }

  headers.set(
    toHex(descendant.hash),
    descendant
  );

  let current = descendant;

  while (
    current.number >
    candidateAncestor.number
  ) {
    const parent =
      headers.get(
        toHex(current.parentHash)
      );

    if (!parent) {
      return false;
    }

    if (
      parent.number !==
      current.number - 1n
    ) {
      return false;
    }

    current = parent;
  }

  return equalBytes(
    current.hash,
    candidateAncestor.hash
  );
}

function toHex(
  bytes: Uint8Array
): string {
  return Array.from(bytes)
    .map(
      b => b.toString(16).padStart(2, "0")
    )
    .join("");
}
