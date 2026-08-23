// src/loadValidator.ts
//
// Prima di usare:
//   1) cd plutus && mkdir -p out && cabal run export-scripts -- <salePkhHex> <priceLovelace>
//   2) copia i file plutus/out/*.plutus.json dentro src/plutusScripts/

import treasuryJson from './plutusScripts/treasury.plutus.json'
import prizeValidatorJson from './plutusScripts/prizeValidator.plutus.json'
import counterValidatorJson from './plutusScripts/counterValidator.plutus.json'
import mintPolicyJson from './plutusScripts/mintPolicy.plutus.json'

type ScriptEnvelope = {
  type: string
  description?: string
  cborHex: string
}

function toLucidScript(env: ScriptEnvelope) {
  return {
    type: 'PlutusV2' as const,
    script: env.cborHex,
  }
}

export const treasuryValidator = toLucidScript(treasuryJson as ScriptEnvelope)
export const prizeValidator = toLucidScript(prizeValidatorJson as ScriptEnvelope)
export const counterValidator = toLucidScript(counterValidatorJson as ScriptEnvelope)
export const mintPolicyScript = toLucidScript(mintPolicyJson as ScriptEnvelope)
