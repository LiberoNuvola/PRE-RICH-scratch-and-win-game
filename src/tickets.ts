// src/tickets.ts
import wallet from './wallet'
import { mintSerialNFT } from './mint'
import {
  COUNTER_SCRIPT_ADDRESS,
  SALE_ADDRESS,
  TICKET_POLICY_ID,
  TICKET_PRICE_LOVELACE,
} from './config'

/**
 * Flusso unico: per ogni ticket richiede mint on-chain
 * (pagamento al sale address incluso nella tx di mint).
 *
 * Nota: oggi 1 mint = 1 NFT seriale (il counter avanza di 1).
 * qty > 1 = più transazioni in sequenza.
 */
export async function buyTickets(
  saleAddress: string = SALE_ADDRESS,
  lovelacePerTicket: number = TICKET_PRICE_LOVELACE
) {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  if (!COUNTER_SCRIPT_ADDRESS) {
    throw new Error('COUNTER_SCRIPT_ADDRESS non configurato in config/.env')
  }
  if (!saleAddress) {
    throw new Error('SALE_ADDRESS non configurato')
  }
  if (!TICKET_POLICY_ID) {
    throw new Error(
      'TICKET_POLICY_ID vuoto: serve la mint policy applicata (factory + parametri). ' +
        'Per ora puoi testare solo dopo aver calcolato il policyId.'
    )
  }

  const qtyStr = window.prompt('How many tickets do you want to buy?', '1')
  if (!qtyStr) throw new Error('Purchase cancelled')
  const qty = parseInt(qtyStr, 10)
  if (Number.isNaN(qty) || qty <= 0) throw new Error('Invalid quantity')

  const results: Array<{
    txHash: string
    tokenName: string
    assetId: string
  }> = []

  for (let i = 0; i < qty; i++) {
    const r = await mintSerialNFT(
      COUNTER_SCRIPT_ADDRESS,
      TICKET_POLICY_ID,
      saleAddress,
      lovelacePerTicket
    )
    results.push(r)
  }

  return results
}

export default { buyTickets }