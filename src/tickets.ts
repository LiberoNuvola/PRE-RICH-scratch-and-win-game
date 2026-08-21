import wallet from './wallet'
import { signAndSubmitTx } from './txHelpers'

export async function buyTickets(saleAddress: string, lovelacePerTicket = 2000000) {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')

  const qtyStr = window.prompt('How many tickets do you want to buy?', '1')
  if (!qtyStr) throw new Error('Purchase cancelled')
  const qty = parseInt(qtyStr)
  if (Number.isNaN(qty) || qty <= 0) throw new Error('Invalid quantity')

  const totalLovelace = BigInt(qty) * BigInt(lovelacePerTicket)

  const tx = await lucid.newTx()
    .payToAddress(saleAddress, { lovelace: totalLovelace })
    .complete()

  const signed = await lucid.signTx(tx)
  const txHash = await lucid.submitTx(signed)
  return txHash
}

export default { buyTickets }
