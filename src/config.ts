// src/config.ts
// Rete e indirizzi Preprod — aggiorna prima dei test reali.

export const NETWORK = 'Preprod' as const

/** Prezzo ticket in lovelace (2 ADA) */
export const TICKET_PRICE_LOVELACE = 2_000_000

/**
 * Indirizzo del CounterValidator (script address).
 * Lo ottieni da Lucid dopo aver caricato counterValidator:
 *   lucid.utils.validatorToAddress(counterValidator)
 * Oppure da cardano-cli / deploy script.
 */
export const COUNTER_SCRIPT_ADDRESS =
  import.meta.env.VITE_COUNTER_SCRIPT_ADDRESS ?? ''

/**
 * Indirizzo che riceve il pagamento della vendita (sale).
 * Deve corrispondere al PubKeyHash usato quando applichi la mint policy.
 */
export const SALE_ADDRESS =
  import.meta.env.VITE_SALE_ADDRESS ?? ''

/**
 * Policy ID della mint policy GIÀ parametrizzata.
 * Finché usi solo la factory, lascialo vuoto e lo calcoleremo dopo l'apply.
 */
export const TICKET_POLICY_ID =
  import.meta.env.VITE_TICKET_POLICY_ID ?? ''

/** PRE-RICH mainnet (non serve per i test preprod in ADA) */
export const PRE_POLICY_ID =
  '1b29fda97d0fd321398c5b7b3285fdaadd519a0d002932853311f02c'
export const PRE_ASSET_NAME_HEX = '5052452d52494348'

/**
 * PubKeyHash (hex, 28 byte) del relayer autorizzato a pubblicare i beacon.
 *
 * FIX/AGGIUNTA: la creazione della entry Pending nel BeaconRegistry non è
 * vincolata da nessun validator on-chain (vedi createRound.ts). Questo
 * valore serve da controllo di sicurezza lato client: prima di mintare un
 * ticket, verifichiamo che il round trovato abbia proprio questo relayer,
 * non uno qualsiasi -- altrimenti un round "Pending" contraffatto con un
 * relayer diverso potrebbe essere referenziato senza che nessuno se ne
 * accorga.
 */
export const RELAYER_PKH =
  import.meta.env.VITE_RELAYER_PKH ?? ''