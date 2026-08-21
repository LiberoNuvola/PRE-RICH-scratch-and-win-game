const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(__dirname, '../relayer/.env') })

const POLICY = Object.freeze({
  thresholdLovelace: 25_000_000n,
  prizePct: 5_000n,
  stakePct: 3_000n,
  reservePct: 1_950n,
  relayerPct: 50n,
  relayerMinLovelace: 200_000n,
  basis: 10_000n,
  splitBasis: 9_950n,
})

function calculateDistribution(totalLovelace) {
  const total = BigInt(totalLovelace)
  const relayerRaw = (total * POLICY.relayerPct) / POLICY.basis
  const relayer = relayerRaw > POLICY.relayerMinLovelace ? relayerRaw : POLICY.relayerMinLovelace
  const distributable = total - relayer
  const prize = (distributable * POLICY.prizePct) / POLICY.splitBasis
  const stake = (distributable * POLICY.stakePct) / POLICY.splitBasis
  const reserve = distributable - prize - stake

  return {
    thresholdLovelace: POLICY.thresholdLovelace.toString(),
    totalLovelace: total.toString(),
    relayerReward: relayer.toString(),
    prize: prize.toString(),
    stake: stake.toString(),
    reserve: reserve.toString(),
    distributable: distributable.toString(),
  }
}

function readGovernanceConfig() {
  const configPath = path.resolve(__dirname, 'governance-preprod.json')
  if (!fs.existsSync(configPath)) {
    return null
  }

  const raw = fs.readFileSync(configPath, 'utf8')
  return JSON.parse(raw)
}

function printSummary() {
  const policy = readGovernanceConfig()
  const total = process.env.ADMIN_SAMPLE_TREASURY || '25000000'
  const distribution = calculateDistribution(total)

  console.log('Preprod treasury policy summary')
  console.log(JSON.stringify({
    policy,
    distribution,
    checks: {
      thresholdMet: BigInt(total) >= POLICY.thresholdLovelace,
      splitTotal: (POLICY.prizePct + POLICY.stakePct + POLICY.reservePct + POLICY.relayerPct).toString(),
      relayerGuard: BigInt(distribution.relayerReward) >= POLICY.relayerMinLovelace,
    },
  }, null, 2))
}

if (require.main === module) {
  printSummary()
}

module.exports = {
  POLICY,
  calculateDistribution,
  readGovernanceConfig,
}
