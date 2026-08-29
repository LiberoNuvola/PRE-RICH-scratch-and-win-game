/**
 * Light bridge off-chain:
 *
 *   Materios receipt
 *        ↓
 *   authorized relayer
 *        ↓
 *   BeaconRegistry
 *
 * The receipt itself remains an external artifact.
 * The registry stores the receipt-derived mcHash/context together with
 * the authorized relayer identity and the deterministic beacon R.
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

  /**
   * Materios-derived receipt commitment/hash.
   *
   * This is not independently authenticated by Plutus; authenticity is
   * anchored by the authorized relayer signature enforced by the Registry.
   */
  mcHash: Uint8Array

  /**
   * Canonical Materios context/receipt commitment bytes.
   */
  materiosContext: Uint8Array

  /**
   * Authorized relayer public-key hash.
   *
   * Must match the PubKeyHash embedded in the Pending registry datum.
   */
  relayerPkh: string

  /** Inline datum builder — must match BeaconRegistryDatum. */
  buildPendingDatum: (d: Record<string, unknown>) => any

  /** Inline datum builder — must match BeaconRegistryDatum. */
  buildReadyDatum: (d: Record<string, unknown>) => any

  /**
   * Redeemer:
   * RegistryPublish mcHash materiosContext
   */
  buildPublishRedeemer: (
    mcHash: Uint8Array,
    ctx: Uint8Array,
  ) => any
}

/**
 * Publish the beacon for a round.
 *
 * The transaction must be signed by the relayer identified by
 * brRelayerPkh in the Pending registry datum.
 */
export async function publishRoundBeacon(
  p: RegistryPublishParams,
): Promise<string> {
  if (p.roundId !== p.target.round) {
    throw new Error('roundId !== target.round')
  }

  if (p.mcHash.length === 0) {
    throw new Error('mcHash is empty')
  }

  if (p.materiosContext.length === 0) {
    throw new Error('materiosContext is empty')
  }

  const R = await deriveBeacon(
    p.target.networkId,
    p.target.round,
    p.target.mainchainRef,
    p.mcHash,
    p.materiosContext,
    p.target.version,
  )

  const readyDatum = p.buildReadyDatum({
    brRound: p.roundId,
    brTarget: p.target,
    brStatus: 'BeaconReady',
    brBeaconValue: R,
    brMcHash: p.mcHash,
    brMateriosContext: p.materiosContext,
    brRelayerPkh: p.relayerPkh,
  })

  const redeemer = p.buildPublishRedeemer(
    p.mcHash,
    p.materiosContext,
  )

  const tx = await p.lucid
    .newTx()
    .collectFrom(
      [p.registryUtxo],
      redeemer,
    )
    .attachSpendingValidator(
      p.registryValidator,
    )
    .payToContract(
      p.registryAddress,
      { inline: readyDatum },
      p.registryUtxo.assets,
    )
    .complete()

  /*
   * The wallet/provider used here must be the authorized relayer wallet.
   * The on-chain validator checks its PubKeyHash in txInfoSignatories.
   */
  const signed = await p.lucid.signTx(tx)
  const hash = await p.lucid.submitTx(signed)

  return hash
}

export async function previewBeacon(
  target: BeaconTarget,
  mcHash: Uint8Array,
  materiosContext: Uint8Array,
): Promise<{
  rHex: string
  r: Uint8Array
}> {
  if (mcHash.length === 0) {
    throw new Error('mcHash is empty')
  }

  if (materiosContext.length === 0) {
    throw new Error('materiosContext is empty')
  }

  const r = await deriveBeacon(
    target.networkId,
    target.round,
    target.mainchainRef,
    mcHash,
    materiosContext,
    target.version,
  )

  return {
    r,
    rHex: toHex(r),
  }
}