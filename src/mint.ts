/**
 * Mint seriale + Prize UTxO Pending in una sola tx.
 *
 * La MintPolicy parametrizzata richiede:
 *   1. counterHash
 *   2. prizeHash
 *   3. registryHash
 *   4. salePkh
 *   5. priceLovelace
 *
 * La PrizeValidator parametrizzata richiede:
 *   1. registryHash
 *   2. PrizeTable
 *
 * La transazione di mint:
 *   - consuma il Counter UTxO;
 *   - crea il counter n+1;
 *   - minta esattamente il ticket n;
 *   - paga il prezzo a SALE_ADDRESS;
 *   - legge il BeaconRegistry come reference input;
 *   - crea il Prize UTxO in stato Pending;
 *   - trasferisce il ticket al buyer.
 *
 * Il playerSecret viene generato lato client e NON viene messo on-chain.
 * Viene conservato dal caller per la successiva fase Reveal.
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

/**
 * Default applicativi.
 *
 * Non sono importati da config.ts perché attualmente il repo
 * non li esporta. Devono essere sovrascrivibili tramite opts.
 */
const DEFAULT_NETWORK_ID = 0
const DEFAULT_ROUND_ID = 0
const DEFAULT_GAME_VERSION = 'V1'
const DEFAULT_PRICE_USDM = 2

/**
 * Constr<T> di lucid-cardano richiede esplicitamente il parametro
 * generico nella versione usata dal progetto.
 *
 * I campi di Constr sono Data, quindi convertiamo esplicitamente
 * i valori primitivi con Data.to().
 */
function constr(index: number, fields: unknown[] = []): Data {
  return Data.to(
    new Constr<Data>(
      index,
      fields.map((field) => Data.to(field as any)),
    ),
  ) as Data
}

/**
 * Converte una stringa UTF-8 nel formato hex usato come
 * BuiltinByteString Plutus.
 */
function strToHex(value: string): string {
  return Array.from(new TextEncoder().encode(value))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * BeaconTarget:
 *
 * BeaconTarget
 *   { btNetworkId
 *   , btRound
 *   , btMainchainRef
 *   , btVersion
 *   }
 */
function beaconTargetToData(target: BeaconTarget): Data {
  return constr(0, [
    BigInt(target.networkId),
    BigInt(target.round),
    toHex(target.mainchainRef),
    toHex(target.version),
  ])
}

/**
 * PrizeDatum:
 *
 *  0  pdTicketPolicy
 *  1  pdTicketName
 *  2  pdPlayerCommitment
 *  3  pdPriceUsdm
 *  4  pdCommitment
 *  5  pdGameVersion
 *  6  pdTicketNonce
 *  7  pdPrizeAmount
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
 */
function prizeDatumToData(fields: {
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
}): Data {
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

    // pdResult
    '',

    // pdPrizeTier
    0n,

    // pdBeaconTarget
    beaconTargetToData(fields.target),

    // BeaconStatus = BeaconPending
    constr(0),

    // pdBeaconValue
    '',

    // pdMcHash
    '',

    // pdMateriosContext
    '',
  ])
}

function parseCounterDatum(datum: unknown): number | null {
  if (typeof datum === 'number') {
    return datum
  }

  if (typeof datum === 'bigint') {
    return Number(datum)
  }

  if (typeof datum === 'string' && /^\d+$/.test(datum)) {
    return Number.parseInt(datum, 10)
  }

  if (!datum || typeof datum !== 'object') {
    return null
  }

  const value = datum as Record<string, unknown>

  if ('int' in value) {
    return Number(value.int)
  }

  if ('fields' in value && Array.isArray(value.fields)) {
    const first = value.fields[0]

    if (typeof first === 'number') {
      return first
    }

    if (typeof first === 'bigint') {
      return Number(first)
    }

    if (
      first &&
      typeof first === 'object' &&
      'int' in first
    ) {
      return Number(
        (first as Record<string, unknown>).int,
      )
    }
  }

  return null
}

/**
 * Estrae il round e lo status dal BeaconRegistry datum.
 *
 * BeaconRegistryDatum:
 *   brRound
 *   brTarget
 *   brStatus
 *   brBeaconValue
 *   brMcHash
 *   brMateriosContext
 *   brRelayerPkh
 */
function registryIsPendingForRound(
  datum: unknown,
  roundId: number,
): boolean {
  if (!datum || typeof datum !== 'object') {
    return false
  }

  const value = datum as Record<string, any>
  const fields = Array.isArray(value.fields)
    ? value.fields
    : null

  if (!fields || fields.length < 3) {
    return false
  }

  const roundField = fields[0]

  const round =
    typeof roundField === 'bigint'
      ? Number(roundField)
      : typeof roundField === 'number'
        ? roundField
        : roundField &&
            typeof roundField === 'object' &&
            'int' in roundField
          ? Number(roundField.int)
          : null

  if (round !== roundId) {
    return false
  }

  const status = fields[2]

  const statusIndex =
    status &&
    typeof status === 'object' &&
    'index' in status
      ? Number(status.index)
      : status &&
          typeof status === 'object' &&
          'constr' in status
        ? Number(status.constr)
        : null

  return statusIndex === 0
}

function pickPendingRegistryUtxo(
  utxos: UTxO[],
  roundId: number,
): UTxO {
  const matching = utxos.filter((utxo) =>
    registryIsPendingForRound(utxo.datum, roundId),
  )

  if (matching.length === 1) {
    return matching[0]
  }

  if (matching.length > 1) {
    throw new Error(
      `Più BeaconRegistry Pending trovati per round=${roundId}. ` +
        `Il modello richiede un solo registry UTxO per round.`,
    )
  }

  throw new Error(
    `Nessun BeaconRegistry Pending trovato per round=${roundId}. ` +
      `Il registry deve essere pubblicato prima del mint.`,
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
}

export type MintSerialOptions = {
  saleAddress?: string
  priceLovelace?: number
  priceUsdm?: number

  /**
   * Identità canonica della partita.
   *
   * Questi valori devono corrispondere al BeaconRegistry
   * che verrà successivamente sincronizzato nel Prize UTxO.
   */
  networkId?: number
  roundId?: number
  mainchainRef?: Uint8Array
  gameVersion?: Uint8Array

  /**
   * Funding ADA del Prize UTxO.
   */
  prizeFundingLovelace?: bigint

  /**
   * Importo del premio.
   *
   * Per il modello attuale il payment asset è ADA,
   * quindi il default è uguale al funding iniziale.
   */
  prizeAmount?: bigint

  table?: PrizeTable

  /**
   * Se omesso viene generato casualmente.
   *
   * Il caller DEVE conservarlo per Reveal.
   */
  playerSecret?: Uint8Array

  /**
   * Default = seriale del Counter.
   */
  ticketNonce?: number
}

export async function mintSerialNFT(
  opts: MintSerialOptions = {},
): Promise<MintSerialResult> {
  const lucid = wallet.getLucid()

  if (!lucid) {
    throw new Error('Wallet not connected')
  }

  const saleAddress =
    opts.saleAddress ?? SALE_ADDRESS

  if (!saleAddress) {
    throw new Error('SALE_ADDRESS mancante')
  }

  const priceLovelace =
    opts.priceLovelace ??
    TICKET_PRICE_LOVELACE

  const priceUsdm =
    opts.priceUsdm ??
    DEFAULT_PRICE_USDM

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
    utf8(`pre-rich-round-${roundId}`)

  const table =
    opts.table ??
    defaultPrizeTable

  const prizeFunding =
    opts.prizeFundingLovelace ??
    MIN_ADA_PRIZE

  const prizeAmount =
    opts.prizeAmount ??
    prizeFunding

  /**
   * Applica:
   *
   * MintPolicy:
   *   counterHash
   *   prizeHash
   *   registryHash
   *   salePkh
   *   priceLovelace
   *
   * PrizeValidator:
   *   registryHash
   *   PrizeTable
   */
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

  /**
   * prizeValidator viene costruito da loadValidator e serve
   * per ricavare l'indirizzo del Prize UTxO.
   *
   * Non deve essere attaccato come spending validator durante
   * il mint: il Prize UTxO viene solamente creato.
   */
  void prizeValidator

  if (
    !counterAddress ||
    !registryAddress ||
    !prizeAddress
  ) {
    throw new Error(
      'Impossibile derivare gli script address da Lucid',
    )
  }

  // ------------------------------------------------------------
  // Counter
  // ------------------------------------------------------------

  const counterUtxos =
    await lucid.utxosAt(counterAddress)

  if (counterUtxos.length === 0) {
    throw new Error(
      `Nessun Counter UTxO a ${counterAddress}`,
    )
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
      counterUtxo.datum ??
      (await lucid.datumOf(counterUtxo))

    n = parseCounterDatum(rawDatum)
  } catch (error) {
    console.error(
      'Errore nella lettura del Counter datum:',
      error,
    )
  }

  if (n === null || !Number.isInteger(n) || n < 0) {
    throw new Error(
      'Counter datum non leggibile: atteso Integer non negativo',
    )
  }

  const tokenNameAscii = String(n)
  const tokenNameHex = strToHex(tokenNameAscii)

  const ticketNonce =
    opts.ticketNonce ?? n

  // ------------------------------------------------------------
  // BeaconTarget
  // ------------------------------------------------------------

  const target: BeaconTarget = {
    networkId,
    round: roundId,
    mainchainRef,
    version: gameVersion,
  }

  // ------------------------------------------------------------
  // BeaconRegistry reference input
  // ------------------------------------------------------------

  const registryUtxos =
    await lucid.utxosAt(registryAddress)

  if (registryUtxos.length === 0) {
    throw new Error(
      `Nessun BeaconRegistry UTxO a ${registryAddress}`,
    )
  }

  const registryUtxo =
    pickPendingRegistryUtxo(
      registryUtxos,
      roundId,
    )

  // ------------------------------------------------------------
  // Player secret / commitments
  // ------------------------------------------------------------

  const playerSecret =
    opts.playerSecret ??
    randomPlayerSecret(32)

  if (playerSecret.length !== 32) {
    throw new Error(
      'playerSecret deve essere esattamente 32 bytes',
    )
  }

  const pCommit =
    await playerCommitment(
      roundId,
      ticketNonce,
      playerSecret,
    )

  const ticketIdBytes =
    new TextEncoder().encode(tokenNameAscii)

  const targetEncoding =
    encodeBeaconTarget(target)

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

  // ------------------------------------------------------------
  // PrizeDatum Pending
  // ------------------------------------------------------------

  const prizeDatum =
    prizeDatumToData({
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
    })

  // ------------------------------------------------------------
  // Ticket NFT
  // ------------------------------------------------------------

  const unit =
    ticketPolicyId + tokenNameHex

  const mintAssets: Record<string, bigint> = {
    [unit]: 1n,
  }

  const buyer =
    await lucid.wallet.address()

  // ------------------------------------------------------------
  // Transaction
  // ------------------------------------------------------------

  const tx = await lucid
    .newTx()

    // Counter
    .collectFrom(
      [counterUtxo],
      Data.void(),
    )
    .attachSpendingValidator(
      counterValidator,
    )

    // Ticket mint
    .mintAssets(
      mintAssets,
      Data.void(),
    )
    .attachMintingPolicy(
      mintPolicy as Script,
    )

    // BeaconRegistry come reference input.
    //
    // Non viene consumato dal mint.
    .readFrom([
      registryUtxo,
    ])

    // Sale payment
    .payToAddress(
      saleAddress,
      {
        lovelace:
          BigInt(priceLovelace),
      },
    )

    // Counter n+1
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

    // Prize UTxO Pending
    .payToContract(
      prizeAddress,
      {
        inline:
          prizeDatum,
      },
      {
        lovelace:
          prizeFunding,
      },
    )

    // Ticket al buyer
    .payToAddress(
      buyer,
      {
        [unit]: 1n,
      },
    )

    .addSigner(buyer)

    .complete()

  const signed =
    await lucid.signTx(tx)

  const txHash =
    await lucid.submitTx(signed)

  return {
    txHash,
    tokenName: tokenNameAscii,
    assetId: unit,
    policyId: ticketPolicyId,
    ticketNonce,
    playerSecretHex:
      toHex(playerSecret),
    playerCommitmentHex,
    commitmentHex,
    prizeAddress,
    counterAddress,
    registryAddress,
  }
}

export default {
  mintSerialNFT,
}