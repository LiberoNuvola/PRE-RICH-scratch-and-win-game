import treasuryJson from './plutusScripts/treasury.plutus.json'
import prizeValidatorJson from './plutusScripts/prizeValidatorFactory.plutus.json'
import counterValidatorJson from './plutusScripts/counterValidator.plutus.json'
import mintPolicyJson from './plutusScripts/mintPolicy.plutus.json'
import prizePoolJson from './plutusScripts/prizePool.plutus.json'
import beaconRegistryJson from './plutusScripts/beaconRegistry.plutus.json'

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
export const prizePoolValidator = toLucidScript(prizePoolJson as ScriptEnvelope)
export const beaconRegistryValidator = toLucidScript(
  beaconRegistryJson as ScriptEnvelope
)