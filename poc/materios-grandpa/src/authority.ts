import {
  bytesToHex,
  equalBytes
} from "./scale.js";

import {
  authoritySetIdentity,
  type VerifiedAuthoritySetTransition
} from "./authority-transition.js";

export interface GrandpaAuthority {
  readonly publicKey: Uint8Array;
  readonly weight: bigint;
}

export interface TrustedAuthorityState {
  readonly trust?: never;
  readonly chainId: string;
  readonly genesisHash: Uint8Array;
  readonly setId: bigint;
  readonly authorities: readonly GrandpaAuthority[];
}

export interface AuthoritySetEvidence {
  readonly trust: "untrusted-evidence";
  readonly chainId: string;
  readonly genesisHash: Uint8Array;
  readonly setId: bigint;
  readonly authorities: readonly GrandpaAuthority[];
  readonly provenance: AuthoritySetEvidenceProvenance;
}

export interface AuthoritySetEvidenceProvenance {
  readonly status: "unverified";
  readonly source:
    | "runtime-api"
    | "adapter"
    | "transition";
  readonly detail?: string;
}

export interface AuthoritySetTransitionEvidence {
  readonly kind: "authority-set-transition-evidence";
  readonly from: AuthoritySetEvidence;
  readonly to: AuthoritySetEvidence;
  readonly transition: UnverifiedAuthoritySetTransition;
}

export interface UnverifiedAuthoritySetTransition {
  readonly status: "unverified";
  readonly setId: bigint;
  readonly nextSetId: bigint;
  readonly proofBytes?: Uint8Array;
  readonly format: "unresolved";
}

export function validateAuthoritySetEvidence(
  evidence: AuthoritySetEvidence
): void {
  validateAuthorityStateShape(evidence);

  if (evidence.trust !== "untrusted-evidence") {
    throw new Error("INVALID_AUTHORITY_EVIDENCE_TRUST");
  }

  if (evidence.provenance.status !== "unverified") {
    throw new Error("INVALID_AUTHORITY_EVIDENCE_PROVENANCE");
  }
}

export function validateAuthoritySetTransitionEvidence(
  transition: AuthoritySetTransitionEvidence
): void {
  validateAuthoritySetEvidence(transition.from);
  validateAuthoritySetEvidence(transition.to);

  if (
    transition.transition.status !== "unverified" ||
    transition.transition.format !== "unresolved" ||
    transition.transition.setId !== transition.from.setId ||
    transition.transition.nextSetId !== transition.to.setId ||
    transition.to.setId !== transition.from.setId + 1n
  ) {
    throw new Error("INVALID_AUTHORITY_SET_TRANSITION");
  }
}

export function validateAuthorityState(
  state: TrustedAuthorityState
): void {
  validateAuthorityStateShape(state);
}

/**
 * Creates trusted authority state only from the branded result of the
 * authority-transition proof boundary.
 *
 * An AuthoritySetTransitionStatement or AuthoritySetTransitionEvidence is
 * intentionally not accepted here. Both are untrusted inputs and must first
 * pass through verifyAuthoritySetTransition().
 */
export function trustedAuthorityStateFromVerifiedTransition(
  current: TrustedAuthorityState,
  transition: VerifiedAuthoritySetTransition
): TrustedAuthorityState {
  if (
    transition.kind !==
      "verified-materios-authority-set-transition" ||
    transition.__verifiedAuthoritySetTransition !==
      "verified"
  ) {
    throw new Error(
      "INVALID_VERIFIED_AUTHORITY_SET_TRANSITION"
    );
  }

  validateAuthorityState(current);

  const statement = transition.publicStatement;

  if (
    statement.chainId !== current.chainId
  ) {
    throw new Error(
      "AUTHORITY_TRANSITION_CHAIN_ID_MISMATCH"
    );
  }

  if (
    !equalBytes(
      statement.genesisHash,
      current.genesisHash
    )
  ) {
    throw new Error(
      "AUTHORITY_TRANSITION_GENESIS_HASH_MISMATCH"
    );
  }

  if (
    statement.fromSetId !== current.setId
  ) {
    throw new Error(
      "AUTHORITY_TRANSITION_FROM_SET_ID_MISMATCH"
    );
  }

  if (
    authoritySetIdentity(
      statement.fromAuthorities
    ) !==
    authoritySetIdentity(
      current.authorities
    )
  ) {
    throw new Error(
      "AUTHORITY_TRANSITION_FROM_AUTHORITY_SET_MISMATCH"
    );
  }

  validateAuthorityStateShape({
    chainId: statement.chainId,
    genesisHash: statement.genesisHash,
    setId: statement.toSetId,
    authorities: statement.toAuthorities
  });

  return {
    chainId: statement.chainId,
    genesisHash: new Uint8Array(
      statement.genesisHash
    ),
    setId: statement.toSetId,
    authorities: statement.toAuthorities.map(
      authority => ({
        publicKey: new Uint8Array(
          authority.publicKey
        ),
        weight: authority.weight
      })
    )
  };
}

interface AuthorityStateShape {
  readonly chainId: string;
  readonly genesisHash: Uint8Array;
  readonly setId: bigint;
  readonly authorities: readonly GrandpaAuthority[];
}

function validateAuthorityStateShape(
  state: AuthorityStateShape
): void {
  if (state.chainId.length === 0) {
    throw new Error("INVALID_CHAIN_ID");
  }

  if (state.genesisHash.length !== 32) {
    throw new Error("INVALID_GENESIS_HASH");
  }

  if (
    state.setId < 0n ||
    state.setId > 0xffffffffffffffffn
  ) {
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

    const id =
      bytesToHex(authority.publicKey);

    if (seen.has(id)) {
      throw new Error(
        "DUPLICATE_AUTHORITY"
      );
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
): ReadonlyMap<
  string,
  GrandpaAuthority
> {
  const map =
    new Map<string, GrandpaAuthority>();

  for (const authority of state.authorities) {
    map.set(
      bytesToHex(authority.publicKey),
      authority
    );
  }

  return map;
}
