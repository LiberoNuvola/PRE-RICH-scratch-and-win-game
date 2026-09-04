// src/tickets.ts
import wallet from './wallet'
import { mintSerialNFT } from './mint'
import { COUNTER_SCRIPT_ADDRESS } from './config'

/**
 * B1 buy flow: each ticket requires a separate mint transaction.
 *
 * The mint transaction creates the NFT and PrizeDatum.
 * The buyer MUST separately pay the Treasury in another transaction.
 *
 * Atomicity limitation: mint + Treasury payment are NOT atomic.
 * See Game-Economy.md §9, §10.
 *
 * qty > 1 = multiple sequential transactions (one per ticket).
 */
export async function buyTickets(qty: number = 1) {
  const lucid = wallet.getLucid()

  if (!lucid) {
    throw new Error('Wallet not connected')
  }

  if (!COUNTER_SCRIPT_ADDRESS) {
    throw new Error(
      'COUNTER_SCRIPT_ADDRESS not configured in config/.env',
    )
  }

  if (qty <= 0) {
    throw new Error('Invalid quantity')
  }

  const results: Array<{
    txHash: string
    tokenName: string
    assetId: string
  }> = []

  for (let i = 0; i < qty; i++) {
    const r = await mintSerialNFT({})
    results.push(r)
  }

  return results
}

export default { buyTickets }
