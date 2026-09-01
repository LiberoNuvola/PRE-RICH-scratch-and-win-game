/**
 * Mint seriale + Prize UTxO Pending in una sola tx.
 *
 * PrizeDatum include pdIssuedAt / pdExpiresAt (POSIX ms, ≥ 365 giorni).
 * Data.to() una sola volta sull'albero Constr (no double-encode).
 */

import { Constr, Data, type Script, type UTxO } from 'lucid-cardano'

import wallet from './wallet'

import {
  buildScriptsFromLucid,
  counterValidator,
} from './loadValidator'

import {
  SALE_ADDRESS,
  TICKET_PRICE_LOVELACE,
  RELAYER_PKH,
} from './config'

import {
  type BeaconTarget,
  playerCommitment,
  ticketCommitment,
  encodeBeaconTarget,
  randomPlayerSecret,
  toHex,
  utf8,
} from './beacon'

import {
  defaultPrizeTable,
  type PrizeTable,
} from './gameRules'

const MIN_ADA_COUNTER = 2_000_000n
const MIN_ADA_PRIZE = 2_000_000n
const MS_PER_DAY = 86_400_000n

const DEFAULT_NETWORK_ID = 0
const DEFAULT_ROUND_ID = 0
const DEFAULT_GAME_VERSION = 'V1'
const DEFAULT_PRICE_USDM = 2

function constr(index: number, fields: Data[] = []): Constr<Data> {
  return new Constr(index, fields)
}

function strToHex(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function beaconTargetToConstr(target: BeaconTarget): Constr<Data> {
  return constr(0, [
    BigInt(target.networkId),
    BigInt(target.round),
    toHex(target.mainchainRef),
    toHex(target.version),
  ])
}

/**
 * PrizeDatum fields 0..19 (Types.hs):
 * 18 pdIssuedAt, 19 pdExpiresAt
 */
function buildPrizeDatumConstr(fields: {
  ticketPolicyHex: string
  ticketNameHex: string
  playerCommitmentHex: string
  priceUsdm: number
  commitmentHex: string
  gameVersionHex: string
  ticketNonce: number
  prizeAmount: bigint
  paymentPolicyHex: string
  paymentNameHex: string
  target: BeaconTarget
  issuedAt: bigint
  expiresAt: bigint
}): Constr<Data> {
  return constr(0, [
    fields.ticketPolicyHex,
    fields.ticketNameHex,
    fields.playerCommitmentHex,
    BigInt(fields.priceUsdm),
    fields.commitmentHex,
    fields.gameVersionHex,
    BigInt(fields.ticketNonce),
    fields.prizeAmount,
    fields.paymentPolicyHex,
    fields.paymentNameHex,
    constr(0), // Pending
    '',
    0n,
    beaconTargetToConstr(fields.target),
    constr(0), // BeaconPending
    '',
    '',
    '',
    fields.issuedAt,
    fields.expiresAt,
  ])
}

function parseCounterDatum(datum: unknown): number | null {
  if (typeof datum === 'number') return datum
  if (typeof datum === 'bigint') return Number(datum)
  if (typeof datum === 'string' && /^\d+$/.test(datum)) {
    return Number.parseInt(datum, 10)
  }
  if (!datum || typeof datum !== 'object') return null
  const value = datum as Record<string, unknown>
  if ('int' in value) return Number(value.int)
  if ('fields' in value && Array.isArray(value.fields)) {
    const first = value.fields[0]
    if (typeof first === 'number') return first
    if (typeof first === 'bigint') return Number(first)
    if (first && typeof first === 'object' && 'int' in first) {
      return Number((first as Record<string, unknown>).int)
    }
  }
  return null
}

function registryIsPendingForRound(datum: unknown, roundId: number): boolean {
  if (!datum || typeof datum !== 'object') return false
  const value = datum as Record<string, any>
  const fields = Array.isArray(value.fields) ? value.fields : null
  if (!fields || fields.length < 3) return false

  const roundField = fields[0]
  const round =
    typeof roundField === 'bigint'
      ? Number(roundField)
      : typeof roundField === 'number'
        ? roundField
        : roundField && typeof roundField === 'object' && 'int' in roundField
          ? Number(roundField.int)
          : null

  if (round !== roundId) return false

  const status = fields[2]
  const statusIndex =
    status && typeof status === 'object' && 'index' in status
      ? Number(status.index)
      : status && typeof status === 'object' && 'constr' in status
        ? Number(status.constr)
        : null

  return statusIndex === 0
}

function pickPendingRegistryUtxo(utxos: UTxO[], roundId: number): UTxO {
  const matching = utxos.filter((utxo) =>
    registryIsPendingForRound(utxo.datum, roundId),
  )
  if (matching.length === 1) return matching[0]
  if (matching.length > 1) {
    throw new Error(
      `Più BeaconRegistry Pending per round=${roundId}. Atteso uno solo.`,
    )
  }
  throw new Error(
    `Nessun BeaconRegistry Pending per round=${roundId}. Pubblica il registry prima del mint.`,
  )
}

export type MintSerialResult = {
  txHash: string
  tokenName: string
  assetId: string
  policyId: string
  ticketNonce: number
  playerSecretHex: string
  playerCommitmentHex: string
  commitmentHex: string
  prizeAddress: string
  counterAddress: string
  registryAddress: string
  issuedAt: number
  expiresAt: number
}

export type MintSerialOptions = {
  saleAddress?: string
  priceLovelace?: number
  priceUsdm?: number
  networkId?: number
  roundId?: number
  mainchainRef?: Uint8Array
  gameVersion?: Uint8Array
  prizeFundingLovelace?: bigint
  prizeAmount?: bigint
  table?: PrizeTable
  playerSecret?: Uint8Array
  ticketNonce?: number
}

export async function mintSerialNFT(
  opts: MintSerialOptions = {},
): Promise<MintSerialResult> {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  const saleAddress = opts.saleAddress ?? SALE_ADDRESS
  if (!saleAddress) throw new Error('SALE_ADDRESS mancante')

  const priceLovelace = opts.priceLovelace ?? TICKET_PRICE_LOVELACE
  const priceUsdm = opts.priceUsdm ?? DEFAULT_PRICE_USDM
  const networkId = opts.networkId ?? DEFAULT_NETWORK_ID
  const roundId = opts.roundId ?? DEFAULT_ROUND_ID
  const gameVersion = opts.gameVersion ?? utf8(DEFAULT_GAME_VERSION)
  const mainchainRef =
    opts.mainchainRef ?? utf8(`pre-rich-round-${roundId}`)
  const table = opts.table ?? defaultPrizeTable
  const prizeFunding = opts.prizeFundingLovelace ?? MIN_ADA_PRIZE
  const prizeAmount = opts.prizeAmount ?? prizeFunding

  const scripts = buildScriptsFromLucid(
    lucid,
    saleAddress,
    priceLovelace,
    table,
  )

  const {
    mintPolicy,
    prizeValidator,
    ticketPolicyId,
    counterAddress,
    registryAddress,
    prizeAddress,
  } = scripts

  void prizeValidator

  if (!counterAddress || !registryAddress || !prizeAddress) {
    throw new Error('Impossibile derivare gli script address da Lucid')
  }

  const counterUtxos = await lucid.utxosAt(counterAddress)
  if (counterUtxos.length === 0) {
    throw new Error(`Nessun Counter UTxO a ${counterAddress}`)
  }
  if (counterUtxos.length !== 1) {
    throw new Error(
      `Attesi esattamente 1 Counter UTxO, trovati ${counterUtxos.length}`,
    )
  }

  const counterUtxo = counterUtxos[0]
  let n: number | null = null
  try {
    const rawDatum =
      counterUtxo.datum ?? (await lucid.datumOf(counterUtxo))
    n = parseCounterDatum(rawDatum)
  } catch (error) {
    console.error('Errore lettura Counter datum:', error)
  }

  if (n === null || !Number.isInteger(n) || n < 0) {
    throw new Error('Counter datum non leggibile')
  }

  const tokenNameAscii = String(n)
  const tokenNameHex = strToHex(tokenNameAscii)
  const ticketNonce = opts.ticketNonce ?? n

  const target: BeaconTarget = {
    networkId,
    round: roundId,
    mainchainRef,
    version: gameVersion,
  }

  const registryUtxos = await lucid.utxosAt(registryAddress)
  if (registryUtxos.length === 0) {
    throw new Error(`Nessun BeaconRegistry UTxO a ${registryAddress}`)
  }

  const registryUtxo = pickPendingRegistryUtxo(registryUtxos, roundId)

  if (RELAYER_PKH) {
    const registryFields = Array.isArray(
      (registryUtxo.datum as any)?.fields,
    )
      ? (registryUtxo.datum as any).fields
      : null
    const foundRelayerPkh = registryFields?.[6] ?? null
    if (
      !foundRelayerPkh ||
      String(foundRelayerPkh).toLowerCase() !== RELAYER_PKH.toLowerCase()
    ) {
      throw new Error(
        `BeaconRegistry round=${roundId}: relayerPkh inatteso (atteso ${RELAYER_PKH})`,
      )
    }
  } else {
    console.warn('RELAYER_PKH non configurato: round non verificato.')
  }

  const playerSecret = opts.playerSecret ?? randomPlayerSecret(32)
  if (playerSecret.length !== 32) {
    throw new Error('playerSecret deve essere 32 bytes')
  }

  const pCommit = await playerCommitment(roundId, ticketNonce, playerSecret)
  const ticketIdBytes = new TextEncoder().encode(tokenNameAscii)
  const targetEncoding = encodeBeaconTarget(target)
  const commitment = await ticketCommitment(
    ticketIdBytes,
    pCommit,
    gameVersion,
    ticketNonce,
    priceUsdm,
    targetEncoding,
  )

  const playerCommitmentHex = toHex(pCommit)
  const commitmentHex = toHex(commitment)
  const gameVersionHex = toHex(gameVersion)

  const issuedAtMs = BigInt(Date.now())
  const expiresAtMs = issuedAtMs + 365n * MS_PER_DAY

  const prizeDatumConstr = buildPrizeDatumConstr({
    ticketPolicyHex: ticketPolicyId,
    ticketNameHex: tokenNameHex,
    playerCommitmentHex,
    priceUsdm,
    commitmentHex,
    gameVersionHex,
    ticketNonce,
    prizeAmount,
    paymentPolicyHex: '',
    paymentNameHex: '',
    target,
    issuedAt: issuedAtMs,
    expiresAt: expiresAtMs,
  })

  const unit = ticketPolicyId + tokenNameHex
  const mintAssets: Record<string, bigint> = { [unit]: 1n }
  const buyer = await lucid.wallet.address()

  const tx = await lucid
    .newTx()
    .collectFrom([counterUtxo], Data.void())
    .attachSpendingValidator(counterValidator)
    .mintAssets(mintAssets, Data.void())
    .attachMintingPolicy(mintPolicy as Script)
    .readFrom([registryUtxo])
    .payToAddress(saleAddress, { lovelace: BigInt(priceLovelace) })
    .payToContract(
      counterAddress,
      { inline: Data.to(BigInt(n + 1)) },
      { lovelace: MIN_ADA_COUNTER },
    )
    .payToContract(
      prizeAddress,
      { inline: Data.to(prizeDatumConstr) },
      { lovelace: prizeFunding },
    )
    .payToAddress(buyer, { [unit]: 1n })
    .addSigner(buyer)
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)

  return {
    txHash,
    tokenName: tokenNameAscii,
    assetId: unit,
    policyId: ticketPolicyId,
    ticketNonce,
    playerSecretHex: toHex(playerSecret),
    playerCommitmentHex,
    commitmentHex,
    prizeAddress,
    counterAddress,
    registryAddress,
    issuedAt: Number(issuedAtMs),
    expiresAt: Number(expiresAtMs),
  }
}

export default { mintSerialNFT }