// src/loadValidator.ts
//
// Prima di usare:
//   1) cd plutus && mkdir -p out && cabal run export-scripts
//   2) copia plutus/out/*.plutus.json in src/plutusScripts/
//      (mintPolicyFactory → mintPolicy.plutus.json)

import treasuryJson from './plutusScripts/treasury.plutus.json'
import prizeValidatorJson from './plutusScripts/prizeValidator.plutus.json'
import counterValidatorJson from './plutusScripts/counterValidator.plutus.json'
import prizePoolJson from './plutusScripts/prizePool.plutus.json'
import mintPolicyJson from './plutusScripts/mintPolicy.plutus.json'

type ScriptEnvelope = {
  type: string
  description?: string
  cborHex: string
}

function toLucidScript(env: ScriptEnvelope) {
  if (!env?.cborHex) {
    throw new Error('Script envelope missing cborHex')
  }
  return {
    type: 'PlutusV2' as const,
    script: env.cborHex,
  }
}

export const treasuryValidator = toLucidScript(treasuryJson as ScriptEnvelope)
export const prizeValidator = toLucidScript(prizeValidatorJson as ScriptEnvelope)
export const counterValidator = toLucidScript(counterValidatorJson as ScriptEnvelope)
export const prizePoolValidator = toLucidScript(prizePoolJson as ScriptEnvelope)

// Nota: questo CBOR è la FACTORY della mint policy
// (ScriptHash → PubKeyHash → Integer → script).
// Per usarla on-chain va ancora applicata ai parametri reali.
// Per ora la carichiamo così; il policyId applicato arriva al passo successivo.
export const mintPolicyScript = toLucidScript(mintPolicyJson as ScriptEnvelope)