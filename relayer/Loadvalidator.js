// relayer/loadValidator.js
//
// Legge un file .plutus.json esportato da `cabal run export-scripts`
// (vedi plutus/Export.hs) e lo trasforma nell'oggetto che Lucid si aspetta
// per attachSpendingValidator().

const fs = require('fs')
const path = require('path')

function loadScript(relativePath) {
  const fullPath = path.resolve(__dirname, relativePath)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const env = JSON.parse(raw)
  return {
    type: 'PlutusV2',
    script: env.cborHex,
  }
}

module.exports = {
  loadScript,
  // Percorso di default: aggiusta se sposti i file esportati altrove.
  TREASURY_SCRIPT_PATH: process.env.TREASURY_SCRIPT_PATH || '../plutus/out/treasury.plutus.json',
}
