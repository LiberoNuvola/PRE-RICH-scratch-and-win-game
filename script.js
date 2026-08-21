// --- Placeholder functions for all sidebar actions ---
// Lucid Cardano wallet integration
let lucid = null;
let walletAddress = null;
let walletBalance = null;

const connectBtn = document.getElementById('connect-wallet');
const changeBtn = document.getElementById('change-wallet');
const disconnectBtn = document.getElementById('disconnect-wallet');
const loadingSpinner = document.getElementById('loading-spinner');
const balanceDisplay = document.getElementById('wallet-balance');

function updateWalletUI(connected) {
  if (connected) {
    connectBtn.style.display = 'none';
    changeBtn.style.display = '';
    disconnectBtn.style.display = '';
    loadingSpinner.style.display = 'none';
    balanceDisplay.textContent = `Balance: ${walletBalance} ADA | ${walletAddress ? walletAddress.slice(0,8)+'...' : ''}`;
  } else {
    connectBtn.style.display = '';
    changeBtn.style.display = 'none';
    disconnectBtn.style.display = 'none';
    loadingSpinner.style.display = 'none';
    balanceDisplay.textContent = 'Balance: Not connected';
  }
}

async function connectWallet() {
  loadingSpinner.style.display = '';
  connectBtn.style.display = 'none';
  try {
    // Lucid auto-detects wallet extensions
    lucid = await Lucid.new(undefined, 'Preprod');
    // Prompt user to select wallet
    await lucid.selectWalletFromExtension();
    walletAddress = await lucid.wallet.address();
    // Fetch balance (ADA only)
    const utxos = await lucid.wallet.getUtxos();
    let totalLovelace = utxos.reduce((sum, utxo) => sum + (utxo.assets['lovelace'] || 0), 0);
    walletBalance = (totalLovelace / 1_000_000).toFixed(2);
    updateWalletUI(true);
  } catch (err) {
    console.error('Wallet connection error:', err);
    balanceDisplay.textContent = 'Wallet connection failed';
    updateWalletUI(false);
  }
}

async function changeWallet() {
  try {
    await lucid.selectWalletFromExtension();
    walletAddress = await lucid.wallet.address();
    // Fetch balance again
    const utxos = await lucid.wallet.getUtxos();
    let totalLovelace = utxos.reduce((sum, utxo) => sum + (utxo.assets['lovelace'] || 0), 0);
    walletBalance = (totalLovelace / 1_000_000).toFixed(2);
    updateWalletUI(true);
  } catch (err) {
    console.error('Change wallet error:', err);
    balanceDisplay.textContent = 'Change wallet failed';
    updateWalletUI(false);
  }
}

function disconnectWallet() {
  lucid = null;
  walletAddress = null;
  walletBalance = null;
  updateWalletUI(false);
}
function selectTicket(n) {
  alert('Select Ticket ' + n + ' clicked (placeholder)');
}
function goToProjectsPage() {
  alert('Go to Projects Page clicked (placeholder)');
}
function buyTickets() {
  alert('Buy Tickets clicked (placeholder)');
}
function playSelectedTicket() {
  alert('Play Selected Ticket clicked (placeholder)');
}
function toggleBackgroundMusic() {
  alert('Toggle Music clicked (placeholder)');
}
function goHome() {
  alert('Home clicked (placeholder)');
}
function claimPrize() {
  alert('Claim Prize clicked (placeholder)');
}
// --- Event listeners for sidebar buttons (CSP safe) ---
function waitForLucid(callback) {
  if (window.Lucid) {
    callback();
  } else {
    setTimeout(() => waitForLucid(callback), 50);
  }
}

connectBtn?.addEventListener('click', () => {
  waitForLucid(connectWallet);
});
changeBtn?.addEventListener('click', () => {
  waitForLucid(changeWallet);
});
disconnectBtn?.addEventListener('click', disconnectWallet);
document.getElementById('ticket-2')?.addEventListener('click', () => selectTicket(2));
document.getElementById('ticket-5')?.addEventListener('click', () => selectTicket(5));
document.getElementById('projects-page-btn')?.addEventListener('click', goToProjectsPage);
document.getElementById('buy-tickets-btn')?.addEventListener('click', buyTickets);
document.getElementById('play-selected-ticket')?.addEventListener('click', playSelectedTicket);
document.getElementById('toggle-music')?.addEventListener('click', toggleBackgroundMusic);
document.getElementById('go-home')?.addEventListener('click', goHome);
document.getElementById('claim-prize')?.addEventListener('click', claimPrize);
// ...existing code...

// --- Logica per la sezione progetti Cardano (pagina dedicata) ---
// Tutto il JS inline di index.html è stato spostato qui, mantenendo la logica e l'ordine originale.
// ...existing code...
// Carica le variabili d'ambiente dal file .env (richiede dotenv)
// require('dotenv').config(); // Rimosso: non valido per frontend

// La chiave Blockfrost non può essere letta da variabili d'ambiente nel frontend.
// Se serve, va gestita lato backend o tramite proxy. Qui va rimossa per sicurezza.
// const BLOCKFROST_API_KEY = ''; // <-- Inserire qui la chiave SOLO se necessario e consapevoli dei rischi

// async function initMesh() {
//   try {
//     const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_API_KEY); // Usa la chiave dall'ambiente
//     console.log('Mesh SDK loaded');
//     return blockfrostProvider;
//   } catch (err) {
//     document.getElementById('result').innerText = 'Failed to load Mesh SDK';
//     console.error(err);
//     throw err;
//   }
// }

// ...existing code...
// On page load, ensure UI is correct
updateWalletUI(false);