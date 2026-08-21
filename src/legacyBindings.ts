import wallet from './wallet'
import tickets from './tickets'
import claim from './claim'
import ui from './ui'

function el(id: string) {
  return document.getElementById(id)
}

function setDisplay(id: string, show: boolean) {
  const e = el(id)
  if (!e) return
  e.style.display = show ? '' : 'none'
}

export async function bindLegacySidebar() {
  const connectBtn = el('connect-wallet') as HTMLButtonElement | null
  const changeBtn = el('change-wallet') as HTMLButtonElement | null
  const disconnectBtn = el('disconnect-wallet') as HTMLButtonElement | null
  const loading = el('loading-spinner') as HTMLElement | null
  const balanceEl = el('wallet-balance') as HTMLElement | null
  const buyBtn = el('buy-tickets-btn') as HTMLButtonElement | null
  const ticket2 = el('ticket-2')
  const ticket5 = el('ticket-5')
  const playBtn = el('play-selected-ticket') as HTMLButtonElement | null
  const selectedLabel = el('selected-ticket') as HTMLElement | null
  const claimBtn = el('claim-prize') as HTMLButtonElement | null

  async function refreshAndShow(addr?: string) {
    const bal = await ui.refreshBalance().catch(() => '—')
    if (balanceEl) balanceEl.textContent = `Balance: ${bal} ADA | ${addr ? addr.slice(0,8) + '...' : ''}`
  }

  connectBtn?.addEventListener('click', async () => {
    if (loading) loading.style.display = ''
    try {
      const res = await wallet.connect()
      setDisplay('connect-wallet', false)
      setDisplay('change-wallet', true)
      setDisplay('disconnect-wallet', true)
      if (loading) loading.style.display = 'none'
      await refreshAndShow(res.address)
    } catch (e) {
      if (loading) loading.style.display = 'none'
      if (balanceEl) balanceEl.textContent = 'Wallet connection failed'
      console.error(e)
    }
  })

  changeBtn?.addEventListener('click', async () => {
    try {
      const res = await wallet.connect()
      await refreshAndShow(res.address)
    } catch (e) {
      console.error('Change wallet error', e)
    }
  })

  disconnectBtn?.addEventListener('click', async () => {
    await wallet.disconnect()
    setDisplay('connect-wallet', true)
    setDisplay('change-wallet', false)
    setDisplay('disconnect-wallet', false)
    if (balanceEl) balanceEl.textContent = 'Balance: Not connected'
  })

  function selectTicket(n: number) {
    if (selectedLabel) selectedLabel.textContent = `Selected: ${n} USDM Ticket`
    if (buyBtn) buyBtn.disabled = false
  }

  ticket2?.addEventListener('click', () => selectTicket(2))
  ticket5?.addEventListener('click', () => selectTicket(5))

  playBtn?.addEventListener('click', () => {
    // Minimal behaviour: reveal demo ticket area or trigger play flow
    const demo = el('demo-ticket')
    if (demo) demo.classList.toggle('hidden')
    // In future: hook play flow to the game engine
  })

  buyBtn?.addEventListener('click', async () => {
    try {
      // sale address should be configured; fallback to prompt for now
      const saleAddr = window.prompt('Sale address (addr_test...):', '') || 'addr_test1_saleplaceholder'
      const tx = await tickets.buyTickets(saleAddr, 2000000)
      alert('Purchase submitted: ' + tx)
      await refreshAndShow(await wallet.getAddress().catch(()=>undefined))
    } catch (e:any) {
      alert('Buy error: ' + (e.message || e))
    }
  })

  claimBtn?.addEventListener('click', async () => {
    try {
      await claim.claimPrize('addr_test1_scriptplaceholder','policyplaceholder','ticketname', (m) => alert(m))
    } catch (e:any) {
      alert('Claim error: ' + (e.message || e))
    }
  })
}

// Auto-bind when this module is loaded in a page that has legacy IDs
if (typeof window !== 'undefined') {
  // Wait for DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bindLegacySidebar().catch(()=>{})
  } else {
    document.addEventListener('DOMContentLoaded', () => bindLegacySidebar().catch(()=>{}))
  }
}

export default { bindLegacySidebar }
