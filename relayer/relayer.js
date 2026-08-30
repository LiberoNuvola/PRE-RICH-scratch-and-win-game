/*
 * PRE-RICH Relayer
 *
 * Responsibilities:
 *
 *   1. Treasury distribution (existing B1 operational task).
 *
 *   2. BeaconRegistry publisher:
 *
 *        Pending Registry
 *             |
 *             | RegistryPublish(mcHash, materiosContext)
 *             v
 *        Ready Registry
 *
 * The relayer NEVER decides:
 *   - the game result
 *   - the prize tier
 *   - the payout
 *   - the beacon value
 *
 * BeaconRegistry.hs derives and validates:
 *
 *   R = deriveBeacon(
 *         target.networkId,
 *         target.round,
 *         target.mainchainRef,
 *         mcHash,
 *         materiosContext,
 *         target.version
 *       )
 *
 * The current on-chain model is B1:
 * the configured relayer is the authorized publisher of the
 * external Materios observation. The contract verifies the
 * deterministic derivation and the relayer signature, but does
 * NOT independently prove the authenticity of the external
 * Materios observation.
 *
 * This file therefore deliberately fails closed when the
 * Materios adapter is not configured.
 */

const {
  Lucid,
  Blockfrost,
  Data,
  Constr,
  walletFromPrivateKey,
} = require('lucid-cardano')

const fs = require('fs')
const path = require('path')

require('dotenv').config()

const {
  loadScript,
  TREASURY_SCRIPT_PATH,
} = require('./loadValidator')

// ---------------------------------------------------------------------------
// Generic configuration
// ---------------------------------------------------------------------------

const BLOCKFROST = process.env.BLOCKFROST_PROJECT_ID
const NETWORK = process.env.NETWORK || 'Preprod'

const POLL_INTERVAL = Number(
  process.env.POLL_INTERVAL || 15_000,
)

const BEACON_POLL_INTERVAL = Number(
  process.env.BEACON_POLL_INTERVAL || POLL_INTERVAL,
)

if (!BLOCKFROST) {
  throw new Error(
    'BLOCKFROST_PROJECT_ID is required.',
  )
}

const RELAYER_PRIVATE_KEY =
  process.env.RELAYER_PRIVATE_KEY

if (!RELAYER_PRIVATE_KEY) {
  throw new Error(
    'RELAYER_PRIVATE_KEY is required.',
  )
}

// ---------------------------------------------------------------------------
// Script loading
// ---------------------------------------------------------------------------

function loadJsonScript(relativePath) {
  const fullPath = path.resolve(__dirname, relativePath)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const env = JSON.parse(raw)

  if (!env || typeof env.cborHex !== 'string') {
    throw new Error(
      `Invalid script envelope at ${fullPath}`,
    )
  }

  return {
    type: 'PlutusV2',
    script: env.cborHex,
  }
}

const TREASURY_SCRIPT =
  loadScript(TREASURY_SCRIPT_PATH)

const BEACON_REGISTRY_SCRIPT_PATH =
  process.env.BEACON_REGISTRY_SCRIPT_PATH ||
  '../plutus/out/beaconRegistry.plutus.json'

const BEACON_REGISTRY_SCRIPT =
  loadJsonScript(BEACON_REGISTRY_SCRIPT_PATH)

// ---------------------------------------------------------------------------
// Treasury configuration
// ---------------------------------------------------------------------------

const TREASURY_ADDRESS =
  process.env.TREASURY_ADDRESS

const DEFAULT_THRESHOLD = 25_000_000n

const TOTAL_BASIS = 10_000n
const DISTRIBUTABLE_BASIS = 9_950n

if (!TREASURY_ADDRESS) {
  console.warn(
    '[treasury] TREASURY_ADDRESS not configured; treasury worker disabled.',
  )
}

function parseBigInt(value, fallback) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback
  }

  return BigInt(value)
}

function calculateDistribution(totalLovelace) {
  const total = BigInt(totalLovelace || 0)

  const relayerRewardBase =
    (total * 50n) / TOTAL_BASIS

  const minReward = parseBigInt(
    process.env.RELAYER_REWARD_MIN_LOVELACE,
    200_000n,
  )

  const relayerReward =
    relayerRewardBase > minReward
      ? relayerRewardBase
      : minReward

  const distributable =
    total - relayerReward

  const prize =
    (distributable * 5_000n) /
    DISTRIBUTABLE_BASIS

  const stake =
    (distributable * 3_000n) /
    DISTRIBUTABLE_BASIS

  const reserve =
    distributable - prize - stake

  return {
    relayerReward,
    prize,
    stake,
    reserve,
    distributable,
  }
}

const DISTRIBUTE_REDEEMER =
  Data.to(new Constr(0, []))

// ---------------------------------------------------------------------------
// BeaconRegistry data helpers
// ---------------------------------------------------------------------------

/*
 * BeaconRegistryDatum:
 *
 *   0 brRound
 *   1 brTarget
 *   2 brStatus
 *   3 brBeaconValue
 *   4 brMcHash
 *   5 brMateriosContext
 *   6 brRelayerPkh
 *
 * BeaconTarget:
 *
 *   0 btNetworkId
 *   1 btRound
 *   2 btMainchainRef
 *   3 btVersion
 */

function parseData(value) {
  if (value == null) return null

  if (
    typeof value === 'object' &&
    Array.isArray(value.fields)
  ) {
    return value
  }

  if (typeof value === 'string') {
    try {
      return Data.from(value)
    } catch {
      return null
    }
  }

  try {
    return Data.from(value)
  } catch {
    return value
  }
}

function fieldsOf(value) {
  const parsed = parseData(value)

  if (
    parsed &&
    typeof parsed === 'object' &&
    Array.isArray(parsed.fields)
  ) {
    return parsed.fields
  }

  return null
}

function integerOf(value) {
  if (typeof value === 'bigint') {
    return value
  }

  if (typeof value === 'number') {
    return BigInt(value)
  }

  if (
    value &&
    typeof value === 'object' &&
    'int' in value
  ) {
    return BigInt(value.int)
  }

  return null
}

function bytesOf(value) {
  if (typeof value === 'string') {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    typeof value.bytes === 'string'
  ) {
    return value.bytes
  }

  return null
}

function constrIndexOf(value) {
  if (
    value &&
    typeof value === 'object'
  ) {
    if ('index' in value) {
      return Number(value.index)
    }

    if ('constr' in value) {
      return Number(value.constr)
    }
  }

  return null
}

function decodeRegistryDatum(utxo) {
  const raw = utxo.datum

  if (raw == null) {
    return null
  }

  const fields = fieldsOf(raw)

  if (!fields || fields.length !== 7) {
    return null
  }

  const round = integerOf(fields[0])
  const targetFields = fieldsOf(fields[1])

  if (!targetFields || targetFields.length !== 4) {
    return null
  }

  const networkId = integerOf(targetFields[0])
  const targetRound = integerOf(targetFields[1])
  const mainchainRef = bytesOf(targetFields[2])
  const version = bytesOf(targetFields[3])

  const status = constrIndexOf(fields[2])
  const beaconValue = bytesOf(fields[3])
  const mcHash = bytesOf(fields[4])
  const materiosContext = bytesOf(fields[5])
  const relayerPkh = bytesOf(fields[6])

  if (
    round === null ||
    networkId === null ||
    targetRound === null ||
    mainchainRef === null ||
    version === null ||
    status === null ||
    beaconValue === null ||
    mcHash === null ||
    materiosContext === null ||
    relayerPkh === null
  ) {
    return null
  }

  return {
    round,
    target: {
      networkId,
      round: targetRound,
      mainchainRef,
      version,
    },
    status,
    beaconValue,
    mcHash,
    materiosContext,
    relayerPkh,
  }
}

function registryIsPendingForRound(
  utxo,
  round,
) {
  const datum = decodeRegistryDatum(utxo)

  if (!datum) {
    return false
  }

  return (
    datum.status === 0 &&
    datum.round === BigInt(round) &&
    datum.target.round === BigInt(round)
  )
}

function registryIsReadyForRound(
  utxo,
  round,
) {
  const datum = decodeRegistryDatum(utxo)

  if (!datum) {
    return false
  }

  return (
    datum.status === 1 &&
    datum.round === BigInt(round) &&
    datum.target.round === BigInt(round)
  )
}

// ---------------------------------------------------------------------------
// Materios adapter
// ---------------------------------------------------------------------------

/*
 * IMPORTANT:
 *
 * We do not hard-code an assumed Materios API here.
 *
 * The adapter expects an HTTP endpoint configured by:
 *
 *   MATERIOS_API_URL
 *
 * Optional:
 *
 *   MATERIOS_API_TOKEN
 *
 * The endpoint must return JSON containing the two canonical
 * values needed by RegistryPublish.
 *
 * By default the adapter accepts:
 *
 *   {
 *     "mcHash": "...",
 *     "materiosContext": "..."
 *   }
 *
 * or:
 *
 *   {
 *     "mcHashHex": "...",
 *     "materiosContextHex": "..."
 *   }
 *
 * An optional MATERIOS_ROUND_QUERY parameter can be used to
 * specify the query parameter name used by the provider:
 *
 *   MATERIOS_ROUND_QUERY=round
 *
 * The actual provider mapping belongs here, not inside the
 * on-chain contract.
 */

function cleanHex(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(
      `${fieldName} must be a hex string.`,
    )
  }

  const clean = value.startsWith('0x')
    ? value.slice(2)
    : value

  if (
    clean.length === 0 ||
    clean.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(clean)
  ) {
    throw new Error(
      `${fieldName} must be non-empty hexadecimal data.`,
    )
  }

  return clean.toLowerCase()
}

async function fetchMateriosObservation(target) {
  const baseUrl =
    process.env.MATERIOS_API_URL

  if (!baseUrl) {
    throw new Error(
      'MATERIOS_API_URL is not configured. ' +
      'Beacon publication is disabled until the real Materios adapter is configured.',
    )
  }

  const roundQuery =
    process.env.MATERIOS_ROUND_QUERY || 'round'

  const url = new URL(baseUrl)

  url.searchParams.set(
    roundQuery,
    target.round.toString(),
  )

  const headers = {
    accept: 'application/json',
  }

  if (process.env.MATERIOS_API_TOKEN) {
    headers.authorization =
      `Bearer ${process.env.MATERIOS_API_TOKEN}`
  }

  const response = await fetch(
    url,
    {
      method: 'GET',
      headers,
    },
  )

  if (!response.ok) {
    throw new Error(
      `Materios API returned HTTP ${response.status}`,
    )
  }

  const body = await response.json()

  const mcHash =
    body.mcHashHex ??
    body.mcHash

  const materiosContext =
    body.materiosContextHex ??
    body.materiosContext

  if (
    mcHash === undefined ||
    materiosContext === undefined
  ) {
    throw new Error(
      'Materios adapter response must contain ' +
      'mcHash/mcHashHex and materiosContext/materiosContextHex.',
    )
  }

  return {
    mcHash: cleanHex(
      mcHash,
      'mcHash',
    ),
    materiosContext: cleanHex(
      materiosContext,
      'materiosContext',
    ),
  }
}

// ---------------------------------------------------------------------------
// BeaconRegistry publisher
// ---------------------------------------------------------------------------

async function publishBeaconRegistry(
  lucid,
  registryUtxo,
  registryDatum,
) {
  const observation =
    await fetchMateriosObservation(
      registryDatum.target,
    )

  console.log(
    '[beacon] observation received',
    {
      round:
        registryDatum.round.toString(),
      mcHash:
        observation.mcHash,
      materiosContextBytes:
        observation.materiosContext.length / 2,
    },
  )

  /*
   * RegistryPublish:
   *
   *   constructor 0
   *   fields:
   *     0 mcHash
   *     1 materiosContext
   *
   * Lucid Data encoding for bytes is the
   * raw hexadecimal string.
   */
  const redeemer = Data.to(
    new Constr(0, [
      observation.mcHash,
      observation.materiosContext,
    ]),
  )

  /*
   * The continuing Registry datum is NOT constructed by
   * the relayer.
   *
   * This is intentional.
   *
   * BeaconRegistry.hs is the authority that validates the
   * transition and requires the continuing output to contain:
   *
   *   BeaconReady
   *   deriveBeacon(target, mcHash, context)
   *   same round
   *   same target
   *   same relayer
   *
   * We therefore build the output only after deriving the
   * exact expected datum locally from the existing datum,
   * while the validator remains the final authority.
   */

  const currentFields =
    fieldsOf(registryUtxo.datum)

  if (
    !currentFields ||
    currentFields.length !== 7
  ) {
    throw new Error(
      'Cannot reconstruct BeaconRegistry datum.',
    )
  }

  const nextFields = [
    currentFields[0],
    currentFields[1],

    // BeaconReady
    new Constr(1, []),

    // The actual beacon is calculated by the on-chain
    // validator. The relayer must therefore not invent it.
    //
    // For this reason the transaction builder below uses
    // the provider-compatible deterministic calculation
    // only when explicitly enabled.
    null,

    observation.mcHash,
    observation.materiosContext,
    currentFields[6],
  ]

  /*
   * We deliberately require a local beacon derivation
   * implementation before publishing.
   *
   * This is NOT a trust assumption: the on-chain contract
   * independently recomputes deriveBeacon.
   *
   * It is simply required because Cardano transactions must
   * contain the complete continuing datum.
   */
  const beaconValue =
    deriveBeaconOffChain(
      registryDatum.target,
      observation.mcHash,
      observation.materiosContext,
    )

  nextFields[3] = beaconValue

  const nextDatum = Data.to(
    new Constr(0, nextFields),
  )

  const relayerAddress =
    await lucid.wallet.address()

  const tx = await lucid
    .newTx()
    .collectFrom(
      [registryUtxo],
      redeemer,
    )
    .attachSpendingValidator(
      BEACON_REGISTRY_SCRIPT,
    )
    .payToContract(
      process.env.BEACON_REGISTRY_ADDRESS,
      {
        inline: nextDatum,
      },
      getUtxoAssets(registryUtxo),
    )
    .addSigner(relayerAddress)
    .complete()

  const signed =
    await lucid.signTx(tx)

  const txHash =
    await lucid.submitTx(signed)

  return txHash
}

// ---------------------------------------------------------------------------
// Off-chain mirror of Beacon.deriveBeacon
// ---------------------------------------------------------------------------

/*
 * This mirrors plutus/Beacon.hs exactly.
 *
 * Domain:
 *   PRE-RICH/BEACON/V1
 *
 * Encoding:
 *   field(bytes)
 *   fieldInteger(integer)
 *
 * The contract remains authoritative.
 */

const BEACON_DOMAIN =
  Buffer.from('PRE-RICH/BEACON/V1', 'utf8')

function integerToBytes(n) {
  if (n < 0n) {
    return integerToBytes(0n)
  }

  return Buffer.from(
    n.toString(10),
    'utf8',
  )
}

function field(buffer) {
  const value =
    Buffer.isBuffer(buffer)
      ? buffer
      : Buffer.from(buffer)

  return Buffer.concat([
    integerToBytes(BigInt(value.length)),
    value,
  ])
}

function fieldInteger(n) {
  return field(
    integerToBytes(BigInt(n)),
  )
}

function hexBuffer(hex) {
  return Buffer.from(
    cleanHex(hex, 'hex'),
    'hex',
  )
}

const crypto =
  require('crypto')

function deriveBeaconOffChain(
  target,
  mcHashHex,
  materiosContextHex,
) {
  const payload =
    Buffer.concat([
      field(BEACON_DOMAIN),
      fieldInteger(target.networkId),
      fieldInteger(target.round),
      field(hexBuffer(target.mainchainRef)),
      field(hexBuffer(mcHashHex)),
      field(hexBuffer(materiosContextHex)),
      field(hexBuffer(target.version)),
    ])

  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex')
}

// ---------------------------------------------------------------------------
// Registry discovery
// ---------------------------------------------------------------------------

async function findPendingRegistry(
  lucid,
  registryAddress,
) {
  const utxos =
    await lucid.utxosAt(
      registryAddress,
    )

  const pending =
    utxos.filter((u) =>
      decodeRegistryDatum(u)?.status === 0,
    )

  return pending
}

async function beaconWorker(lucid) {
  const registryAddress =
    process.env.BEACON_REGISTRY_ADDRESS

  if (!registryAddress) {
    console.warn(
      '[beacon] BEACON_REGISTRY_ADDRESS not configured; Beacon worker disabled.',
    )
    return
  }

  const pending =
    await findPendingRegistry(
      lucid,
      registryAddress,
    )

  if (pending.length === 0) {
    return
  }

  /*
   * One Registry UTxO per round.
   *
   * We process each pending round independently.
   * Duplicate Pending registries for the same round are
   * refused rather than guessed.
   */
  const byRound =
    new Map()

  for (const utxo of pending) {
    const datum =
      decodeRegistryDatum(utxo)

    if (!datum) continue

    const key =
      datum.round.toString()

    const current =
      byRound.get(key) || []

    current.push({
      utxo,
      datum,
    })

    byRound.set(key, current)
  }

  for (const [round, entries] of byRound) {
    if (entries.length !== 1) {
      console.error(
        `[beacon] refusing round=${round}: ` +
        `${entries.length} Pending registry UTxOs found; expected exactly one.`,
      )
      continue
    }

    const {
      utxo,
      datum,
    } = entries[0]

    try {
      console.log(
        `[beacon] publishing round=${round}`,
      )

      const txHash =
        await publishBeaconRegistry(
          lucid,
          utxo,
          datum,
        )

      console.log(
        `[beacon] RegistryPublish submitted: ${txHash}`,
      )
    } catch (error) {
      console.error(
        `[beacon] round=${round} publication failed:`,
        error,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Treasury worker
// ---------------------------------------------------------------------------

async function treasuryWorker(lucid) {
  if (!TREASURY_ADDRESS) {
    return
  }

  const utxos =
    await lucid.utxosAt(
      TREASURY_ADDRESS,
    )

  let total = 0n

  for (const u of utxos) {
    total += getLovelace(u)
  }

  const threshold =
    parseBigInt(
      process.env.TREASURY_THRESHOLD,
      DEFAULT_THRESHOLD,
    )

  console.log(
    '[treasury] total lovelace:',
    total.toString(),
  )

  if (
    total < threshold ||
    utxos.length === 0
  ) {
    return
  }

  const prizeAddr =
    process.env.PRIZE_ADDRESS

  const stakeAddr =
    process.env.STAKE_ADDRESS

  const reserveAddr =
    process.env.RESERVE_ADDRESS

  const missing = []

  if (!prizeAddr) {
    missing.push('PRIZE_ADDRESS')
  }

  if (!stakeAddr) {
    missing.push('STAKE_ADDRESS')
  }

  if (!reserveAddr) {
    missing.push('RESERVE_ADDRESS')
  }

  if (missing.length > 0) {
    console.error(
      '[treasury] refusing distribution; missing:',
      missing.join(', '),
    )
    return
  }

  const distribution =
    calculateDistribution(total)

  const relayerAddr =
    await lucid.wallet.address()

  const tx =
    lucid.newTx()

  for (const u of utxos) {
    tx.collectFrom(
      [u],
      DISTRIBUTE_REDEEMER,
    )
  }

  tx.attachSpendingValidator(
    TREASURY_SCRIPT,
  )

  tx.payToAddress(
    prizeAddr,
    {
      lovelace:
        distribution.prize,
    },
  )

  tx.payToAddress(
    stakeAddr,
    {
      lovelace:
        distribution.stake,
    },
  )

  tx.payToAddress(
    reserveAddr,
    {
      lovelace:
        distribution.reserve,
    },
  )

  tx.payToAddress(
    relayerAddr,
    {
      lovelace:
        distribution.relayerReward,
    },
  )

  const built =
    await tx.complete()

  const signed =
    await lucid.signTx(built)

  const txHash =
    await lucid.submitTx(signed)

  console.log(
    '[treasury] distribution submitted:',
    txHash,
  )
}

// ---------------------------------------------------------------------------
// UTxO helpers
// ---------------------------------------------------------------------------

function getLovelace(utxo) {
  if (
    utxo.assets &&
    utxo.assets.lovelace !== undefined
  ) {
    return BigInt(
      utxo.assets.lovelace,
    )
  }

  if (
    utxo.value &&
    utxo.value.lovelace !== undefined
  ) {
    return BigInt(
      utxo.value.lovelace,
    )
  }

  return 0n
}

function getUtxoAssets(utxo) {
  if (utxo.assets) {
    return utxo.assets
  }

  if (utxo.value) {
    return utxo.value
  }

  throw new Error(
    'UTxO has neither assets nor value.',
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const provider =
    new Blockfrost(
      'https://cardano-preprod.blockfrost.io',
      BLOCKFROST,
    )

  const lucid =
    await Lucid.new(
      provider,
      NETWORK,
    )

  const wallet =
    await walletFromPrivateKey(
      RELAYER_PRIVATE_KEY,
    )

  lucid.selectWallet(wallet)

  const relayerAddress =
    await lucid.wallet.address()

  console.log(
    'PRE-RICH relayer started.',
  )

  console.log(
    'Network:',
    NETWORK,
  )

  console.log(
    'Relayer address:',
    relayerAddress,
  )

  console.log(
    'Treasury worker:',
    TREASURY_ADDRESS
      ? 'enabled'
      : 'disabled',
  )

  console.log(
    'Beacon worker:',
    process.env.BEACON_REGISTRY_ADDRESS
      ? 'enabled'
      : 'disabled',
  )

  console.log(
    'Materios adapter:',
    process.env.MATERIOS_API_URL
      ? 'configured'
      : 'NOT CONFIGURED',
  )

  while (true) {
    try {
      await beaconWorker(lucid)
    } catch (error) {
      console.error(
        '[beacon] worker error:',
        error,
      )
    }

    try {
      await treasuryWorker(lucid)
    } catch (error) {
      console.error(
        '[treasury] worker error:',
        error,
      )
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          Math.min(
            POLL_INTERVAL,
            BEACON_POLL_INTERVAL,
          ),
        ),
    )
  }
}

main().catch((error) => {
  console.error(
    'Fatal relayer error:',
    error,
  )

  process.exit(1)
})
