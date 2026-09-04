import './style.css'
import wallet from './wallet'
import claim from './claim'
import tickets from './tickets'
import ui from './ui'
import adSlots, {
  AD_SLOT_PACKAGES,
  calculateAdTotalUsd,
  formatUsd,
  getExpiryDateFromPackage,
  getPackageById,
} from './adSlots'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="app-shell">
    <h1>PreRich - Dev UI</h1>

    <div class="toolbar">
      <button id="connect">Connect Wallet</button>
      <button id="buy">Buy Tickets</button>
      <button id="claim">Claim Prize</button>
    </div>

    <div id="wallet-info"><span id="wallet-balance">Balance: Not connected</span></div>

    <section class="card">
      <h2>Ad slot pricing</h2>
      <p>Low-entry pricing with fixed packages and automatic expiry.</p>
      <div id="slot-packages" class="slot-packages"></div>
      <div id="slot-status" class="slot-status">No slot selected.</div>
    </section>

    <div id="status"></div>
  </div>
`

const status = (msg: string) => { const el = document.getElementById('status'); if (el) el.textContent = msg }
const slotStatus = (msg: string) => { const el = document.getElementById('slot-status'); if (el) el.textContent = msg }

const renderAdPackages = () => {
  const container = document.getElementById('slot-packages')
  if (!container) return

  container.innerHTML = AD_SLOT_PACKAGES.map((pkg) => {
    const total = calculateAdTotalUsd(pkg.id)
    const expiry = getExpiryDateFromPackage(pkg.id)
    return `
      <button class="slot-package" data-package-id="${pkg.id}">
        <span class="slot-package__title">${pkg.label}</span>
        <span class="slot-package__meta">${pkg.hours}h · ${formatUsd(total)}</span>
        <span class="slot-package__meta">Auto-expiry: ${expiry.toLocaleString()}</span>
      </button>
    `
  }).join('')

  container.querySelectorAll<HTMLButtonElement>('.slot-package').forEach((button) => {
    button.addEventListener('click', () => {
      const packageId = button.dataset.packageId as any
      const pkg = getPackageById(packageId)
      const total = calculateAdTotalUsd(pkg.id)
      const expiry = getExpiryDateFromPackage(pkg.id)
      slotStatus(`${pkg.label}: ${formatUsd(total)} · slot stays active until ${expiry.toLocaleString()}`)
      status(`Selected ad package: ${pkg.label} (${formatUsd(total)})`)
    })
  })
}

renderAdPackages()

const connectBtn = document.getElementById('connect') as HTMLButtonElement | null
let connected = false
connectBtn?.addEventListener('click', async () => {
  if (connected) {
    await wallet.disconnect()
    connected = false
    connectBtn.textContent = 'Connect Wallet'
    status('Disconnected')
    return
  }
  try {
    const res = await wallet.connect()
    connected = true
    connectBtn.textContent = 'Disconnect'
    const bal = await ui.refreshBalance().catch(() => '—')
    ui.updateWalletUI(true, res.address, bal)
    status('Connected: ' + res.address)
  } catch (e: any) {
    status('Connect error: ' + (e.message || e))
  }
})

document.getElementById('claim')?.addEventListener('click', async () => {
  try {
    await claim.claimPrize(
      'addr_test1_scriptplaceholder',
      'policyplaceholder',
      'ticketname',
      (m) => status(m)
    )
  } catch (err: any) {
    status('Claim error: ' + (err.message || err))
  }
})

document.getElementById('buy')?.addEventListener('click', async () => {
  try {
    const tx = await tickets.buyTickets(1)
    status('Purchase submitted: ' + tx)
    const bal = await ui.refreshBalance().catch(() => '—')
    ui.updateWalletUI(true, await wallet.getAddress().catch(() => ''), bal)
  } catch (e: any) {
    status('Buy error: ' + (e.message || e))
  }
})

export default adSlots

