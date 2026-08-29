/**
 * Light bridge off-chain:
 *
 *   canonical GameRoundCommitment
 *             ↓
 *        BeaconPending
 *             ↓
 *      Materios receipt
 *             ↓
 *      authorized relayer
 *             ↓
 *        BeaconReady
 *
 * The canonical round identity is established before publication
 * of the external Materios receipt.
 */

import {
  deriveBeacon,
  deriveGameRoundCommitment,
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
   * Canonical game identity.
   *
   * Must already be fixed when the BeaconPending UTxO is created.
   */
  gameId: Uint8Array

  /**
   * Canonical game configuration hash.
   *
   * Must already be fixed when the BeaconPending UTxO is created.
   */
  configHash: Uint8Array

  /**
   * Canonical protocol version used by GameRoundCommitment.
   *
   * This must match target.version.
   */
  protocolVersion: Uint8Array

  /**
   * Canonical GameRoundCommitment hash.
   *
   * This must match deriveGameRoundCommitment(
   *   gameId,
   *   roundId,
   *   configHash,
   *   protocolVersion
   * ).
   */
  gameRoundCommitment: Uint8Array

  /**
   * Materios-derived receipt commitment/hash.
   *
   * This is not the canonical round identity.
   * It is published by the authorized relayer after the round
   * has already been anchored.
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
 * Publish the beacon for an already anchored round.
 *
 * The Pending registry UTxO must already contain the canonical
 * GameRoundCommitment.
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

  if (p.gameId.length === 0) {
    throw new Error('gameId is empty')
  }

  if (p.configHash.length === 0) {
    throw new Error('configHash is empty')
  }

  if (p.protocolVersion.length === 0) {
    throw new Error('protocolVersion is empty')
  }

  if (p.target.version.length === 0) {
    throw new Error('target.version is empty')
  }

  if (toHex(p.protocolVersion) !== toHex(p.target.version)) {
    throw new Error('protocolVersion !== target.version')
  }

  if (p.gameRoundCommitment.length === 0) {
    throw new Error('gameRoundCommitment is empty')
  }

  const expectedCommitment =
    await deriveGameRoundCommitment(
      p.gameId,
      p.roundId,
      p.configHash,
      p.protocolVersion,
    )

  if (toHex(p.gameRoundCommitment) !== toHex(expectedCommitment)) {
    throw new Error(
      'gameRoundCommitment does not match canonical round data',
    )
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
    brGameId: p.gameId,
    brConfigHash: p.configHash,
    brProtocolVersion: p.protocolVersion,
    brGameRoundCommitment: {
      grcGameId: p.gameId,
      grcRound: p.roundId,
      grcConfigHash: p.configHash,
      grcProtocolVersion: p.protocolVersion,
      grcCommitmentHash: p.gameRoundCommitment,
    },

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
