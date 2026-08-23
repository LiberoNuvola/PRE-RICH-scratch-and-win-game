// src/txHelpers.ts
import { prizeValidator } from './loadValidator'

/**
 * Helper leggero per costruire una claim tx.
 * La validazione on-chain resta responsabilità di PrizeValidator.
 */
export async function buildClaimTx(
  lucid: any,
  ticketPolicyId: string,
  ticketAssetName: string,
  prizeUtxo: any,
  recipientAddr: string
) {
  const assetId = ticketPolicyId + ticketAssetName

  // Nota: per un claim completo (con burn del ticket) usa claimFlow.ts.
  // Questa funzione è un helper minimo e deve comunque attaccare il validator.
  const tx = await lucid
    .newTx()
    .collectFrom([prizeUtxo], lucid.Data.void())
    .attachSpendingValidator(prizeValidator)
    .attachMetadata(721, {
      note: 'claim',
      ticket: assetId,
    })
    .addSigner(await lucid.wallet.address())
    .payToAddress(recipientAddr, {
      lovelace: prizeUtxo?.value?.lovelace ?? prizeUtxo?.assets?.lovelace ?? 0n,
    })
    .complete()

  return tx
}

export async function signAndSubmitTx(lucid: any, tx: any) {
  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)
  return txHash
}

export function basicAddressValidate(addr: string): boolean {
  return (
    typeof addr === 'string' &&
    (addr.startsWith('addr') ||
      addr.startsWith('Ae2') ||
      addr.startsWith('Ddz'))
  )
}
