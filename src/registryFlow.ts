/**
 * Light bridge off-chain: publish round beacon once to BeaconRegistry.
 */

import {
  deriveBeacon,
  type BeaconTarget,
  toHex,
} from './beacon'

export type RegistryPublishParams = {
  lucid: any
  registryAddress: string
  registryValidator: { type: 'PlutusV2'; script: string }
  /** Current registry UTxO (Pending). */
  registryUtxo: any
  target: BeaconTarget
  roundId: number
  mcHash: Uint8Array
  materiosContext: Uint8Array
  /** Inline datum builder — must match Plutus Data of BeaconRegistryDatum. */
  buildPendingDatum: (d: Record<string, unknown>) => any
  buildReadyDatum: (d: Record<string, unknown>) => any
  /** Redeemer Constr for RegistryPublish mcHash materiosContext */
  buildPublishRedeemer: (mcHash: Uint8Array, ctx: Uint8Array) => any
}

/**
 * Anyone can submit; on-chain forces R = deriveBeacon(...).
 * Operational process should only publish after Materios finality for target.
 */
export async function publishRoundBeacon(p: RegistryPublishParams): Promise<string> {
  const R = await deriveBeacon(
    p.target.networkId,
    p.target.round,
    p.target.mainchainRef,
    p.mcHash,
    p.materiosContext,
    p.target.version
  )

  if (p.roundId !== p.target.round) {
    throw new Error('roundId !== target.round')
  }

  const readyDatum = p.buildReadyDatum({
    brRound: p.roundId,
    brTarget: p.target,
    brStatus: 'BeaconReady',
    brBeaconValue: R,
    brMcHash: p.mcHash,
    brMateriosContext: p.materiosContext,
  })

  const redeemer = p.buildPublishRedeemer(p.mcHash, p.materiosContext)

  const tx = await p.lucid
    .newTx()
    .collectFrom([p.registryUtxo], redeemer)
    .attachSpendingValidator(p.registryValidator)
    .payToContract(p.registryAddress, { inline: readyDatum }, p.registryUtxo.assets)
    .complete()

  const signed = await p.lucid.signTx(tx)
  const hash = await p.lucid.submitTx(signed)
  return hash
}

export async function previewBeacon(
  target: BeaconTarget,
  mcHash: Uint8Array,
  materiosContext: Uint8Array
): Promise<{ rHex: string; r: Uint8Array }> {
  const r = await deriveBeacon(
    target.networkId,
    target.round,
    target.mainchainRef,
    mcHash,
    materiosContext,
    target.version
  )
  return { r, rHex: toHex(r) }
}