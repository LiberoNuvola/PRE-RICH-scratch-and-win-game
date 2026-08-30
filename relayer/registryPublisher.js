'use strict'

const {
  Data,
  Constr,
} = require('lucid-cardano')

/**
 * BeaconRegistryAction
 *
 * Types.hs:
 *
 * data BeaconRegistryAction
 *   = RegistryPublish BuiltinByteString BuiltinByteString
 */
function registryPublishRedeemer(mcHashHex, materiosContextHex) {
  return Data.to(
    new Constr(0, [
      mcHashHex,
      materiosContextHex,
    ]),
  )
}

/**
 * Publish:
 *
 * Pending Registry UTxO
 *       ↓
 * RegistryPublish(mcHash, context)
 *       ↓
 * BeaconRegistry validator
 *       ↓
 * Ready Registry UTxO
 *
 * The relayer signs the transaction.
 * The validator independently checks the beacon derivation.
 */
async function publishBeacon({
  lucid,
  registryValidator,
  registryAddress,
  registryUtxo,
  mcHashHex,
  materiosContextHex,
}) {
  if (!registryUtxo) {
    throw new Error('Registry Pending UTxO not found')
  }

  if (!mcHashHex) {
    throw new Error('mcHash is empty')
  }

  if (!materiosContextHex) {
    throw new Error('materiosContext is empty')
  }

  const redeemer = registryPublishRedeemer(
    mcHashHex,
    materiosContextHex,
  )

  const tx = await lucid
    .newTx()
    .collectFrom(
      [registryUtxo],
      redeemer,
    )
    .attachSpendingValidator(
      registryValidator,
    )
    .payToContract(
      registryAddress,
      {
        inline: registryUtxo.datum,
      },
      registryUtxo.assets,
    )
    .complete()

  const signed = await lucid.signTx(tx)
  return lucid.submitTx(signed)
}

module.exports = {
  publishBeacon,
}