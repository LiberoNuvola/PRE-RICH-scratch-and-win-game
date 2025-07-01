// Carica le variabili d'ambiente dal file .env (richiede dotenv)
require('dotenv').config();

// Usa la variabile d'ambiente per la chiave Blockfrost
const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY;

async function initMesh() {
  try {
    const blockfrostProvider = new BlockfrostProvider(BLOCKFROST_API_KEY); // Usa la chiave dall'ambiente
    console.log('Mesh SDK loaded');
    return blockfrostProvider;
  } catch (err) {
    document.getElementById('result').innerText = 'Failed to load Mesh SDK';
    console.error(err);
    throw err;
  }
}

// --- Gestione persistenza vincite con localStorage ---
function salvaVincita(ticketId, prize, ticketPrice, walletAddress) {
  const vincite = JSON.parse(localStorage.getItem('vincite')) || [];
  vincite.push({ ticketId, prize, ticketPrice, walletAddress });
  localStorage.setItem('vincite', JSON.stringify(vincite));
}

function caricaVincite() {
  const vincite = JSON.parse(localStorage.getItem('vincite')) || [];
  const tbody = document.getElementById('winning-tickets-body');
  tbody.innerHTML = '';
  vincite.forEach(v => {
    aggiungiRigaTabella(v.ticketId, v.prize, v.ticketPrice, v.walletAddress);
  });
}

function aggiungiRigaTabella(ticketId, prize, ticketPrice, walletAddress) {
  const tbody = document.getElementById('winning-tickets-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${ticketId}</td>
    <td>${prize}</td>
    <td>${ticketPrice}</td>
    <td>${walletAddress}</td>
  `;
  tbody.appendChild(tr);
}

// --- Salva la vincita dopo una vincita ---
// Da inserire nella logica dove il giocatore vince
function gestisciVincita(ticketId, prize, ticketPrice, walletAddress) {
  salvaVincita(ticketId, prize, ticketPrice, walletAddress);
  aggiungiRigaTabella(ticketId, prize, ticketPrice, walletAddress);
}

// --- Esempio: salvataggio vincita nella funzione di gioco ---
// Inserisci questo blocco nella funzione che gestisce la vincita, subito dopo aver determinato che il giocatore ha vinto
if (prizeUsdm > 0) {
  const ticketId = Date.now(); // identificativo unico, puoi sostituire con altro se preferisci
  const walletAddress = wallet?.address || 'N/A';
  gestisciVincita(ticketId, prizeUsdm + ' USDM', selectedTicketPriceUsdm + ' ADA', walletAddress);
}

// Chiamare caricaVincite() all'avvio
window.addEventListener('DOMContentLoaded', caricaVincite);

// Esempio di utilizzo dopo una vincita (da inserire dove gestisci la vincita):
// salvaVincita(ticketId, prize, ticketPrice, walletAddress);
// aggiungiRigaTabella(ticketId, prize, ticketPrice, walletAddress);