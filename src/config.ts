// src/config.ts
// Network and addresses for Preprod — update before real tests.
function env(key: string): string {
  try { return (import.meta as any).env?.[key] ?? '' } catch { return '' }
}
export const NETWORK = 'Preprod' as const
export const GENESIS_TICKET_PRICE_USDM = 100
export const TICKET_PAYMENT_LOVELACE = 1_000_000
export const COUNTER_SCRIPT_ADDRESS = env('VITE_COUNTER_SCRIPT_ADDRESS')
export const TREASURY_ADDRESS = env('VITE_TREASURY_ADDRESS')
export const SALE_ADDRESS = TREASURY_ADDRESS
export const TICKET_POLICY_ID = env('VITE_TICKET_POLICY_ID')
export const PRE_POLICY_ID = '1b29fda97d0fd321398c5b7b3285fdaadd519a0d002932853311f02c'
export const PRE_ASSET_NAME_HEX = '5052452d5252494348'
export const RELAYER_PKH = env('VITE_RELAYER_PKH')
export const ORACLE_PUBLISHER_PKH = env('VITE_ORACLE_PUBLISHER_PKH')

// B1 singleton PrizePool authority NFT. Must be minted once at deployment.
export const B1_POOL_TOKEN_POLICY_ID = env('VITE_B1_POOL_TOKEN_POLICY_ID')
export const B1_POOL_TOKEN_NAME_HEX = env('VITE_B1_POOL_TOKEN_NAME_HEX')
