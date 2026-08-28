/**
 * Deploy del CounterValidator su Preprod.
 *
 * Crea un UTxO allo script address con datum Integer = 0
 * (compatibile con CounterValidator / MintPolicy).
 *
 * Uso (dalla root del repo, sull'altro PC):
 *   1) cp .env.example .env   e compila BLOCKFROST + seed se serve
 *   2) npm install
 *   3) npx tsx scripts/deployCounter.ts
 *
 * Richiede: wallet Preprod con tADA, Blockfrost project id preprod.
 */

import { Lucid, Blockfrost, Data } from 'lucid-cardano'
import { counterValidator } from '../src/loadValidator'

const BLOCKFROST_URL =
  process.env.BLOCKFROST_URL ?? 'https://cardano-preprod.blockfrost.io/api/v0'
const BLOCKFROST_KEY = process.env.BLOCKFROST_PROJECT_ID ?? ''
/** Seed phrase SOLO per script CLI — non committare. Oppure usa wallet browser. */
const SEED = process.env.WALLET_SEED ?? ''

const MIN_ADA = 2_000_000n

async function main() {
  if (!BLOCKFROST_KEY) {
    throw new Error('Imposta BLOCKFROST_PROJECT_ID nel .env')
  }
  if (!SEED) {
    throw new Error(
      'Imposta WALLET_SEED nel .env (solo locale, mai in git) oppure adatta lo script al tuo wallet'
    )
  }

  const lucid = await Lucid.new(
    new Blockfrost(BLOCKFROST_URL, BLOCKFROST_KEY),
    'Preprod'
  )

  lucid.selectWalletFromSeed(SEED)

  const scriptAddress = lucid.utils.validatorToAddress(counterValidator)
  console.log('Counter script address:', scriptAddress)

  // Datum = Integer 0 (come da CounterValidator)
  const datum = Data.to(0n)

  const tx = await lucid
    .newTx()
    .payToContract(
      scriptAddress,
      { inline: datum },
      { lovelace: MIN_ADA }
    )
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)

  console.log('Deploy tx:', txHash)
  console.log('')
  console.log('Metti in src/config.ts (o .env):')
  console.log(`  COUNTER_SCRIPT_ADDRESS = '${scriptAddress}'`)
  console.log('')
  console.log('Poi attendi conferma su preprod e verifica l\'UTxO su explorer.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})