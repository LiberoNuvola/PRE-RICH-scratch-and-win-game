/*
  txHelpers.ts
  - Extracted helper functions to build/submit claim transactions using Lucid.
  - This is a lightweight TypeScript module to be used in the Vite+TS refactor.
  - It mirrors logic from index_restore_tmp.html's claimPrize() but keeps the on-chain validation responsibility to the Plutus validator.
*/

// Note: keep `any` for Lucid types to avoid strict coupling in this initial refactor.
export async function buildClaimTx(lucid: any, ticketPolicyId: string, ticketAssetName: string, prizeUtxo: any, recipientAddr: string) {
  // Construct assetId used by Lucid: policyId + assetName (hex or ascii depending on encoding used)
  const assetId = ticketPolicyId + ticketAssetName;

  // Create a tx that consumes the prize UTxO and consumes the ticket token from claimant
  // The actual validation (that ticket matches prize) is performed by the on-chain validator.
  const tx = await lucid.newTx()
    .collectFrom([prizeUtxo], lucid.Data.void())
    .attachMetadata(721, { note: 'claim' })
    .addSigner(await lucid.wallet.address())
    .payToAddress(recipientAddr, { lovelace: prizeUtxo.value.lovelace || 0 })
    .complete();

  return tx;
}

export async function signAndSubmitTx(lucid: any, tx: any) {
  const signed = await lucid.signTx(tx);
  const txHash = await lucid.submitTx(signed);
  return txHash;
}

export function basicAddressValidate(addr: string) {
  // Very basic check: Cardano addresses start with "addr_" or "Ae2"/"Ddz" etc. This is only a lightweight guard.
  return typeof addr === 'string' && (addr.startsWith('addr') || addr.startsWith('Ae2') || addr.startsWith('Ddz'));
}
