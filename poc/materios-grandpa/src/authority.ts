import {
  bytesToHex,
  equalBytes
} from "./scale.js";

export interface GrandpaAuthority {
  publicKey: Uint8Array;
  weight: bigint;
}

export interface TrustedAuthorityState {
  chainId: string;
  genesisHash: Uint8Array;
  setId: bigint;
  authorities: GrandpaAuthority[];
}

export function validateAuthorityState(
  state: TrustedAuthorityState
): void {
  if (state.chainId.length === 0) {
    throw new Error("INVALID_CHAIN_ID");
  }

  if (state.genesisHash.length !== 32) {
    throw new Error("INVALID_GENESIS_HASH");
  }

  if (state.setId < 0n || state.setId > 0xffffffffffffffffn) {
    throw new Error("INVALID_SET_ID");
  }

  if (state.authorities.length === 0) {
    throw new Error("EMPTY_AUTHORITY_SET");
  }

  const seen = new Set<string>();

  for (const authority of state.authorities) {
    if (authority.publicKey.length !== 32) {
      throw new Error("INVALID_AUTHORITY_KEY");
    }

    if (authority.weight <= 0n) {
      throw new Error("INVALID_AUTHORITY_WEIGHT");
    }

    if (authority.weight > 0xffffffffffffffffn) {
      throw new Error("AUTHORITY_WEIGHT_OVERFLOW");
    }

    const id = bytesToHex(authority.publicKey);

    if (seen.has(id)) {
      throw new Error("DUPLICATE_AUTHORITY");
    }

    seen.add(id);
  }
}

export function findAuthority(
  state: TrustedAuthorityState,
  publicKey: Uint8Array
): GrandpaAuthority | undefined {
  return state.authorities.find(
    authority =>
      equalBytes(
        authority.publicKey,
        publicKey
      )
  );
}

export function totalAuthorityWeight(
  state: TrustedAuthorityState
): bigint {
  return state.authorities.reduce(
    (sum, authority) =>
      sum + authority.weight,
    0n
  );
}

export function authorityMap(
  state: TrustedAuthorityState
): ReadonlyMap<string, GrandpaAuthority> {
  const map = new Map<string, GrandpaAuthority>();

  for (const authority of state.authorities) {
    map.set(
      bytesToHex(authority.publicKey),
      authority
    );
  }

  return map;
}
