// src/config.ts
// Network and addresses for Preprod — update before real tests.

function env(key: string): string {
  try {
    // Vite environment
    return (import.meta as any).env?.[key] ?? ''
  } catch {
    return ''
  }
}

export const NETWORK = 'Preprod' as const

/**
 * Genesis ticket price: 1 USDM = 100 sub-units.
 * USDM is the economic denomination; sub-units are the on-chain integer representation.
 * pdPriceUsdm in PrizeDatum stores this value (100 for Genesis).
 * The payout formula: (base * priceUsdm) / 2, with priceUsdm = 100, produces sub-unit results.
 */
export const GENESIS_TICKET_PRICE_USDM = 100

/**
 * ADA settlement amount for Genesis ticket (lovelace).
 * Must be verified against oracle USDM/ADA rate before mainnet.
 * For Preprod testing: 1 ADA ~= 1 USDM (approximate).
 */
export const TICKET_PAYMENT_LOVELACE = 1_000_000

/**
 * CounterValidator script address.
 */
export const COUNTER_SCRIPT_ADDRESS = env('VITE_COUNTER_SCRIPT_ADDRESS')

/**
 * B1: Protocol-controlled Treasury address (Script address, NOT personal wallet).
 * All player payments go here. Treasury distributes to PrizePool/Stake/Reserve/Maintenance.
 *
 * Game-Economy.md §9: "No player payment may be routed through a team-controlled
 * personal wallet as an intermediate economic destination."
 */
export const TREASURY_ADDRESS = env('VITE_TREASURY_ADDRESS')

/**
 * @deprecated Use TREASURY_ADDRESS. Personal sale wallets are not allowed in B1.
 */
export const SALE_ADDRESS = TREASURY_ADDRESS

/**
 * Policy ID of the already-parametrized mint policy.
 */
export const TICKET_POLICY_ID = env('VITE_TICKET_POLICY_ID')

/** PRE-RICH mainnet */
export const PRE_POLICY_ID =
  '1b29fda97d0fd321398c5b7b3285fdaadd519a0d002932853311f02c'
export const PRE_ASSET_NAME_HEX = '5052452d5252494348'

/**
 * PubKeyHash (hex, 28 byte) of the authorized relayer for beacon publishing.
 */
export const RELAYER_PKH = env('VITE_RELAYER_PKH')
