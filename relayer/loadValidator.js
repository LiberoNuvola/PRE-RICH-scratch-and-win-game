// relayer/loadValidator.js
const fs = require('fs')
const path = require('path')

function loadScript(relativePath) {
  const fullPath = path.resolve(__dirname, relativePath)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const env = JSON.parse(raw)

  if (!env || typeof env.cborHex !== 'string') {
    throw new Error(`Invalid script envelope at ${fullPath}`)
  }

  return {
    type: 'PlutusV2',
    script: env.cborHex,
  }
}

module.exports = {
  loadScript,
  TREASURY_SCRIPT_PATH:
    process.env.TREASURY_SCRIPT_PATH || '../plutus/out/treasury.plutus.json',
}
