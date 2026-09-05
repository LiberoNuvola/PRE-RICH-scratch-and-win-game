/**
 * PRE-RICH prize flow:
 *
 *   Mint → Pending / BeaconPending
 *     → Pay Treasury (separate tx)
 *     → SyncBeacon → Pending / BeaconReady
 *     → Reveal → Revealed (payout frozen, reserve released, liability created)
 *     → Claim → Claimed (NFT kept, no mandatory burn, liability reduced)
 *
 * PrizeStatus: Pending=0, Revealed=1, Claimed=2
 * PrizeDatum fields 0..20 (18 prizePoolHash, 19 issuedAt, 20 expiresAt)
 *
 * B1: reveal/claim transactions coordinate PrizeValidator + B1PrizePool.
 */

import { Constr, Data, type Script, type UTxO } from 'lucid-cardano'

import wallet from './wallet'

import { buildScriptsFromLucid } from './loadValidator'

import { ORACLE_PUBLISHER_PKH } from './config'

import {
  deriveBeacon,
  deriveTicketSeed,
  deriveSymbolsSeed,
  field,
  fromHex,
  playerCommitment,
  sha256,
  toHex,
} from './beacon'

import {
  classifyTier,
  defaultPrizeTable,
  generateSymbols,
  prizeAmountForTier,
  type PrizeTable,
} from './gameRules'

// ---------------------------------------------------------------------------
// Plutus Data helpers
// ---------------------------------------------------------------------------

type AnyData = Data

function constr(index: number, fields: AnyData[] = []): Data {
  return new Constr<Data>(index, fields) as unknown as Data
}

function bytesData(hex: string): Data {
  return hex.toLowerCase()
}

function emptyConstr(index: number): Data {
  return constr(index, [])
}

// ---------------------------------------------------------------------------
// Generic datum decoding helpers
// ---------------------------------------------------------------------------

type DataFields = {
  fields: unknown[]
}

function asFields(value: unknown): unknown[] | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<DataFields>
  return Array.isArray(candidate.fields) ? candidate.fields : null
}

function parseData(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return Data.from(raw)
    } catch {
      return null
    }
  }
  if (
    typeof raw === 'object' &&
    Array.isArray((raw as { fields?: unknown }).fields)
  ) {
    return raw
  }
  return raw
}

function constrIndex(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null
  const v = value as { index?: unknown; constr?: unknown }
  if (v.index !== undefined) {
    const index = Number(v.index)
    return Number.isInteger(index) ? index : null
  }
  if (v.constr !== undefined) {
    const index = Number(v.constr)
    return Number.isInteger(index) ? index : null
  }
  return null
}

function bytesField(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { bytes?: unknown }).bytes === 'string'
  ) {
    return (value as { bytes: string }).bytes
  }
  return null
}

function integerField(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object' && 'int' in value) {
    return Number((value as { int: number | bigint | string }).int)
  }
  return null
}

// ---------------------------------------------------------------------------
// UTxO value
// ---------------------------------------------------------------------------

function utxoAssets(utxo: UTxO): Record<string, bigint> {
  if (utxo.assets) return utxo.assets
  const legacy = (utxo as unknown as { value?: Record<string, bigint> }).value
  if (legacy) return legacy
  throw new Error('UTxO without assets')
}

// ---------------------------------------------------------------------------
// B1PrizePool datum helpers
// ---------------------------------------------------------------------------

type B1PrizePoolState = { fields: unknown[] }

function decodeB1PrizePoolDatum(utxo: UTxO): B1PrizePoolState | null {
  try {
    const raw = utxo.datum
    if (raw == null) return null
    const parsed = parseData(raw)
    const fields = asFields(parsed)
    if (!fields || fields.length !== 8) return null
    return { fields }
  } catch {
    return null
  }
}

function b1ppField(state: B1PrizePoolState, index: number): unknown {
  return state.fields[index]
}

function b1ppInt(state: B1PrizePoolState, index: number): number | null {
  return integerField(b1ppField(state, index))
}

// ---------------------------------------------------------------------------
// Redeemers
// ---------------------------------------------------------------------------

/** SyncBeacon=0, Reveal=1 [secret], Claim=2 */
function syncBeaconRedeemer(): Data {
  return emptyConstr(0)
}

function revealRedeemer(playerSecretHex: string): Data {
  return constr(1, [bytesData(playerSecretHex)])
}

function claimRedeemer(): Data {
  return emptyConstr(2)
}

/** B1PrizePool actions: FundTreasury=0, TicketIssued=1, TicketRevealed=2, TicketClaimed=3, TicketExpired=4 */

function b1ppTicketRevealedRedeemer(priceUsdm: bigint): Data {
  return constr(2, [priceUsdm])
}

function b1ppTicketClaimedRedeemer(claimedAmount: bigint): Data {
  return constr(3, [claimedAmount])
}

// ---------------------------------------------------------------------------
// PrizeDatum
// ---------------------------------------------------------------------------

/**
 *  0  pdTicketPolicy
 *  1  pdTicketName
 *  2  pdPlayerCommitment
 *  3  pdPriceUsdm          (USDM sub-units: 100 = 1 USDM)
 *  4  pdCommitment
 *  5  pdGameVersion
 *  6  pdTicketNonce
 *  7  pdPrizeAmount         (USDM sub-units: crystallised payout)
 *  8  pdPaymentPolicy
 *  9  pdPaymentName
 * 10  pdStatus
 * 11  pdResult
 * 12  pdPrizeTier
 * 13  pdBeaconTarget
 * 14  pdBeaconStatus
 * 15  pdBeaconValue
 * 16  pdMcHash
 * 17  pdMateriosContext
 * 18  pdPrizePoolHash       (ScriptHash of B1PrizePool validator)
 * 19  pdIssuedAt            (POSIX ms, immutable)
 * 20  pdExpiresAt           (POSIX ms, immutable)
 */

type PrizeState = { fields: unknown[] }

function decodePrizeDatum(utxo: UTxO): PrizeState | null {
  try {
    const raw = utxo.datum
    if (raw == null) return null
    const parsed = parseData(raw)
    const fields = asFields(parsed)
    if (!fields || fields.length !== 21) return null
    return { fields }
  } catch {
    return null
  }
}

function datumFromFields(fields: unknown[]): Data {
  return constr(0, fields as Data[])
}

// ---------------------------------------------------------------------------
// Prize UTxO lookup
// ---------------------------------------------------------------------------

export async function findPrizeUtxo(
  lucid: any,
  prizeAddress: string,
  ticketPolicyId: string,
  ticketAssetNameHex: string,
): Promise<UTxO | null> {
  const utxos = await lucid.utxosAt(prizeAddress)
  for (const utxo of utxos) {
    const datum = decodePrizeDatum(utxo)
    if (!datum) continue
    const policy = bytesField(datum.fields[0])
    const name = bytesField(datum.fields[1])
    if (policy === ticketPolicyId && name === ticketAssetNameHex) {
      return utxo
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// B1PrizePool UTxO lookup
// ---------------------------------------------------------------------------

export async function findB1PrizePoolUtxo(
  lucid: any,
  b1PrizePoolAddress: string,
): Promise<UTxO | null> {
  const utxos = await lucid.utxosAt(b1PrizePoolAddress)
  const candidates = utxos.filter((utxo: UTxO) => decodeB1PrizePoolDatum(utxo) !== null)
  if (candidates.length > 1) {
    throw new Error('B1PrizePool singleton violation: multiple valid Pool UTxOs found')
  }
  return candidates[0] ?? null
}

// ---------------------------------------------------------------------------
// Ticket lookup
// ---------------------------------------------------------------------------

export async function findTicketUtxoInWallet(
  lucid: any,
  ticketPolicyId: string,
  ticketAssetNameHex: string,
): Promise<UTxO | null> {
  const unit = ticketPolicyId + ticketAssetNameHex
  const utxos = await lucid.wallet.getUtxos()
  for (const utxo of utxos) {
    const assets = utxo.assets
    if (assets && assets[unit] === 1n) return utxo
  }
  return null
}

// ---------------------------------------------------------------------------
// BeaconTarget
// ---------------------------------------------------------------------------

type ClientBeaconTarget = {
  networkId: number
  round: number
  mainchainRef: Uint8Array
  version: Uint8Array
}

function parseBeaconTarget(value: unknown): ClientBeaconTarget {
  const fields = asFields(value)
  if (!fields || fields.length !== 4) {
    throw new Error('pdBeaconTarget not decodable')
  }
  const networkId = integerField(fields[0])
  const round = integerField(fields[1])
  const mainchainRefHex = bytesField(fields[2])
  const versionHex = bytesField(fields[3])
  if (
    networkId === null ||
    round === null ||
    mainchainRefHex === null ||
    versionHex === null
  ) {
    throw new Error('pdBeaconTarget contains invalid fields')
  }
  return {
    networkId,
    round,
    mainchainRef: fromHex(mainchainRefHex),
    version: fromHex(versionHex),
  }
}

// ---------------------------------------------------------------------------
// BeaconRegistry
// ---------------------------------------------------------------------------

type RegistryState = { fields: unknown[] }

function decodeRegistryDatum(utxo: UTxO): RegistryState | null {
  try {
    const raw = utxo.datum
    if (raw == null) return null
    const parsed = parseData(raw)
    const fields = asFields(parsed)
    if (!fields || fields.length !== 7) return null
    return { fields }
  } catch {
    return null
  }
}

function registryRound(datum: RegistryState): number | null {
  return integerField(datum.fields[0])
}

function registryStatus(datum: RegistryState): number | null {
  return constrIndex(datum.fields[2])
}

function pickRegistryUtxo(
  utxos: UTxO[],
  round: number,
  requiredStatus: number,
): UTxO {
  const matches: UTxO[] = []
  for (const utxo of utxos) {
    const datum = decodeRegistryDatum(utxo)
    if (!datum) continue
    if (
      registryRound(datum) === round &&
      registryStatus(datum) === requiredStatus
    ) {
      matches.push(utxo)
    }
  }
  if (matches.length === 1) return matches[0]
  if (matches.length === 0) {
    throw new Error(
      `No BeaconRegistry with round=${round} and status=${requiredStatus}.`,
    )
  }
  throw new Error(
    `Found ${matches.length} BeaconRegistry for round=${round}; expected one.`,
  )
}

// ---------------------------------------------------------------------------
// SyncBeacon
// ---------------------------------------------------------------------------

export async function syncBeacon(opts: {
  prizeAddress: string
  ticketPolicyId: string
  ticketAssetNameHex: string
  registryAddress: string
  table?: PrizeTable
}): Promise<string> {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  const table = opts.table ?? defaultPrizeTable
  const scripts = buildScriptsFromLucid(lucid, table, ORACLE_PUBLISHER_PKH)

  const prizeUtxo = await findPrizeUtxo(
    lucid,
    opts.prizeAddress,
    opts.ticketPolicyId,
    opts.ticketAssetNameHex,
  )
  if (!prizeUtxo) throw new Error('Prize UTxO not found')

  const datum = decodePrizeDatum(prizeUtxo)
  if (!datum) throw new Error('PrizeDatum not decodable')

  if (constrIndex(datum.fields[10]) !== 0) {
    throw new Error('Prize is not Pending')
  }
  if (constrIndex(datum.fields[14]) !== 0) {
    throw new Error('Prize is not BeaconPending')
  }

  const target = parseBeaconTarget(datum.fields[13])
  const registryUtxos = await lucid.utxosAt(opts.registryAddress)
  const registryUtxo = pickRegistryUtxo(registryUtxos, target.round, 1)

  const registryDatum = decodeRegistryDatum(registryUtxo)
  if (!registryDatum) {
    throw new Error('BeaconRegistryDatum not decodable')
  }

  const nextFields = [...datum.fields]
  nextFields[14] = emptyConstr(1)
  nextFields[15] = registryDatum.fields[3]
  nextFields[16] = registryDatum.fields[4]
  nextFields[17] = registryDatum.fields[5]

  const nextDatum = datumFromFields(nextFields)
  const owner = await lucid.wallet.address()

  const tx = await lucid
    .newTx()
    .collectFrom([prizeUtxo], syncBeaconRedeemer())
    .attachSpendingValidator(scripts.prizeValidator as Script)
    .readFrom([registryUtxo])
    .payToContract(
      opts.prizeAddress,
      { inline: Data.to(nextDatum) },
      utxoAssets(prizeUtxo),
    )
    .addSigner(owner)
    .complete()

  const signed = await lucid.signTx(tx)
  return lucid.submitTx(signed)
}

// ---------------------------------------------------------------------------
// Reveal — coordinates PrizeValidator + B1PrizePool
// ---------------------------------------------------------------------------

export async function revealPrize(opts: {
  prizeAddress: string
  ticketPolicyId: string
  ticketAssetNameHex: string
  playerSecretHex: string
  b1PrizePoolAddress: string
  table?: PrizeTable
}): Promise<{
  txHash: string
  tier: number
  prizeAmount: number
  resultHex: string
}> {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  const secretHex = opts.playerSecretHex.startsWith('0x')
    ? opts.playerSecretHex.slice(2)
    : opts.playerSecretHex

  if (!/^[0-9a-fA-F]{64}$/.test(secretHex)) {
    throw new Error('playerSecretHex must be 32 bytes (64 hex)')
  }

  const playerSecret = fromHex(secretHex)
  const table = opts.table ?? defaultPrizeTable
  const scripts = buildScriptsFromLucid(lucid, table, ORACLE_PUBLISHER_PKH)

  const prizeUtxo = await findPrizeUtxo(
    lucid,
    opts.prizeAddress,
    opts.ticketPolicyId,
    opts.ticketAssetNameHex,
  )
  if (!prizeUtxo) throw new Error('Prize UTxO not found')

  const datum = decodePrizeDatum(prizeUtxo)
  if (!datum) throw new Error('PrizeDatum not decodable')

  if (constrIndex(datum.fields[10]) !== 0) {
    throw new Error('Prize is not Pending')
  }
  if (constrIndex(datum.fields[14]) !== 1) {
    throw new Error('Beacon not Ready: run SyncBeacon first')
  }

  const target = parseBeaconTarget(datum.fields[13])
  const ticketNonce = integerField(datum.fields[6])
  const priceUsdm = integerField(datum.fields[3])
  const gameVersionHex = bytesField(datum.fields[5])
  const beaconValueHex = bytesField(datum.fields[15])
  const mcHashHex = bytesField(datum.fields[16])
  const materiosContextHex = bytesField(datum.fields[17])
  const playerCommitmentHex = bytesField(datum.fields[2])
  const commitmentHex = bytesField(datum.fields[4])
  const ticketNameHex = bytesField(datum.fields[1])

  if (
    ticketNonce === null ||
    priceUsdm === null ||
    !gameVersionHex ||
    !beaconValueHex ||
    !mcHashHex ||
    !materiosContextHex ||
    !playerCommitmentHex ||
    !commitmentHex ||
    !ticketNameHex
  ) {
    throw new Error('PrizeDatum incomplete for Reveal')
  }

  const gameVersion = fromHex(gameVersionHex)
  const beaconValue = fromHex(beaconValueHex)
  const mcHash = fromHex(mcHashHex)
  const materiosContext = fromHex(materiosContextHex)

  const expectedBeacon = await deriveBeacon(
    target.networkId,
    target.round,
    target.mainchainRef,
    mcHash,
    materiosContext,
    target.version,
  )
  if (toHex(expectedBeacon) !== beaconValueHex.toLowerCase()) {
    throw new Error(
      'Beacon mismatch: pdBeaconValue != deriveBeacon(...)',
    )
  }

  const expectedPlayerCommitment = await playerCommitment(
    target.round,
    ticketNonce,
    playerSecret,
  )
  if (
    toHex(expectedPlayerCommitment) !==
    playerCommitmentHex.toLowerCase()
  ) {
    throw new Error('playerSecret does not match pdPlayerCommitment')
  }

  const ticketSeed = await deriveTicketSeed(
    target.round,
    ticketNonce,
    playerSecret,
    beaconValue,
    gameVersion,
  )
  const symbolsSeed = await deriveSymbolsSeed(ticketSeed)
  const symbols = await generateSymbols(symbolsSeed)
  if (symbols.length !== 6) {
    throw new Error('generateSymbols must produce 6 symbols')
  }

  const digest = await sha256(symbolsSeed)
  const expectedResult = await sha256(
    new Uint8Array([...field(digest), ...field(symbols)]),
  )
  const tier = classifyTier(symbols)
  const prizeAmount = prizeAmountForTier(table, tier, priceUsdm)

  // Update PrizeDatum
  const nextFields = [...datum.fields]
  nextFields[7] = BigInt(prizeAmount)
  nextFields[10] = emptyConstr(1) // Revealed
  nextFields[11] = toHex(expectedResult)
  nextFields[12] = BigInt(tier)

  const nextDatum = datumFromFields(nextFields)
  const owner = await lucid.wallet.address()

  // B1PrizePool: deterministic reserve derivation from PrizeDatum's pdPriceUsdm
  const b1ppUtxo = await findB1PrizePoolUtxo(lucid, opts.b1PrizePoolAddress)
  if (!b1ppUtxo) throw new Error('B1PrizePool UTxO not found')

  const b1ppDatum = decodeB1PrizePoolDatum(b1ppUtxo)
  if (!b1ppDatum) throw new Error('B1PrizePool datum not decodable')

  // Build next B1PrizePool datum with deterministic reserve
  const nextB1ppFields = [...b1ppDatum.fields]
  // Deterministic: reserveRelease = priceUsdm (same formula as TicketIssued)
  nextB1ppFields[2] = BigInt((b1ppInt(b1ppDatum, 2) ?? 0) - priceUsdm) // ppUnresolvedReserve
  nextB1ppFields[3] = BigInt((b1ppInt(b1ppDatum, 3) ?? 0) - 1) // ppUnresolvedTicketCount
  nextB1ppFields[1] = BigInt((b1ppInt(b1ppDatum, 1) ?? 0) + prizeAmount) // ppPendingLiabilities
  const nextB1ppDatum = datumFromFields(nextB1ppFields)

  const tx = await lucid
    .newTx()
    // PrizeValidator: spend and update
    .collectFrom([prizeUtxo], revealRedeemer(secretHex))
    .attachSpendingValidator(scripts.prizeValidator as Script)
    // B1PrizePool: spend and update with deterministic priceUsdm
    .collectFrom([b1ppUtxo], b1ppTicketRevealedRedeemer(BigInt(priceUsdm)))
    .attachSpendingValidator(scripts.b1PrizePool as Script)
    // Output: updated PrizeDatum
    .payToContract(
      opts.prizeAddress,
      { inline: Data.to(nextDatum) },
      utxoAssets(prizeUtxo),
    )
    // Output: updated B1PrizePool datum
    .payToContract(
      opts.b1PrizePoolAddress,
      { inline: Data.to(nextB1ppDatum) },
      utxoAssets(b1ppUtxo),
    )
    .addSigner(owner)
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)

  return {
    txHash,
    tier,
    prizeAmount,
    resultHex: toHex(expectedResult),
  }
}

// ---------------------------------------------------------------------------
// Claim — coordinates PrizeValidator + B1PrizePool
// ---------------------------------------------------------------------------

export async function claimPrize(opts: {
  prizeAddress: string
  ticketPolicyId: string
  ticketAssetNameHex: string
  b1PrizePoolAddress: string
  table?: PrizeTable
}): Promise<string> {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  const table = opts.table ?? defaultPrizeTable
  const scripts = buildScriptsFromLucid(lucid, table, ORACLE_PUBLISHER_PKH)

  const prizeUtxo = await findPrizeUtxo(
    lucid,
    opts.prizeAddress,
    opts.ticketPolicyId,
    opts.ticketAssetNameHex,
  )
  if (!prizeUtxo) throw new Error('Prize UTxO not found')

  const ticketUtxo = await findTicketUtxoInWallet(
    lucid,
    opts.ticketPolicyId,
    opts.ticketAssetNameHex,
  )
  if (!ticketUtxo) throw new Error('Ticket NFT not found in wallet')

  const datum = decodePrizeDatum(prizeUtxo)
  if (!datum) throw new Error('PrizeDatum not decodable')

  if (constrIndex(datum.fields[10]) !== 1) {
    throw new Error('Prize not yet Revealed')
  }

  const prizeAmount = integerField(datum.fields[7])
  if (prizeAmount === null || prizeAmount <= 0) {
    throw new Error('PrizeAmount <= 0: losing ticket or invalid payout')
  }

  const expiresAt = integerField(datum.fields[20])
  if (expiresAt === null) {
    throw new Error('pdExpiresAt missing')
  }
  if (Date.now() > expiresAt) {
    throw new Error(
      'Claim window closed. Historical reveal OK; economic claim no.',
    )
  }

  const buyer = await lucid.wallet.address()

  const nextFields = [...datum.fields]
  nextFields[10] = emptyConstr(2) // Claimed
  const nextDatum = datumFromFields(nextFields)

  // B1PrizePool: find and update
  const b1ppUtxo = await findB1PrizePoolUtxo(lucid, opts.b1PrizePoolAddress)
  if (!b1ppUtxo) throw new Error('B1PrizePool UTxO not found')

  const b1ppDatum = decodeB1PrizePoolDatum(b1ppUtxo)
  if (!b1ppDatum) throw new Error('B1PrizePool datum not decodable')

  const pendingLiabilities = b1ppInt(b1ppDatum, 1) ?? 0
  if (prizeAmount > pendingLiabilities) {
    throw new Error('PrizeAmount exceeds pending liabilities')
  }

  // Build next B1PrizePool datum
  const nextB1ppFields = [...b1ppDatum.fields]
  nextB1ppFields[0] = BigInt((b1ppInt(b1ppDatum, 0) ?? 0) - prizeAmount) // ppTotalLiquidity
  nextB1ppFields[1] = BigInt(pendingLiabilities - prizeAmount) // ppPendingLiabilities
  const nextB1ppDatum = datumFromFields(nextB1ppFields)

  const tx = await lucid
    .newTx()
    // PrizeValidator: spend and update to Claimed
    .collectFrom([prizeUtxo], claimRedeemer())
    .attachSpendingValidator(scripts.prizeValidator as Script)
    // B1PrizePool: spend and update
    .collectFrom([b1ppUtxo], b1ppTicketClaimedRedeemer(BigInt(prizeAmount)))
    .attachSpendingValidator(scripts.b1PrizePool as Script)
    // Ticket NFT: spend to prove ownership (NFT returns to buyer, not burned)
    .collectFrom([ticketUtxo])
    // Output: updated PrizeDatum (Claimed)
    .payToContract(
      opts.prizeAddress,
      { inline: Data.to(nextDatum) },
      utxoAssets(prizeUtxo),
    )
    // Output: updated B1PrizePool datum
    .payToContract(
      opts.b1PrizePoolAddress,
      { inline: Data.to(nextB1ppDatum) },
      utxoAssets(b1ppUtxo),
    )
    // Payout to claimant
    .payToAddress(buyer, { lovelace: BigInt(prizeAmount) })
    // Ticket NFT back to buyer
    .payToAddress(buyer, { [opts.ticketPolicyId + opts.ticketAssetNameHex]: 1n })
    .addSigner(buyer)
    .validTo(expiresAt)
    .complete()

  const signed = await lucid.signTx(tx)
  return lucid.submitTx(signed)
}

// ---------------------------------------------------------------------------
// Player secret validation
// ---------------------------------------------------------------------------

export function validatePlayerSecretHex(value: string): Uint8Array {
  const clean = value.startsWith('0x') ? value.slice(2) : value
  if (clean.length !== 64 || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error('playerSecretHex must be exactly 32 bytes')
  }
  return fromHex(clean)
}

export default {
  findPrizeUtxo,
  findB1PrizePoolUtxo,
  findTicketUtxoInWallet,
  syncBeacon,
  revealPrize,
  claimPrize,
  validatePlayerSecretHex,
}
