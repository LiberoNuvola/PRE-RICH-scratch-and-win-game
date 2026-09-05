/**
 * Carica gli script Plutus e applica i parametri alle factory.
 *
 * B1 architecture:
 *
 * MintPolicy:
 *   ScriptHash counter
 *   -> ScriptHash prize
 *   -> ScriptHash registry
 *   -> ScriptHash treasury
 *   -> ScriptHash b1PrizePool
 *
 * PrizeValidator:
 *   ScriptHash registry
 *   -> PrizeTable
 *   -> PubKeyHash oraclePublisher
 *
 * B1PrizePool:
 *   ScriptHash prize
 *   -> PubKeyHash oraclePublisher
 *
 * Nessuna dipendenza circolare tra PrizeValidator e B1PrizePool:
 * il PrizeValidator usa pdPrizePoolHash dal PrizeDatum;
 * il B1PrizePool riceve direttamente il prizeHash del PrizeValidator.
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
import b1PrizePoolFactoryJson from './plutusScripts/b1PrizePoolFactory.plutus.json'
import beaconRegistryJson from './plutusScripts/beaconRegistry.plutus.json'

import { defaultPrizeTable, type PrizeTable } from './gameRules'
import { B1_POOL_TOKEN_POLICY_ID, B1_POOL_TOKEN_NAME_HEX } from './config'

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
const b1PrizePoolFactoryEnv = b1PrizePoolFactoryJson as ScriptEnvelope
const beaconRegistryEnv = beaconRegistryJson as ScriptEnvelope

/** Script senza parametri */
export const treasuryValidator = toLucidScript(treasuryEnv)
export const counterValidator = toLucidScript(counterEnv)
export const beaconRegistryValidator = toLucidScript(beaconRegistryEnv)

/** Factory grezze */
export const mintPolicyFactory = toLucidScript(mintFactoryEnv)
export const prizeValidatorFactory = toLucidScript(prizeFactoryEnv)
export const b1PrizePoolFactory = toLucidScript(b1PrizePoolFactoryEnv)

/**
 * @deprecated Preferisci buildMintPolicy(...).
 */
export const mintPolicyScript = mintPolicyFactory

/**
 * @deprecated Preferisci buildPrizeValidator(...).
 */
export const prizeValidator = prizeValidatorFactory

/**
 * PrizeTable Plutus:
 * Constr 0 [tier1, tier2, tier3, tier4, tier5]
 */
export function prizeTableToData(
  table: PrizeTable = defaultPrizeTable,
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
 * Ordine:
 *   1. counterHash
 *   2. prizeHash
 *   3. registryHash
 *   4. treasuryHash
 *   5. b1PrizePoolHash
 */
export function buildMintPolicy(
  counterScriptHashHex: string,
  prizeScriptHashHex: string,
  registryScriptHashHex: string,
  treasuryScriptHashHex: string,
  b1PrizePoolScriptHashHex: string,
): Script {
  const applied = applyParamsToScript(mintFactoryEnv.cborHex, [
    counterScriptHashHex,
    prizeScriptHashHex,
    registryScriptHashHex,
    treasuryScriptHashHex,
    b1PrizePoolScriptHashHex,
  ])

  return {
    type: 'PlutusV2',
    script: applied,
  }
}

/**
 * Applica i 3 parametri alla PrizeValidator factory.
 *
 * Ordine:
 *   1. registryHash
 *   2. PrizeTable
 *   3. oraclePublisher
 *
 * NON riceve b1PrizePoolHash.
 */
export function buildPrizeValidator(
  registryScriptHashHex: string,
  table: PrizeTable = defaultPrizeTable,
  oraclePublisherPkhHex: string,
): Script {
  const applied = applyParamsToScript(prizeFactoryEnv.cborHex, [
    registryScriptHashHex,
    prizeTableToData(table),
    oraclePublisherPkhHex,
  ])

  return {
    type: 'PlutusV2',
    script: applied,
  }
}

/**
 * Applica i 2 parametri alla B1PrizePool factory.
 *
 * Ordine:
 *   1. prizeHash
 *   2. oraclePublisher
 */
export function buildB1PrizePool(
  prizeScriptHashHex: string,
  oraclePublisherPkhHex: string,
  poolTokenPolicyId: string = B1_POOL_TOKEN_POLICY_ID,
  poolTokenNameHex: string = B1_POOL_TOKEN_NAME_HEX,
): Script {
  if (!poolTokenPolicyId || !poolTokenNameHex) {
    throw new Error('B1PrizePool singleton token is not configured')
  }
  const applied = applyParamsToScript(b1PrizePoolFactoryEnv.cborHex, [
    prizeScriptHashHex,
    oraclePublisherPkhHex,
    poolTokenPolicyId,
    poolTokenNameHex,
  ])

  return {
    type: 'PlutusV2',
    script: applied,
  }
}

/**
 * Costruisce tutti gli script parametrizzati.
 *
 * Nessun fixed-point iteration.
 *
 * Ordine:
 *   1. hash CounterValidator
 *   2. hash BeaconRegistryValidator
 *   3. PrizeValidator(registryHash, PrizeTable, oraclePublisher)
 *   4. hash PrizeValidator
 *   5. B1PrizePool(prizeHash, oraclePublisher)
 *   6. hash B1PrizePool
 *   7. MintPolicy(counterHash, prizeHash, registryHash, treasuryHash, b1PrizePoolHash)
 */
export function buildScriptsFromLucid(
  lucid: {
    utils: {
      validatorToScriptHash: (script: Script) => string
      mintingPolicyToId?: (script: Script) => string
      validatorToAddress?: (script: Script) => string
    }
  },
  table: PrizeTable = defaultPrizeTable,
  oraclePublisherPkh: string = '',
  poolTokenPolicyId: string = B1_POOL_TOKEN_POLICY_ID,
  poolTokenNameHex: string = B1_POOL_TOKEN_NAME_HEX,
) {
  const counterHash =
    lucid.utils.validatorToScriptHash(counterValidator)

  const registryHash =
    lucid.utils.validatorToScriptHash(beaconRegistryValidator)

  const prizeValidator =
    buildPrizeValidator(
      registryHash,
      table,
      oraclePublisherPkh,
    )

  const prizeHash =
    lucid.utils.validatorToScriptHash(prizeValidator)

  const b1PrizePool =
    buildB1PrizePool(
      prizeHash,
      oraclePublisherPkh,
      poolTokenPolicyId,
      poolTokenNameHex,
    )

  const b1PrizePoolHash =
    lucid.utils.validatorToScriptHash(b1PrizePool)

  const treasuryHash =
    lucid.utils.validatorToScriptHash(treasuryValidator)

  const mintPolicy =
    buildMintPolicy(
      counterHash,
      prizeHash,
      registryHash,
      treasuryHash,
      b1PrizePoolHash,
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

  const b1PrizePoolAddress =
    typeof lucid.utils.validatorToAddress === 'function'
      ? lucid.utils.validatorToAddress(b1PrizePool)
      : undefined

  return {
    counterHash,
    registryHash,
    treasuryHash,
    prizeHash,
    b1PrizePoolHash,

    mintPolicy,
    prizeValidator,
    b1PrizePool,

    ticketPolicyId,

    counterAddress,
    registryAddress,
    prizeAddress,
    b1PrizePoolAddress,
  }
}

export default {
  treasuryValidator,
  counterValidator,
  beaconRegistryValidator,

  mintPolicyFactory,
  prizeValidatorFactory,
  b1PrizePoolFactory,

  buildMintPolicy,
  buildPrizeValidator,
  buildB1PrizePool,
  buildScriptsFromLucid,
  prizeTableToData,
}
