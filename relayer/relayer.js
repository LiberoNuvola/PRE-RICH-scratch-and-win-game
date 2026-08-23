/*
  Minimal relayer reference using Lucid.
  - Watches treasury address
  - When balance >= threshold, builds distribution tx that pays prize/stake/reserve and relayer reward
  - Uses the preprod treasury policy: 25 ADA threshold, 50/30/19.5 split, relayer fee budget 0.5% with 0.2 ADA floor

  IMPORTANT: before running this, export the compiled Treasury validator:
    cd ../plutus && mkdir -p out && cabal run export-scripts -- <salePkhHex> <priceLovelace>
  (the export also produces the other scripts; this relayer only needs
  plutus/out/treasury.plutus.json)
*/

const { Lucid, Blockfrost, Data, Constr, walletFromPrivateKey } = require('lucid-cardano')
require('dotenv').config()
const { loadScript, TREASURY_SCRIPT_PATH } = require('./loadValidator')

const TOTAL_BASIS = 10_000n
const DISTRIBUTABLE_BASIS = 9_950n
const DEFAULT_THRESHOLD = 25_000_000n

function parseBigInt(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  return BigInt(value)
}

function calculateDistribution(totalLovelace) {
  const total = BigInt(totalLovelace || 0)
  const relayerRewardBase = (total * 50n) / TOTAL_BASIS
  const minReward = parseBigInt(process.env.RELAYER_REWARD_MIN_LOVELACE, 200_000n)
  const relayerReward = relayerRewardBase > minReward ? relayerRewardBase : minReward
  const distributable = total - relayerReward
  const prize = (distributable * 5_000n) / DISTRIBUTABLE_BASIS
  const stake = (distributable * 3_000n) / DISTRIBUTABLE_BASIS
  const reserve = distributable - prize - stake

  return {
    relayerReward,
    prize,
    stake,
    reserve,
    distributable,
  }
}

const BLOCKFROST = process.env.BLOCKFROST_PROJECT_ID
const NETWORK = process.env.NETWORK || 'Preprod'
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL || 15000)

if (!BLOCKFROST || !TREASURY_ADDRESS) {
  console.error('Set BLOCKFROST_PROJECT_ID and TREASURY_ADDRESS in .env')
  process.exit(1)
}

// Redeemer for TreasuryAction = Distribute (single nullary constructor at
// index 0). Built explicitly with Constr instead of relying on Data.void()
// happening to encode to the same bytes -- clearer and safer if the
// TreasuryAction type ever gains more constructors.
const DISTRIBUTE_REDEEMER = Data.to(new Constr(0, []))

async function main() {
  const provider = new Blockfrost('https://cardano-preprod.blockfrost.io', BLOCKFROST)
  const lucid = await Lucid.new(provider, NETWORK)
  const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY

  if (!relayerPrivateKey) {
    throw new Error('RELAYER_PRIVATE_KEY is required for the reference relayer.')
  }

  const wallet = await walletFromPrivateKey(relayerPrivateKey)
  lucid.selectWallet(wallet)

  const treasuryValidator = loadScript(TREASURY_SCRIPT_PATH)

  console.log('Relayer started, watching', TREASURY_ADDRESS)

  while (true) {
    try {
      const utxos = await lucid.utxosAt(TREASURY_ADDRESS)
      let total = 0n
      for (const u of utxos) {
        const lovelace = BigInt((u.assets && u.assets.lovelace) || (u.value && u.value.lovelace) || 0)
        total += lovelace
      }

      console.log('Treasury total lovelace:', total.toString())
      const threshold = parseBigInt(process.env.TREASURY_THRESHOLD, DEFAULT_THRESHOLD)

      if (total >= threshold && utxos.length > 0) {
        console.log('Threshold reached — preparing distribution tx')

        const distribution = calculateDistribution(total)
        const prizeAddr = process.env.PRIZE_ADDRESS
        const stakeAddr = process.env.STAKE_ADDRESS
        const reserveAddr = process.env.RESERVE_ADDRESS
        const relayerAddr = await lucid.wallet.address()

        // Refuse to build the tx if any destination address is missing,
        // instead of silently letting that share fall back to the relayer's
        // own change output. Previously an unset env var meant the relayer
        // could end up keeping the prize/stake/reserve share by accident.
        const missing = []
        if (!prizeAddr) missing.push('PRIZE_ADDRESS')
        if (!stakeAddr) missing.push('STAKE_ADDRESS')
        if (!reserveAddr) missing.push('RESERVE_ADDRESS')
        if (missing.length > 0) {
          console.error('Refusing to distribute: missing env vars:', missing.join(', '))
        } else {
          const tx = await lucid.newTx()

          for (const u of utxos) {
            tx.collectFrom([u], DISTRIBUTE_REDEEMER)
          }
          // attachSpendingValidator only needs to be called once per tx;
          // Lucid applies it to every script input collected above.
          tx.attachSpendingValidator(treasuryValidator)

          tx.payToAddress(prizeAddr, { lovelace: distribution.prize })
          tx.payToAddress(stakeAddr, { lovelace: distribution.stake })
          tx.payToAddress(reserveAddr, { lovelace: distribution.reserve })
          tx.payToAddress(relayerAddr, { lovelace: distribution.relayerReward })

          const built = await tx.complete()
          const signed = await lucid.signTx(built)
          const hash = await lucid.submitTx(signed)
          console.log('Distribution tx submitted:', hash)
        }
      }
    } catch (e) {
      console.error('Relayer error:', e)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
  }
}

main().catch((e) => console.error(e))
