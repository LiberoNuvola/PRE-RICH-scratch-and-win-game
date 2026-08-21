import wallet from './wallet'
import { tryClaimAndNotify } from './claimFlow'

export async function claimPrize(scriptAddress: string, ticketPolicyId: string, ticketAssetName: string, statusCb: (m: string) => void) {
  const lucid = wallet.getLucid()
  if (!lucid) throw new Error('Wallet not connected')
  return await tryClaimAndNotify(lucid, scriptAddress, ticketPolicyId, ticketAssetName, statusCb)
}

export default { claimPrize }
