/**
 * Mint seriale + Prize UTxO Pending + Treasury payment +
 * B1PrizePool TicketIssued in UNA SOLA transazione.
 *
 * B1 / C-02:
 *
 *   Buyer
 *     |
 *     +---- payment ----------------------> Treasury
 *     |
 *     +---- Ticket NFT -------------------> Buyer
 *
 *   Counter
 *     n ----------------------------------> n + 1
 *
 *   PrizeValidator
 *     (no input) --------------------------> Pending PrizeDatum
 *
 *   B1PrizePool
 *     state -------------------------------> state'
 *       unresolvedReserve += priceUsdm
 *       unresolvedTicketCount += 1
 *
 * The MintPolicy and B1PrizePool validator both enforce
 * the atomic sale invariant on-chain.
 *
 * PrizeDatum:
 *   pdPrizePoolHash binds the ticket to the exact B1PrizePool
 *   instance used by this transaction.
 *
 * Current B1 launch settlement:
 *   1 ADA = 1,000,000 lovelace
 *
 * This is the current Preprod settlement amount and is NOT the
 * USDM economic valuation. The canonical economic price remains
 * pdPriceUsdm.
 */

import {
  Constr,
  Data,
  type Script,
  type UTxO,
} from 'lucid-cardano'

import wallet from './wallet'

import {
  buildScriptsFromLucid,
  counterValidator,
} from './loadValidator'

import {
  ORACLE_PUBLISHER_PKH,
  RELAYER_PKH,
  TICKET_PAYMENT_LOVELACE,
  TREASURY_ADDRESS,
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

/**
 * 1 USDM = 100 sub-units.
 */
const DEFAULT_PRICE_USDM = 100

// ============================================================
// Generic Data helpers
// ============================================================

function constr(
  index: number,
  fields: Data[] = [],
): Constr<Data> {
  return new Constr(index, fields)
}

function strToHex(value: string): string {
  return Array.from(
    new TextEncoder().encode(value),
  )
    .map((byte) =>
      byte
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
}

function beaconTargetToConstr(
  target: BeaconTarget,
): Constr<Data> {
  return constr(0, [
    BigInt(target.networkId),
    BigInt(target.round),
    toHex(target.mainchainRef),
    toHex(target.version),
  ])
}

function parseData(raw: unknown): unknown {
  if (raw == null) {
    return null
  }

  if (typeof raw === 'string') {
    try {
      return Data.from(raw)
    } catch {
      return null
    }
  }

  return raw
}

function fieldsOf(raw: unknown): unknown[] | null {
  const parsed = parseData(raw)

  if (
    !parsed ||
    typeof parsed !== 'object'
  ) {
    return null
  }

  const value =
    parsed as {
      fields?: unknown[]
    }

  return Array.isArray(value.fields)
    ? value.fields
    : null
}

function integerFromData(
  value: unknown,
): bigint | null {
  if (typeof value === 'bigint') {
    return value
  }

  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      return null
    }

    return BigInt(value)
  }

  if (
    value &&
    typeof value === 'object' &&
    'int' in value
  ) {
    try {
      return BigInt(
        String(
          (value as {
            int: number | bigint | string
          }).int,
        ),
      )
    } catch {
      return null
    }
  }

  return null
}

// ============================================================
// Counter
// ============================================================

function parseCounterDatum(
  datum: unknown,
): number | null {
  const direct =
    integerFromData(datum)

  if (direct !== null) {
    const value =
      Number(direct)

    return Number.isSafeInteger(value)
      ? value
      : null
  }

  const fields =
    fieldsOf(datum)

  if (!fields || fields.length < 1) {
    return null
  }

  const first =
    integerFromData(fields[0])

  if (first === null) {
    return null
  }

  const value =
    Number(first)

  return Number.isSafeInteger(value)
    ? value
    : null
}

// ============================================================
// Beacon Registry
// ============================================================

function constrIndex(
  value: unknown,
): number | null {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return null
  }

  const candidate =
    value as {
      index?: unknown
      constr?: unknown
    }

  if (
    candidate.index !== undefined
  ) {
    const index =
      Number(candidate.index)

    return Number.isInteger(index)
      ? index
      : null
  }

  if (
    candidate.constr !== undefined
  ) {
    const index =
      Number(candidate.constr)

    return Number.isInteger(index)
      ? index
      : null
  }

  return null
}

function registryIsPendingForRound(
  datum: unknown,
  roundId: number,
): boolean {
  const fields =
    fieldsOf(datum)

  if (!fields || fields.length < 3) {
    return false
  }

  const roundValue =
    integerFromData(fields[0])

  if (roundValue === null) {
    return false
  }

  if (
    Number(roundValue) !== roundId
  ) {
    return false
  }

  const status =
    constrIndex(fields[2])

  return status === 0
}

function pickPendingRegistryUtxo(
  utxos: UTxO[],
  roundId: number,
): UTxO {
  const matching =
    utxos.filter((utxo) =>
      registryIsPendingForRound(
        utxo.datum,
        roundId,
      ),
    )

  if (matching.length === 1) {
    return matching[0]
  }

  if (matching.length > 1) {
    throw new Error(
      `Multiple BeaconRegistry Pending for round=${roundId}. Expected exactly one.`,
    )
  }

  throw new Error(
    `No BeaconRegistry Pending for round=${roundId}. Publish registry before mint.`,
  )
}

// ============================================================
// B1PrizePool
// ============================================================

type B1PrizePoolState = {
  fields: unknown[]
}

function decodeB1PrizePoolDatum(
  utxo: UTxO,
): B1PrizePoolState | null {
  const fields =
    fieldsOf(utxo.datum)

  if (
    !fields ||
    fields.length !== 8
  ) {
    return null
  }

  return {
    fields,
  }
}

function poolFieldInt(
  state: B1PrizePoolState,
  index: number,
): bigint {
  const value =
    integerFromData(
      state.fields[index],
    )

  if (value === null) {
    throw new Error(
      `B1PrizePool datum field ${index} is not an integer`,
    )
  }

  return value
}

function buildNextPoolDatum(
  state: B1PrizePoolState,
  priceUsdm: number,
): Constr<Data> {
  const fields =
    [...state.fields] as Data[]

  /*
   * B1PrizePoolDatum fields:
   *
   * 0 ppTotalLiquidity
   * 1 ppPendingLiabilities
   * 2 ppUnresolvedReserve
   * 3 ppUnresolvedTicketCount
   * 4 ppLockedJackpot
   * 5 ppJackpotThreshold
   * 6 ppSuspendedClasses
   * 7 ppPrizeHash
   */
  fields[2] =
    poolFieldInt(state, 2)
      + BigInt(priceUsdm)

  fields[3] =
    poolFieldInt(state, 3)
      + 1n

  return constr(
    0,
    fields,
  )
}

async function findSingletonB1PrizePoolUtxo(
  lucid: any,
  address: string,
): Promise<{
  utxo: UTxO
  state: B1PrizePoolState
}> {
  const utxos =
    await lucid.utxosAt(address)

  const matches =
    utxos
      .map((utxo: UTxO) => {
        const state =
          decodeB1PrizePoolDatum(utxo)

        return state
          ? { utxo, state }
          : null
      })
      .filter(
        (
          value:
            | {
                utxo: UTxO
                state: B1PrizePoolState
              }
            | null,
        ): value is {
          utxo: UTxO
          state: B1PrizePoolState
        } => value !== null,
      )

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly 1 valid B1PrizePool UTxO, found ${matches.length}`,
    )
  }

  return matches[0]
}

// ============================================================
// Treasury
// ============================================================

async function getTreasuryDatum(
  lucid: any,
  treasuryAddress: string,
): Promise<Data> {
  const utxos =
    await lucid.utxosAt(
      treasuryAddress,
    )

  const candidates =
    utxos.filter(
      (utxo: UTxO) =>
        utxo.datum != null,
    )

  if (candidates.length === 0) {
    throw new Error(
      'No existing Treasury UTxO with datum found. ' +
        'The first Treasury deposit requires a bootstrap Treasury UTxO with its canonical datum.',
    )
  }

  const datum =
    candidates[0].datum

  if (typeof datum === 'string') {
    return Data.from(datum)
  }

  return datum as Data
}

// ============================================================
// PrizeDatum
// ============================================================

/**
 * PrizeDatum fields 0..20 (Types.hs):
 *
 *  0 pdTicketPolicy
 *  1 pdTicketName
 *  2 pdPlayerCommitment
 *  3 pdPriceUsdm
 *  4 pdCommitment
 *  5 pdGameVersion
 *  6 pdTicketNonce
 *  7 pdPrizeAmount
 *  8 pdPaymentPolicy
 *  9 pdPaymentName
 * 10 pdStatus
 * 11 pdResult
 * 12 pdPrizeTier
 * 13 pdBeaconTarget
 * 14 pdBeaconStatus
 * 15 pdBeaconValue
 * 16 pdMcHash
 * 17 pdMateriosContext
 * 18 pdPrizePoolHash
 * 19 pdIssuedAt
 * 20 pdExpiresAt
 */
function buildPrizeDatumConstr(
  fields: {
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
    prizePoolHashHex: string
    issuedAt: bigint
    expiresAt: bigint
  },
): Constr<Data> {
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

    // PrizeStatus = Pending
    constr(0),

    // Empty result
    '',

    // Tier = 0
    0n,

    beaconTargetToConstr(
      fields.target,
    ),

    // BeaconStatus = BeaconPending
    constr(0),

    // Empty beacon value
    '',

    // Empty MC hash
    '',

    // Empty Materios context
    '',

    // pdPrizePoolHash
    fields.prizePoolHashHex,

    // issuedAt
    fields.issuedAt,

    // expiresAt
    fields.expiresAt,
  ])
}

// ============================================================
// Result types
// ============================================================

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

// ============================================================
// Mint
// ============================================================

export async function mintSerialNFT(
  opts: MintSerialOptions = {},
): Promise<MintSerialResult> {
  const lucid =
    wallet.getLucid()

  if (!lucid) {
    throw new Error(
      'Wallet not connected',
    )
  }

  const priceUsdm =
    opts.priceUsdm ??
    DEFAULT_PRICE_USDM

  if (
    !Number.isInteger(priceUsdm) ||
    priceUsdm <= 0
  ) {
    throw new Error(
      'priceUsdm must be a positive integer',
    )
  }

  const networkId =
    opts.networkId ??
    DEFAULT_NETWORK_ID

  const roundId =
    opts.roundId ??
    DEFAULT_ROUND_ID

  const gameVersion =
    opts.gameVersion ??
    utf8(DEFAULT_GAME_VERSION)

  const mainchainRef =
    opts.mainchainRef ??
    utf8(
      `pre-rich-round-${roundId}`,
    )

  const table =
    opts.table ??
    defaultPrizeTable

  const prizeFunding =
    opts.prizeFundingLovelace ??
    MIN_ADA_PRIZE

  const prizeAmount =
    opts.prizeAmount ??
    prizeFunding

  if (prizeFunding <= 0n) {
    throw new Error(
      'prizeFundingLovelace must be positive',
    )
  }

  if (prizeAmount < 0n) {
    throw new Error(
      'prizeAmount cannot be negative',
    )
  }

  // ----------------------------------------------------------
  // Build complete script topology
  // ----------------------------------------------------------

  const scripts =
    buildScriptsFromLucid(
      lucid,
      table,
      ORACLE_PUBLISHER_PKH,
    )

  const {
    mintPolicy,
    prizeValidator,
    ticketPolicyId,
    counterAddress,
    registryAddress,
    prizeAddress,
    b1PrizePoolAddress,
    b1PrizePool,
    b1PrizePoolHash,
    treasuryAddress: derivedTreasuryAddress,
  } = scripts

  void prizeValidator

  if (
    !counterAddress ||
    !registryAddress ||
    !prizeAddress ||
    !b1PrizePoolAddress
  ) {
    throw new Error(
      'Cannot derive required script addresses from Lucid',
    )
  }

  // ----------------------------------------------------------
  // Counter
  // ----------------------------------------------------------

  const counterUtxos =
    await lucid.utxosAt(
      counterAddress,
    )

  if (counterUtxos.length === 0) {
    throw new Error(
      `No Counter UTxO at ${counterAddress}`,
    )
  }

  if (counterUtxos.length !== 1) {
    throw new Error(
      `Expected exactly 1 Counter UTxO, found ${counterUtxos.length}`,
    )
  }

  const counterUtxo =
    counterUtxos[0]

  let n: number | null = null

  try {
    const rawDatum =
      counterUtxo.datum ??
      (await lucid.datumOf(
        counterUtxo,
      ))

    n =
      parseCounterDatum(
        rawDatum,
      )
  } catch (error) {
    console.error(
      'Error reading Counter datum:',
      error,
    )
  }

  if (
    n === null ||
    !Number.isInteger(n) ||
    n < 0
  ) {
    throw new Error(
      'Counter datum unreadable',
    )
  }

  // ----------------------------------------------------------
  // Ticket identity
  // ----------------------------------------------------------

  const tokenNameAscii =
    String(n)

  const tokenNameHex =
    strToHex(
      tokenNameAscii,
    )

  const ticketNonce =
    opts.ticketNonce ?? n

  if (
    !Number.isInteger(ticketNonce) ||
    ticketNonce < 0
  ) {
    throw new Error(
      'ticketNonce must be a non-negative integer',
    )
  }

  const target: BeaconTarget = {
    networkId,
    round: roundId,
    mainchainRef,
    version: gameVersion,
  }

  // ----------------------------------------------------------
  // Beacon Registry
  // ----------------------------------------------------------

  const registryUtxos =
    await lucid.utxosAt(
      registryAddress,
    )

  if (registryUtxos.length === 0) {
    throw new Error(
      `No BeaconRegistry UTxO at ${registryAddress}`,
    )
  }

  const registryUtxo =
    pickPendingRegistryUtxo(
      registryUtxos,
      roundId,
    )

  if (RELAYER_PKH) {
    const registryFields =
      fieldsOf(
        registryUtxo.datum,
      )

    const foundRelayerPkh =
      registryFields?.[6] ?? null

    if (
      !foundRelayerPkh ||
      String(foundRelayerPkh).toLowerCase() !==
        RELAYER_PKH.toLowerCase()
    ) {
      throw new Error(
        `BeaconRegistry round=${roundId}: unexpected relayerPkh (expected ${RELAYER_PKH})`,
      )
    }
  } else {
    console.warn(
      'RELAYER_PKH not configured: relayer binding is not checked client-side.',
    )
  }

  // ----------------------------------------------------------
  // Player commitment
  // ----------------------------------------------------------

  const playerSecret =
    opts.playerSecret ??
    randomPlayerSecret(32)

  if (
    playerSecret.length !== 32
  ) {
    throw new Error(
      'playerSecret must be exactly 32 bytes',
    )
  }

  const pCommit =
    await playerCommitment(
      roundId,
      ticketNonce,
      playerSecret,
    )

  const ticketIdBytes =
    new TextEncoder().encode(
      tokenNameAscii,
    )

  const targetEncoding =
    encodeBeaconTarget(
      target,
    )

  const commitment =
    await ticketCommitment(
      ticketIdBytes,
      pCommit,
      gameVersion,
      ticketNonce,
      priceUsdm,
      targetEncoding,
    )

  const playerCommitmentHex =
    toHex(pCommit)

  const commitmentHex =
    toHex(commitment)

  const gameVersionHex =
    toHex(gameVersion)

  // ----------------------------------------------------------
  // Issuance timestamps
  // ----------------------------------------------------------

  const issuedAtMs =
    BigInt(Date.now())

  const expiresAtMs =
    issuedAtMs +
    365n * MS_PER_DAY

  // ----------------------------------------------------------
  // PrizeDatum
  // ----------------------------------------------------------

  const prizeDatumConstr =
    buildPrizeDatumConstr({
      ticketPolicyHex:
        ticketPolicyId,

      ticketNameHex:
        tokenNameHex,

      playerCommitmentHex,

      priceUsdm,

      commitmentHex,

      gameVersionHex,

      ticketNonce,

      prizeAmount,

      paymentPolicyHex:
        '',

      paymentNameHex:
        '',

      target,

      prizePoolHashHex:
        b1PrizePoolHash,

      issuedAt:
        issuedAtMs,

      expiresAt:
        expiresAtMs,
    })

  // ----------------------------------------------------------
  // Ticket asset
  // ----------------------------------------------------------

  const unit =
    ticketPolicyId +
    tokenNameHex

  const mintAssets:
    Record<string, bigint> = {
      [unit]: 1n,
    }

  const buyer =
    await lucid.wallet.address()

  // ----------------------------------------------------------
  // B1PrizePool singleton
  // ----------------------------------------------------------

  const pool =
    await findSingletonB1PrizePoolUtxo(
      lucid,
      b1PrizePoolAddress,
    )

  const nextPoolDatum =
    buildNextPoolDatum(
      pool.state,
      priceUsdm,
    )

  // ----------------------------------------------------------
  // Treasury
  // ----------------------------------------------------------

  const treasuryAddress =
    TREASURY_ADDRESS ||
    derivedTreasuryAddress

  if (!treasuryAddress) {
    throw new Error(
      'Treasury address not configured',
    )
  }

  const treasuryDatum =
    await getTreasuryDatum(
      lucid,
      treasuryAddress,
    )

  // ----------------------------------------------------------
  // C-02 atomic sale transaction
  // ----------------------------------------------------------

  /*
   * The SAME transaction contains:
   *
   *   - Counter spend
   *   - Ticket mint
   *   - PrizePool spend
   *   - Treasury payment
   *   - Counter continuation
   *   - PrizeDatum creation
   *   - PrizePool continuation
   *   - Ticket delivery
   *
   * MintPolicy checks Treasury + PrizePool.
   * B1PrizePool checks TicketIssued.
   */

  const tx =
    await lucid
      .newTx()

      // ------------------------------------------------------
      // Counter: n -> n + 1
      // ------------------------------------------------------

      .collectFrom(
        [counterUtxo],
        Data.void(),
      )

      .attachSpendingValidator(
        counterValidator,
      )

      // ------------------------------------------------------
      // Ticket NFT mint
      // ------------------------------------------------------

      .mintAssets(
        mintAssets,
        Data.void(),
      )

      .attachMintingPolicy(
        mintPolicy as Script,
      )

      // ------------------------------------------------------
      // B1PrizePool TicketIssued(priceUsdm)
      //
      // Constructor indices:
      //   FundTreasury    = 0
      //   TicketIssued   = 1
      //   TicketRevealed = 2
      //   TicketClaimed  = 3
      //   TicketExpired  = 4
      // ------------------------------------------------------

      .collectFrom(
        [pool.utxo],
        constr(1, [
          BigInt(priceUsdm),
        ]),
      )

      .attachSpendingValidator(
        b1PrizePool as Script,
      )

      // ------------------------------------------------------
      // BeaconRegistry reference input
      // ------------------------------------------------------

      .readFrom(
        [registryUtxo],
      )

      // ------------------------------------------------------
      // Counter continuation
      // ------------------------------------------------------

      .payToContract(
        counterAddress,
        {
          inline:
            Data.to(
              BigInt(n + 1),
            ),
        },
        {
          lovelace:
            MIN_ADA_COUNTER,
        },
      )

      // ------------------------------------------------------
      // Prize Pending output
      // ------------------------------------------------------

      .payToContract(
        prizeAddress,
        {
          inline:
            Data.to(
              prizeDatumConstr,
            ),
        },
        {
          lovelace:
            prizeFunding,
        },
      )

      // ------------------------------------------------------
      // B1PrizePool continuation
      //
      // Physical Value remains unchanged.
      //
      // Accounting:
      //   unresolvedReserve += priceUsdm
      //   unresolvedTicketCount += 1
      // ------------------------------------------------------

      .payToContract(
        b1PrizePoolAddress,
        {
          inline:
            Data.to(
              nextPoolDatum,
            ),
        },
        pool.utxo.assets,
      )

      // ------------------------------------------------------
      // Treasury payment
      //
      // Current B1 Preprod settlement:
      //   1 ADA = 1,000,000 lovelace
      //
      // MintPolicy requires this exact Treasury-script
      // output in the SAME transaction.
      // ------------------------------------------------------

      .payToContract(
        treasuryAddress,
        {
          inline:
            treasuryDatum,
        },
        {
          lovelace:
            BigInt(
              TICKET_PAYMENT_LOVELACE,
            ),
        },
      )

      // ------------------------------------------------------
      // Ticket delivery
      // ------------------------------------------------------

      .payToAddress(
        buyer,
        {
          [unit]: 1n,
        },
      )

      .addSigner(buyer)

      .complete()

  // ----------------------------------------------------------
  // Sign + submit
  // ----------------------------------------------------------

  const signed =
    await lucid.signTx(
      tx,
    )

  const txHash =
    await lucid.submitTx(
      signed,
    )

  // ----------------------------------------------------------
  // Result
  // ----------------------------------------------------------

  return {
    txHash,

    tokenName:
      tokenNameAscii,

    assetId:
      unit,

    policyId:
      ticketPolicyId,

    ticketNonce,

    playerSecretHex:
      toHex(
        playerSecret,
      ),

    playerCommitmentHex,

    commitmentHex,

    prizeAddress,

    counterAddress,

    registryAddress,

    issuedAt:
      Number(
        issuedAtMs,
      ),

    expiresAt:
      Number(
        expiresAtMs,
      ),
  }
}

export default {
  mintSerialNFT,
}