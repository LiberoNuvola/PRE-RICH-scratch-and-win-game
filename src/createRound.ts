// src/createRound.ts
//
// Crea la entry BeaconPending iniziale per un round nel BeaconRegistry.
// Prima non esisteva alcuna funzione per questo passaggio: senza una
// entry Pending gia' presente, mint.ts non ha nulla da referenziare e
// l'intero loop (mint -> sync -> reveal -> claim) non puo' nemmeno
// partire.
//
// NOTA DI SICUREZZA IMPORTANTE (onesta, non nascosta):
// la creazione di questa UTxO non e' vincolata da nessun validator on
// -chain -- BeaconRegistry.hs regola solo la transizione Pending -> Ready,
// non chi puo' creare la entry Pending iniziale. In teoria chiunque
// potrebbe creare una entry Pending concorrente per lo stesso round, con
// un brRelayerPkh diverso dal tuo. Finche' questo non viene chiuso a
// livello di validator (es. richiedendo che la creazione avvenga solo da
// un indirizzo admin fissato come parametro), l'unica difesa e' verificare
// SEMPRE, lato client, che il round trovato abbia il brRelayerPkh atteso
// prima di fidarsene -- vedi il controllo aggiunto in mint.ts.

import { Data } from 'lucid-cardano'
import wallet from './wallet'
import { beaconRegistryValidator } from './loadValidator'
import type { BeaconTarget } from './beacon'
import {
  beaconStatusPendingConstr,
  buildBeaconRegistryDatumConstr,
} from './registryDatum'

export type CreatePendingRoundParams = {
  target: BeaconTarget
  relayerPkh: string // hex, 28 byte -- deve combaciare con chi firmerà publishRoundBeacon
  fundingLovelace?: bigint
}

export type CreatePendingRoundResult = {
  txHash: string
  registryAddress: string
}

export async function createPendingRound(
  p: CreatePendingRoundParams
): Promise<CreatePendingRoundResult> {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  if (p.target.round < 0) {
    throw new Error('round deve essere >= 0')
  }
  if (!p.relayerPkh || p.relayerPkh.length !== 56) {
    throw new Error('relayerPkh deve essere un hex a 28 byte (56 caratteri)')
  }

  // Deriviamo l'indirizzo direttamente dal validator, invece di farcelo
  // passare dal chiamante: evita che una copia manuale sbagliata
  // dell'indirizzo mandi i fondi in un posto diverso da dove poi
  // mint.ts/gameFlow.ts vanno effettivamente a cercare.
  const registryAddress = lucid.utils.validatorToAddress(
    beaconRegistryValidator
  )

  const datum = buildBeaconRegistryDatumConstr({
    round: p.target.round,
    target: p.target,
    status: beaconStatusPendingConstr(),
    beaconValue: new Uint8Array(0),
    mcHash: new Uint8Array(0),
    materiosContext: new Uint8Array(0),
    relayerPkh: p.relayerPkh,
  })

  const funding = p.fundingLovelace ?? 2_000_000n

  const tx = await lucid
    .newTx()
    .payToContract(
      registryAddress,
      { inline: Data.to(datum) },
      { lovelace: funding }
    )
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)

  return { txHash, registryAddress }
}

export default { createPendingRound }