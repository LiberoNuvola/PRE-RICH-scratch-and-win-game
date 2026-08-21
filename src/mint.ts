import wallet from './wallet'
import { signAndSubmitTx } from './txHelpers'

function strToHex(s: string) {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(s)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Build and submit a mint tx that consumes a counter UTxO at `counterScriptAddress`.
// Parameters:
// - counterScriptAddress: script address where the counter UTxO lives
// - policyId: hex currency symbol of the minting policy (published on-chain)
// - saleAddress: address that should receive the price for the mint
// - priceLovelace: price to pay (in lovelace)
export async function mintSerialNFT(counterScriptAddress: string, policyId: string, saleAddress: string, priceLovelace = 2000000) {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  // find counter UTxO
  const utxos = await lucid.utxosAt(counterScriptAddress)
  if (!utxos || utxos.length === 0) throw new Error('No counter UTxO found at script address')
  const counterUtxo = utxos[0]

  // Extract datum integer (best-effort: adjust to your Datum shape)
  let n: number | null = null
  try {
    const datum = counterUtxo.datum || (await lucid.datumOf(counterUtxo))
    // If datum is a plain integer represented as number or BigInt
    if (typeof datum === 'number') n = datum
    else if (typeof datum === 'bigint') n = Number(datum)
    else if (datum && typeof datum === 'object' && ('int' in datum)) n = Number((datum as any).int)
    else if (typeof datum === 'string') n = parseInt(datum)
  } catch (e) {
    // ignore
  }
  if (n === null || Number.isNaN(n)) throw new Error('Unable to parse counter datum (expected integer)')

  const tokenNameAscii = String(n)
  const tokenNameHex = strToHex(tokenNameAscii)

  // Construct mint value
  const mintValue: any = {}
  mintValue[policyId] = {}
  mintValue[policyId][tokenNameHex] = 1

  // Build the tx:
  // - consume counter UTxO
  // - mint the single NFT named by the counter
  // - pay price to saleAddress
  // - create new counter UTxO at same script with datum n+1 (we place minimal ADA)

  const minAdaForCounter = 2000000n
  const newCounterDatum = n + 1

  const tx = await lucid.newTx()
    .collectFrom([counterUtxo], lucid.Data.void())
    .mintAssets(mintValue)
    .payToAddress(saleAddress, { lovelace: BigInt(priceLovelace) })
    // Recreate counter UTxO: pay to script address with inline datum
    .payToContract(counterScriptAddress, { inline: lucid.Data.to(newCounterDatum) }, { lovelace: minAdaForCounter })
    .addSigner(await lucid.wallet.address())
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)
  return { txHash, tokenName: tokenNameAscii, assetId: policyId + tokenNameHex }
}

export default { mintSerialNFT }
