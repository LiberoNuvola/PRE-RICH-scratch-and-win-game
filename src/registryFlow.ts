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
 *
 * The GameRoundCommitment is stored directly inside the
 * BeaconRegistryDatum and is therefore authenticated by the
 * BeaconRegistry validator.
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

  if (p.roundId < 0) {
    throw new Error('roundId must be >= 0')
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

  /*
   * The Pending registry UTxO must already contain this exact
   * GameRoundCommitment. We cannot authenticate the previous datum
   * purely from the generic `any` type, but if the caller exposes
   * the decoded datum we verify it before constructing the Ready datum.
   *
   * This is an off-chain consistency check only.
   * The authoritative check is performed by BeaconRegistry.hs.
   */
  if (p.registryUtxo?.datum) {
    const pending = p.registryUtxo.datum

    if (
      pending.brRound !== undefined &&
      Number(pending.brRound) !== p.roundId
    ) {
      throw new Error(
        'Pending registry datum round does not match roundId',
      )
    }

    if (
      pending.brGameRoundCommitment !== undefined
    ) {
      const pendingCommitment =
        pending.brGameRoundCommitment

      if (
        pendingCommitment.grcGameId !== undefined &&
        toHex(pendingCommitment.grcGameId) !== toHex(p.gameId)
      ) {
        throw new Error(
          'Pending registry gameId does not match canonical gameId',
        )
      }

      if (
        pendingCommitment.grcRound !== undefined &&
        Number(pendingCommitment.grcRound) !== p.roundId
      ) {
        throw new Error(
          'Pending registry commitment round does not match roundId',
        )
      }

      if (
        pendingCommitment.grcConfigHash !== undefined &&
        toHex(pendingCommitment.grcConfigHash) !== toHex(p.configHash)
      ) {
        throw new Error(
          'Pending registry configHash does not match canonical configHash',
        )
      }

      if (
        pendingCommitment.grcProtocolVersion !== undefined &&
        toHex(pendingCommitment.grcProtocolVersion) !==
          toHex(p.protocolVersion)
      ) {
        throw new Error(
          'Pending registry protocolVersion does not match canonical protocolVersion',
        )
      }

      if (
        pendingCommitment.grcCommitmentHash !== undefined &&
        toHex(pendingCommitment.grcCommitmentHash) !==
          toHex(p.gameRoundCommitment)
      ) {
        throw new Error(
          'Pending registry commitment hash does not match canonical commitment',
        )
      }
    }
  }

  const R = await deriveBeacon(
    p.target.networkId,
    p.target.round,
    p.target.mainchainRef,
    p.mcHash,
    p.materiosContext,
    p.target.version,
  )

  /*
   * IMPORTANT:
   *
   * BeaconRegistryDatum now contains the complete
   * GameRoundCommitment as a single nested value.
   *
   * Do not add brGameId/brConfigHash/brProtocolVersion here:
   * they are intentionally contained inside brGameRoundCommitment.
   */
  const readyDatum = p.buildReadyDatum({
    brRound: p.roundId,
    brTarget: p.target,
    brStatus: 'BeaconReady',
    brBeaconValue: R,
    brMcHash: p.mcHash,
    brMateriosContext: p.materiosContext,
    brRelayerPkh: p.relayerPkh,

    brGameRoundCommitment: {
      grcGameId: p.gameId,
      grcRound: p.roundId,
      grcConfigHash: p.configHash,
      grcProtocolVersion: p.protocolVersion,
      grcCommitmentHash: p.gameRoundCommitment,
    },
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
