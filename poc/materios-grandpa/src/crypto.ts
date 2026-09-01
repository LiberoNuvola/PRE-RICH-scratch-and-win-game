import * as ed25519 from "@noble/ed25519";

export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const ED25519_SIGNATURE_LENGTH = 64;

export function verifyEd25519(
  publicKey: Uint8Array,
  signature: Uint8Array,
  message: Uint8Array
): boolean {
  if (
    publicKey.length !== ED25519_PUBLIC_KEY_LENGTH
  ) {
    throw new Error(
      `invalid Ed25519 public key length: ${publicKey.length}`
    );
  }

  if (
    signature.length !== ED25519_SIGNATURE_LENGTH
  ) {
    throw new Error(
      `invalid Ed25519 signature length: ${signature.length}`
    );
  }

  return ed25519.verify(
    signature,
    message,
    publicKey
  );
}
