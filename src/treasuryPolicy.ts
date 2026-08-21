export const TREASURY_POLICY = Object.freeze({
  thresholdLovelace: 25_000_000n,
  prizePct: 5_000n,
  stakePct: 3_000n,
  reservePct: 1_950n,
  relayerPct: 50n,
  relayerMinLovelace: 200_000n,
  distributionBasis: 10_000n,
  distributableBasis: 9_950n,
  rewardAddress: '',
})

export type TreasuryDistribution = {
  relayer: bigint
  prize: bigint
  stake: bigint
  reserve: bigint
  distributable: bigint
}

export function calculateTreasuryDistribution(totalLovelace: bigint): TreasuryDistribution {
  const rawRelayer = (totalLovelace * TREASURY_POLICY.relayerPct) / TREASURY_POLICY.distributionBasis
  const relayer = rawRelayer > TREASURY_POLICY.relayerMinLovelace ? rawRelayer : TREASURY_POLICY.relayerMinLovelace
  const distributable = totalLovelace - relayer

  const prize = (distributable * TREASURY_POLICY.prizePct) / TREASURY_POLICY.distributableBasis
  const stake = (distributable * TREASURY_POLICY.stakePct) / TREASURY_POLICY.distributableBasis
  const reserve = distributable - prize - stake

  return {
    relayer,
    prize,
    stake,
    reserve,
    distributable,
  }
}
