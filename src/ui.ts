import wallet from './wallet'

export async function refreshBalance(): Promise<string> {
  const lucid = wallet.getLucid()
  if (!lucid) return 'Not connected'

  // Try to robustly read lovelace from returned UTxOs
  const utxos: any[] = await lucid.wallet.getUtxos()
  let total = 0n
  for (const u of utxos) {
    const lov = (u.assets && (u.assets.lovelace ?? u.assets['lovelace']))
      ?? (u.amount && (u.amount.lovelace ?? u.amount['lovelace']))
      ?? (u.value && (u.value.lovelace ?? u.value['lovelace']))
      ?? 0
    try {
      total += BigInt(lov)
    } catch {
      // fallback if lov is string
      total += BigInt(String(lov || '0'))
    }
  }

  const ada = Number(total) / 1_000_000
  return ada.toFixed(6).replace(/\.?(0+)$/,'').replace(/\.$/, '')
}

export function updateWalletUI(connected: boolean, address?: string, balance?: string) {
  const btn = document.getElementById('connect') as HTMLButtonElement | null
  const balanceEl = document.getElementById('wallet-balance')
  if (connected) {
    if (btn) btn.textContent = 'Disconnect'
    if (balanceEl) balanceEl.textContent = `Balance: ${balance ?? '—'} ADA | ${address ? address.slice(0,8) + '...' : ''}`
  } else {
    if (btn) btn.textContent = 'Connect Wallet'
    if (balanceEl) balanceEl.textContent = 'Balance: Not connected'
  }
}

export default { refreshBalance, updateWalletUI }
