/**
 * Carica gli script Plutus e applica i parametri alle factory.
 *
 * MintPolicy:
 *   ScriptHash counter
 *   -> ScriptHash prize
 *   -> ScriptHash registry
 *   -> PubKeyHash sale
 *   -> Integer priceLovelace
 *
 * PrizeValidator:
 *   ScriptHash registry
 *   -> PrizeTable
 */

import {
  applyParamsToScript,
  Constr,
  Data,
  type Script,
} from 'lucid-cardano'

import treasuryJson from './plutusScripts/treasury.plutus.json'
import prizeValidatorFactoryJson from './plutusScripts/prizeValidatorFactory.plutus.json'
import counterValidatorJson from './plutusScripts/counterValidator.plutus.json'
import mintPolicyFactoryJson from './plutusScripts/mintPolicyFactory.plutus.json'
import prizePoolJson from './plutusScripts/prizePool.plutus.json'
import beaconRegistryJson from './plutusScripts/beaconRegistry.plutus.json'

import { defaultPrizeTable, type PrizeTable } from './gameRules'

type ScriptEnvelope = {
  type: string
  description?: string
  cborHex: string
}

function toLucidScript(env: ScriptEnvelope): Script {
  return {
    type: 'PlutusV2',
    script: env.cborHex,
  }
}

const treasuryEnv = treasuryJson as ScriptEnvelope
const prizeFactoryEnv = prizeValidatorFactoryJson as ScriptEnvelope
const counterEnv = counterValidatorJson as ScriptEnvelope
const mintFactoryEnv = mintPolicyFactoryJson as ScriptEnvelope
const prizePoolEnv = prizePoolJson as ScriptEnvelope
const beaconRegistryEnv = beaconRegistryJson as ScriptEnvelope

/** Script senza parametri */
export const treasuryValidator = toLucidScript(treasuryEnv)
export const counterValidator = toLucidScript(counterEnv)
export const prizePoolValidator = toLucidScript(prizePoolEnv)
export const beaconRegistryValidator = toLucidScript(beaconRegistryEnv)

/** Factory grezze */
export const mintPolicyFactory = toLucidScript(mintFactoryEnv)
export const prizeValidatorFactory = toLucidScript(prizeFactoryEnv)

/**
 * @deprecated Preferisci buildMintPolicy(...).
 * La factory non è parametrizzata e non deve essere usata
 * direttamente per mint reali.
 */
export const mintPolicyScript = mintPolicyFactory

/**
 * @deprecated Preferisci buildPrizeValidator(...).
 * La factory non è parametrizzata.
 */
export const prizeValidator = prizeValidatorFactory

/**
 * PrizeTable Plutus:
 * Constr 0 [tier1, tier2, tier3, tier4, tier5]
 *
 * Deve corrispondere alla rappresentazione Data del record
 * PrizeTable utilizzato dal contratto Plutus.
 */
export function prizeTableToData(
  table: PrizeTable = defaultPrizeTable
): Data {
  return new Constr(0, [
    BigInt(table.tier1),
    BigInt(table.tier2),
    BigInt(table.tier3),
    BigInt(table.tier4),
    BigInt(table.tier5),
  ])
}

/**
 * Applica i 5 parametri alla MintPolicy factory.
 *
 * Ordine richiesto dal contratto Plutus:
 *
 *   counterHash
 *   prizeHash
 *   registryHash
 *   salePkh
 *   priceLovelace
 */
export function buildMintPolicy(
  counterScriptHashHex: string,
  prizeScriptHashHex: string,
  registryScriptHashHex: string,
  salePkhHex: string,
  priceLovelace: bigint | number
): Script {
  const applied = applyParamsToScript(mintFactoryEnv.cborHex, [
    counterScriptHashHex,
    prizeScriptHashHex,
    registryScriptHashHex,
    salePkhHex,
    BigInt(priceLovelace),
  ])

  return {
    type: 'PlutusV2',
    script: applied,
  }
}

/**
 * Applica i 2 parametri alla PrizeValidator factory.
 *
 * Ordine richiesto dal contratto Plutus:
 *
 *   registryHash
 *   PrizeTable
 */
export function buildPrizeValidator(
  registryScriptHashHex: string,
  table: PrizeTable = defaultPrizeTable
): Script {
  const applied = applyParamsToScript(prizeFactoryEnv.cborHex, [
    registryScriptHashHex,
    prizeTableToData(table),
  ])

  return {
    type: 'PlutusV2',
    script: applied,
  }
}

/**
 * Costruisce tutti gli script parametrizzati a partire da una
 * istanza Lucid e dall'indirizzo della sale.
 *
 * Ordine:
 *
 *   1. hash del CounterValidator
 *   2. hash del BeaconRegistryValidator
 *   3. PrizeValidator(registryHash, PrizeTable)
 *   4. hash del PrizeValidator parametrizzato
 *   5. MintPolicy(counterHash, prizeHash, registryHash, salePkh, price)
 */
export function buildScriptsFromLucid(
  lucid: {
    utils: {
      validatorToScriptHash: (script: Script) => string
      getAddressDetails: (address: string) => {
        paymentCredential?: {
          hash: string
        } | null
      }
      mintingPolicyToId?: (script: Script) => string
      validatorToAddress?: (script: Script) => string
    }
  },
  saleAddress: string,
  priceLovelace: bigint | number,
  table: PrizeTable = defaultPrizeTable
) {
  const counterHash =
    lucid.utils.validatorToScriptHash(counterValidator)

  const registryHash =
    lucid.utils.validatorToScriptHash(beaconRegistryValidator)

  const details =
    lucid.utils.getAddressDetails(saleAddress)

  const salePkh =
    details.paymentCredential?.hash

  if (!salePkh) {
    throw new Error(
      'SALE_ADDRESS senza payment credential (serve un indirizzo con payment key)'
    )
  }

  /*
   * Il PrizeValidator deve essere parametrizzato prima della
   * MintPolicy, perché la MintPolicy riceve il suo ScriptHash.
   */
  const prizeValidator =
    buildPrizeValidator(
      registryHash,
      table
    )

  const prizeHash =
    lucid.utils.validatorToScriptHash(prizeValidator)

  /*
   * Ora possiamo applicare tutti e 5 i parametri alla MintPolicy.
   */
  const mintPolicy =
    buildMintPolicy(
      counterHash,
      prizeHash,
      registryHash,
      salePkh,
      priceLovelace
    )

  const ticketPolicyId =
    typeof lucid.utils.mintingPolicyToId === 'function'
      ? lucid.utils.mintingPolicyToId(mintPolicy)
      : lucid.utils.validatorToScriptHash(mintPolicy)

  const counterAddress =
    typeof lucid.utils.validatorToAddress === 'function'
      ? lucid.utils.validatorToAddress(counterValidator)
      : undefined

  const registryAddress =
    typeof lucid.utils.validatorToAddress === 'function'
      ? lucid.utils.validatorToAddress(beaconRegistryValidator)
      : undefined

  const prizeAddress =
    typeof lucid.utils.validatorToAddress === 'function'
      ? lucid.utils.validatorToAddress(prizeValidator)
      : undefined

  return {
    counterHash,
    registryHash,
    prizeHash,
    salePkh,

    mintPolicy,
    prizeValidator,

    ticketPolicyId,

    counterAddress,
    registryAddress,
    prizeAddress,
  }
}

export default {
  treasuryValidator,
  counterValidator,
  prizePoolValidator,
  beaconRegistryValidator,

  mintPolicyFactory,
  prizeValidatorFactory,

  buildMintPolicy,
  buildPrizeValidator,
  buildScriptsFromLucid,
  prizeTableToData,
}