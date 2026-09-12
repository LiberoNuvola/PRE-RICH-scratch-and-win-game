import { blake2b } from "@noble/hashes/blake2.js";

import {
  bytesToHex,
  concatBytes,
  encodeCompact,
  encodeU32,
  encodeU64,
  equalBytes
} from "./scale.js";

import type {
  GrandpaAuthority
} from "./authority.js";

const HASH_LENGTH = 32;
const PUBLIC_KEY_LENGTH = 32;
const U32_MAX = 0xffffffffn;
const U64_MAX = 0xffffffffffffffffn;
const MAX_GENESIS_UTXO_BYTES = 256;
const MAX_SELECTION_INPUTS_BYTES = 4 * 1024 * 1024;
const MAX_PROOF_BYTES = 16 * 1024 * 1024;
const MAX_AUTHORITIES = 1024;

const TRANSITION_DOMAIN =
  "PRE-RICH/MATERIOS/AUTHORITY-TRANSITION/V1";

export interface AuthorityActivationBlock {
  readonly hash: Uint8Array;
  readonly number: bigint;
}

/**
 * Untrusted evidence supplied by the Materios adapter/proof boundary.
 *
 * The raw selection-input bytes are intentionally opaque here. PRE-RICH must
 * not reimplement Materios' authority-selection algorithm in TypeScript: the
 * proof system must establish that these inputs deterministically derive the
 * advertised `toAuthorities` committee.
 */
export interface AuthoritySetTransitionStatement {
  readonly kind: "materios-authority-set-transition";
  readonly protocolVersion: 1;
  readonly chainId: string;
  readonly genesisHash: Uint8Array;
  readonly genesisUtxo: Uint8Array;
  readonly fromSetId: bigint;
  readonly fromAuthorities: readonly GrandpaAuthority[];
  readonly sidechainEpoch: bigint;
  readonly selectionInputs: Uint8Array;
  readonly selectionInputsHash: Uint8Array;
  readonly toAuthorities: readonly GrandpaAuthority[];
  readonly activationBlock: AuthorityActivationBlock;
  readonly toSetId: bigint;
  readonly proofSystem: string;
  readonly proofBytes: Uint8Array;
}

/**
 * The exact public statement that a future proof verifier must authenticate.
 * Proof bytes are deliberately excluded: they are evidence for this
 * statement, not part of its semantic identity.
 */
export interface AuthoritySetTransitionPublicStatement {
  readonly protocolVersion: 1;
  readonly chainId: string;
  readonly genesisHash: Uint8Array;
  readonly genesisUtxo: Uint8Array;
  readonly fromSetId: bigint;
  readonly fromAuthorities: readonly GrandpaAuthority[];
  readonly sidechainEpoch: bigint;
  readonly selectionInputsHash: Uint8Array;
  readonly toAuthorities: readonly GrandpaAuthority[];
  readonly activationBlock: AuthorityActivationBlock;
  readonly toSetId: bigint;
}

export function authoritySetTransitionPublicStatement(
  statement: AuthoritySetTransitionStatement
): AuthoritySetTransitionPublicStatement {
  validateAuthoritySetTransitionStatement(statement);

  return {
    protocolVersion: statement.protocolVersion,
    chainId: statement.chainId,
    genesisHash: new Uint8Array(statement.genesisHash),
    genesisUtxo: new Uint8Array(statement.genesisUtxo),
    fromSetId: statement.fromSetId,
    fromAuthorities: statement.fromAuthorities,
    sidechainEpoch: statement.sidechainEpoch,
    selectionInputsHash: new Uint8Array(
      statement.selectionInputsHash
    ),
    toAuthorities: statement.toAuthorities,
    activationBlock: {
      hash: new Uint8Array(statement.activationBlock.hash),
      number: statement.activationBlock.number
    },
    toSetId: statement.toSetId
  };
}

/**
 * Canonical PRE-RICH encoding of the public transition statement.
 *
 * This is a PRE-RICH proof-boundary encoding. It is NOT claimed to be the
 * SCALE encoding of any Materios runtime structure.
 */
export function encodeAuthoritySetTransitionStatement(
  statement:
    | AuthoritySetTransitionStatement
    | AuthoritySetTransitionPublicStatement
): Uint8Array {
  const publicStatement =
    "proofBytes" in statement
      ? authoritySetTransitionPublicStatement(statement)
      : statement;

  validateAuthoritySetTransitionPublicStatement(
    publicStatement
  );

  return concatBytes(
    encodeString(TRANSITION_DOMAIN),
    Uint8Array.of(publicStatement.protocolVersion),
    encodeString(publicStatement.chainId),
    encodeBytes(publicStatement.genesisHash),
    encodeBytes(publicStatement.genesisUtxo),
    encodeU64(publicStatement.fromSetId),
    encodeAuthoritySet(publicStatement.fromAuthorities),
    encodeU64(publicStatement.sidechainEpoch),
    encodeBytes(publicStatement.selectionInputsHash),
    encodeAuthoritySet(publicStatement.toAuthorities),
    encodeBytes(publicStatement.activationBlock.hash),
    encodeU32(publicStatement.activationBlock.number),
    encodeU64(publicStatement.toSetId)
  );
}

export function hashAuthoritySetTransitionStatement(
  statement:
    | AuthoritySetTransitionStatement
    | AuthoritySetTransitionPublicStatement
): Uint8Array {
  return blake2b(
    encodeAuthoritySetTransitionStatement(statement),
    { dkLen: HASH_LENGTH }
  );
}

export function hashSelectionInputs(
  selectionInputs: Uint8Array
): Uint8Array {
  if (
    selectionInputs.length === 0 ||
    selectionInputs.length > MAX_SELECTION_INPUTS_BYTES
  ) {
    throw new Error("INVALID_SELECTION_INPUTS");
  }

  return blake2b(selectionInputs, {
    dkLen: HASH_LENGTH
  });
}

/**
 * Validates the transition evidence and all bindings that are locally
 * checkable without pretending to verify the Materios authority-selection
 * function or its finality proof.
 *
 * This function does NOT establish that `toAuthorities` is the canonical
 * Materios committee. That requires the future cryptographic proof verifier.
 */
export function validateAuthoritySetTransitionStatement(
  statement: AuthoritySetTransitionStatement
): void {
  if (
    statement.kind !==
    "materios-authority-set-transition"
  ) {
    throw new Error("INVALID_TRANSITION_KIND");
  }

  if (statement.protocolVersion !== 1) {
    throw new Error("UNSUPPORTED_TRANSITION_PROTOCOL");
  }

  validateChainId(statement.chainId);
  validateHash(
    statement.genesisHash,
    "INVALID_GENESIS_HASH"
  );
  validateBytes(
    statement.genesisUtxo,
    MAX_GENESIS_UTXO_BYTES,
    "INVALID_GENESIS_UTXO"
  );

  validateU64(
    statement.fromSetId,
    "INVALID_FROM_SET_ID"
  );
  validateU64(
    statement.toSetId,
    "INVALID_TO_SET_ID"
  );

  if (
    statement.toSetId !==
    statement.fromSetId + 1n
  ) {
    throw new Error(
      "INVALID_AUTHORITY_SET_ID_TRANSITION"
    );
  }

  validateAuthoritySet(
    statement.fromAuthorities,
    "INVALID_FROM_AUTHORITY_SET"
  );
  validateAuthoritySet(
    statement.toAuthorities,
    "INVALID_TO_AUTHORITY_SET"
  );

  validateU64(
    statement.sidechainEpoch,
    "INVALID_SIDECHAIN_EPOCH"
  );

  const expectedInputsHash =
    hashSelectionInputs(
      statement.selectionInputs
    );

  if (
    !equalBytes(
      expectedInputsHash,
      statement.selectionInputsHash
    )
  ) {
    throw new Error(
      "SELECTION_INPUTS_HASH_MISMATCH"
    );
  }

  validateActivationBlock(
    statement.activationBlock
  );

  if (statement.proofSystem.length === 0) {
    throw new Error("INVALID_PROOF_SYSTEM");
  }

  validateBytes(
    statement.proofBytes,
    MAX_PROOF_BYTES,
    "INVALID_PROOF_BYTES"
  );
}

export function validateAuthoritySetTransitionPublicStatement(
  statement: AuthoritySetTransitionPublicStatement
): void {
  if (statement.protocolVersion !== 1) {
    throw new Error("UNSUPPORTED_TRANSITION_PROTOCOL");
  }

  validateChainId(statement.chainId);
  validateHash(
    statement.genesisHash,
    "INVALID_GENESIS_HASH"
  );
  validateBytes(
    statement.genesisUtxo,
    MAX_GENESIS_UTXO_BYTES,
    "INVALID_GENESIS_UTXO"
  );
  validateU64(
    statement.fromSetId,
    "INVALID_FROM_SET_ID"
  );
  validateU64(
    statement.toSetId,
    "INVALID_TO_SET_ID"
  );

  if (
    statement.toSetId !==
    statement.fromSetId + 1n
  ) {
    throw new Error(
      "INVALID_AUTHORITY_SET_ID_TRANSITION"
    );
  }

  validateAuthoritySet(
    statement.fromAuthorities,
    "INVALID_FROM_AUTHORITY_SET"
  );
  validateAuthoritySet(
    statement.toAuthorities,
    "INVALID_TO_AUTHORITY_SET"
  );
  validateU64(
    statement.sidechainEpoch,
    "INVALID_SIDECHAIN_EPOCH"
  );
  validateHash(
    statement.selectionInputsHash,
    "INVALID_SELECTION_INPUTS_HASH"
  );
  validateActivationBlock(
    statement.activationBlock
  );
}

export function authoritySetIdentity(
  authorities: readonly GrandpaAuthority[]
): string {
  validateAuthoritySet(
    authorities,
    "INVALID_AUTHORITY_SET"
  );

  return bytesToHex(
    blake2b(
      encodeAuthoritySet(authorities),
      { dkLen: HASH_LENGTH }
    )
  );
}

function validateChainId(
  chainId: string
): void {
  if (chainId.length === 0) {
    throw new Error("INVALID_CHAIN_ID");
  }
}

function validateHash(
  value: Uint8Array,
  error: string
): void {
  if (value.length !== HASH_LENGTH) {
    throw new Error(error);
  }
}

function validateBytes(
  value: Uint8Array,
  maximum: number,
  error: string
): void {
  if (
    value.length === 0 ||
    value.length > maximum
  ) {
    throw new Error(error);
  }
}

function validateU64(
  value: bigint,
  error: string
): void {
  if (value < 0n || value > U64_MAX) {
    throw new Error(error);
  }
}

function validateAuthoritySet(
  authorities: readonly GrandpaAuthority[],
  prefix: string
): void {
  if (
    authorities.length === 0 ||
    authorities.length > MAX_AUTHORITIES
  ) {
    throw new Error(
      `${prefix}_SIZE`
    );
  }

  const seen = new Set<string>();

  for (const authority of authorities) {
    if (
      authority.publicKey.length !==
      PUBLIC_KEY_LENGTH
    ) {
      throw new Error(
        `${prefix}_KEY`
      );
    }

    if (
      authority.weight <= 0n ||
      authority.weight > U64_MAX
    ) {
      throw new Error(
        `${prefix}_WEIGHT`
      );
    }

    const identity =
      bytesToHex(authority.publicKey);

    if (seen.has(identity)) {
      throw new Error(
        `${prefix}_DUPLICATE`
      );
    }

    seen.add(identity);
  }
}

function validateActivationBlock(
  block: AuthorityActivationBlock
): void {
  validateHash(
    block.hash,
    "INVALID_ACTIVATION_BLOCK_HASH"
  );

  if (
    block.number < 0n ||
    block.number > U32_MAX
  ) {
    throw new Error(
      "INVALID_ACTIVATION_BLOCK_NUMBER"
    );
  }
}

function encodeString(
  value: string
): Uint8Array {
  return encodeBytes(
    new TextEncoder().encode(value)
  );
}

function encodeBytes(
  value: Uint8Array
): Uint8Array {
  return concatBytes(
    encodeCompact(BigInt(value.length)),
    value
  );
}

function encodeAuthoritySet(
  authorities: readonly GrandpaAuthority[]
): Uint8Array {
  return concatBytes(
    encodeCompact(BigInt(authorities.length)),
    ...authorities.map(authority =>
      concatBytes(
        encodeBytes(authority.publicKey),
        encodeU64(authority.weight)
      )
    )
  );
}
