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