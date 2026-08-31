// src/registryDatum.ts
//
// Costruisce la rappresentazione Data di BeaconRegistryDatum, allineata
// ESATTAMENTE ai 7 campi dichiarati oggi in plutus/Types.hs:
//
//   brRound           :: Integer
//   brTarget          :: BeaconTarget
//   brStatus          :: BeaconStatus
//   brBeaconValue     :: BuiltinByteString
//   brMcHash          :: BuiltinByteString
//   brMateriosContext :: BuiltinByteString
//   brRelayerPkh      :: PubKeyHash
//
// ATTENZIONE: registryFlow.ts assume anche un campo `brGameRoundCommitment`
// dentro BeaconRegistryDatum, ma plutus/BeaconRegistry.hs e plutus/Types.hs
// non lo includono ancora -- GameRoundCommitment esiste come primitiva
// isolata (Beacon.hs / Types.hs) ma non e' mai stato collegato al
// validator del registry. Finche' non viene esteso anche l'Haskell, questo
// modulo IGNORA deliberatamente `brGameRoundCommitment` in input: lo valida
// off-chain (per chi vuole comunque la coerenza logica) ma non lo scrive
// nel datum on-chain, perche' il tipo Haskell reale non ha spazio per lui.
// Prossimo passo naturale, quando si vorra' completare l'integrazione:
// aggiungere `brGameRoundCommitment :: GameRoundCommitment` a
// BeaconRegistryDatum in Types.hs e farlo verificare da BeaconRegistry.hs.

import { Constr, Data } from 'lucid-cardano'
import type { BeaconTarget } from './beacon'

// FIX: Buffer e' un'API Node.js, non disponibile nel browser (questo e'
// un progetto Vite/frontend). Conversione byte -> hex in puro JS.
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function beaconStatusPendingConstr(): Constr<never> {
  return new Constr(0, [])
}
export function beaconStatusReadyConstr(): Constr<never> {
  return new Constr(1, [])
}

export function beaconTargetToConstr(t: BeaconTarget): Constr<Data> {
  return new Constr(0, [
    BigInt(t.networkId),
    BigInt(t.round),
    bytesToHex(t.mainchainRef),
    bytesToHex(t.version),
  ])
}

export type BeaconRegistryFields = {
  round: number
  target: BeaconTarget
  status: Constr<never>
  beaconValue: Uint8Array
  mcHash: Uint8Array
  materiosContext: Uint8Array
  relayerPkh: string // hex, 28 byte
}

export function buildBeaconRegistryDatumConstr(
  f: BeaconRegistryFields
): Constr<Data> {
  return new Constr(0, [
    BigInt(f.round),
    beaconTargetToConstr(f.target),
    f.status,
    bytesToHex(f.beaconValue),
    bytesToHex(f.mcHash),
    bytesToHex(f.materiosContext),
    f.relayerPkh,
  ])
}