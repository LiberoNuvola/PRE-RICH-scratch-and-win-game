// src/claimFlow.ts
import { prizeValidator, mintPolicyScript } from './loadValidator'

/**
 * Trova il prize UTxO il cui datum referenzia esattamente questo ticket.
 * PrizeDatum (ordine campi da PrizeValidator.hs):
 *   pdAssetId, pdPrizeAmount, pdTicketPolicy, pdTicketName,
 *   pdPaymentPolicy, pdPaymentName, pdClaimantPkh
 *
 * Nota: l'ordine reale può variare leggermente a seconda di come
 * Plutus serializza. Qui cerchiamo policy + name del ticket.
 */
export async function findPrizeUtxo(
  lucid: any,
  scriptAddress: string,
  ticketPolicyId: string,
  ticketAssetName: string
) {
  const utxos = await lucid.utxosAt(scriptAddress)
  if (!utxos || utxos.length === 0) return null

  for (const u of utxos) {
    try {
      const datumCbor =
        u.datum ?? (u.datumHash ? await lucid.datumOf(u) : null)
      if (!datumCbor) continue

      const parsed = lucid.Data.from(
        typeof datumCbor === 'string' ? datumCbor : lucid.Data.to(datumCbor)
      )

      const fields = parsed?.fields
      if (!fields || fields.length < 3) continue

      // Tentativo robusto: cerca due campi consecutivi che matchano policy + name
      for (let i = 0; i < fields.length - 1; i++) {
        const a = fields[i]
        const b = fields[i + 1]
        const policyHex = typeof a === 'string' ? a : a?.bytes ?? a
        const nameHex = typeof b === 'string' ? b : b?.bytes ?? b

        if (
          policyHex === ticketPolicyId &&
          nameHex === ticketAssetName
        ) {
          return u
        }
      }
    } catch {
      continue
    }
  }

  return null
}

export async function findTicketUtxoInWallet(
  lucid: any,
  ticketPolicyId: string,
  ticketAssetName: string
) {
  const myUtxos = await lucid.wallet.getUtxos()
  const assetIdHex = ticketPolicyId + ticketAssetName

  for (const u of myUtxos) {
    try {
      const value = u.assets || u.value || {}
      if (typeof value === 'object' && Object.keys(value).includes(assetIdHex)) {
        return u
      }
    } catch {
      continue
    }
  }
  return null
}

export async function claimPrizeAuto(
  lucid: any,
  scriptAddress: string,
  ticketPolicyId: string,
  ticketAssetName: string
) {
  const claimantAddr = await lucid.wallet.address()

  const prizeUtxo = await findPrizeUtxo(
    lucid,
    scriptAddress,
    ticketPolicyId,
    ticketAssetName
  )
  if (!prizeUtxo) {
    throw new Error('No prize UTxO found matching this ticket')
  }

  const ticketUtxo = await findTicketUtxoInWallet(
    lucid,
    ticketPolicyId,
    ticketAssetName
  )
  if (!ticketUtxo) {
    throw new Error('No ticket UTxO found in connected wallet')
  }

  // Valore da pagare al claimant
  let payValue: any = {}
  if (prizeUtxo.assets && Object.keys(prizeUtxo.assets).length > 0) {
    payValue = prizeUtxo.assets
  } else if (prizeUtxo.value?.lovelace) {
    payValue = { lovelace: prizeUtxo.value.lovelace }
  } else if (prizeUtxo.value) {
    payValue = prizeUtxo.value
  } else {
    payValue = { lovelace: 1_000_000n }
  }

  const burnAssetId = ticketPolicyId + ticketAssetName

  const tx = await lucid
    .newTx()
    .collectFrom([prizeUtxo], lucid.Data.void())
    .attachSpendingValidator(prizeValidator)
    .collectFrom([ticketUtxo])
    .mintAssets({ [burnAssetId]: -1n }, lucid.Data.void())
    .attachMintingPolicy(mintPolicyScript)
    .payToAddress(claimantAddr, payValue)
    .addSigner(claimantAddr)
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)
  return txHash
}

export async function tryClaimAndNotify(
  lucid: any,
  scriptAddress: string,
  ticketPolicyId: string,
  ticketAssetName: string,
  onProgress?: (msg: string) => void
) {
  try {
    onProgress?.('Searching prize UTxO...')
    const prizeUtxo = await findPrizeUtxo(
      lucid,
      scriptAddress,
      ticketPolicyId,
      ticketAssetName
    )
    if (!prizeUtxo) throw new Error('No prize available for this ticket')

    onProgress?.('Found prize, locating ticket in wallet...')
    const ticketUtxo = await findTicketUtxoInWallet(
      lucid,
      ticketPolicyId,
      ticketAssetName
    )
    if (!ticketUtxo) throw new Error('Ticket not found in wallet')

    onProgress?.('Building transaction...')
    const txHash = await claimPrizeAuto(
      lucid,
      scriptAddress,
      ticketPolicyId,
      ticketAssetName
    )
    onProgress?.(`Submitted tx: ${txHash}`)
    return txHash
  } catch (err: any) {
    onProgress?.(`Error: ${err.message || err}`)
    throw err
  }
}
