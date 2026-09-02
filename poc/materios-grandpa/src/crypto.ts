import * as ed25519 from "@noble/ed25519";

export const ED25519_PUBLIC_KEY_LENGTH = 32;
export const ED25519_SIGNATURE_LENGTH = 64;

export interface Ed25519Verifier {
  verify(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array
  ): boolean | Promise<boolean>;
}

export const nobleEd25519: Ed25519Verifier = {
  verify(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: Uint8Array
  ): boolean {
    return ed25519.verify(
      signature,
      message,
      publicKey
    );
  }
};

export async function verifyEd25519(
  verifier: Ed25519Verifier,
  publicKey: Uint8Array,
  signature: Uint8Array,
  message: Uint8Array
): Promise<boolean> {
  if (
    publicKey.length !==
    ED25519_PUBLIC_KEY_LENGTH
  ) {
    return false;
  }

  if (
    signature.length !==
    ED25519_SIGNATURE_LENGTH
  ) {
    return false;
  }

  return await verifier.verify(
    signature,
    message,
    publicKey
  );
}
