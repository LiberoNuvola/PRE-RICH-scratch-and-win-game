// src/mint.ts
import wallet from './wallet'
import { counterValidator, mintPolicyScript } from './loadValidator'

function strToHex(s: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(s)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Mint di un NFT seriale basato sul counter on-chain.
 *
 * IMPORTANTE:
 * - policyId deve corrispondere alla MintPolicy esportata con gli STESSI
 *   parametri (salePkh / priceLovelace) usati in `cabal run export-scripts`
 * - TokenName = rappresentazione ASCII del contatore (es. "42")
 *   e deve coincidere con tokenNameFromInteger in MintPolicy.hs
 */
export async function mintSerialNFT(
  counterScriptAddress: string,
  policyId: string,
  saleAddress: string,
  priceLovelace = 2_000_000
) {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  // 1) Counter UTxO
  const utxos = await lucid.utxosAt(counterScriptAddress)
  if (!utxos || utxos.length === 0) {
    throw new Error('No counter UTxO found at script address')
  }
  const counterUtxo = utxos[0]

  // 2) Parse datum (supporta inline datum / hash datum)
  let n: number | null = null
  try {
    const datum = counterUtxo.datum ?? (await lucid.datumOf(counterUtxo))

    if (typeof datum === 'number') {
      n = datum
    } else if (typeof datum === 'bigint') {
      n = Number(datum)
    } else if (datum && typeof datum === 'object') {
      // possibili forme Lucid / Constr
      if ('int' in datum) n = Number((datum as any).int)
      else if ('fields' in datum && Array.isArray((datum as any).fields)) {
        // CounterDatum = newtype Integer → spesso Constr(0, [Integer])
        const fields = (datum as any).fields
        if (fields.length > 0) {
          const first = fields[0]
          if (typeof first === 'number' || typeof first === 'bigint') {
            n = Number(first)
          } else if (first && typeof first === 'object' && 'int' in first) {
            n = Number(first.int)
          }
        }
      }
    } else if (typeof datum === 'string') {
      n = parseInt(datum, 10)
    }
  } catch (e) {
    console.error('Failed to parse counter datum', e)
  }

  if (n === null || Number.isNaN(n)) {
    throw new Error('Unable to parse counter datum (expected integer)')
  }

  // 3) Token name = ASCII del numero
  const tokenNameAscii = String(n)
  const tokenNameHex = strToHex(tokenNameAscii)

  // Lucid mint value: { policyId: { assetNameHex: amount } }
  const mintValue: Record<string, Record<string, bigint>> = {
    [policyId]: {
      [tokenNameHex]: 1n,
    },
  }

  const minAdaForCounter = 2_000_000n
  const newCounterDatum = n + 1

  // 4) Build tx
  const tx = await lucid
    .newTx()
    .collectFrom([counterUtxo], lucid.Data.void())
    .attachSpendingValidator(counterValidator)
    .mintAssets(mintValue, lucid.Data.void())
    .attachMintingPolicy(mintPolicyScript)
    .payToAddress(saleAddress, { lovelace: BigInt(priceLovelace) })
    .payToContract(
      counterScriptAddress,
      { inline: lucid.Data.to(newCounterDatum) },
      { lovelace: minAdaForCounter }
    )
    .addSigner(await lucid.wallet.address())
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)

  return {
    txHash,
    tokenName: tokenNameAscii,
    assetId: policyId + tokenNameHex,
  }
}

export default { mintSerialNFT }
