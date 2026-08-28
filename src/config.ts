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
