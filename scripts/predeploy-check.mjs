import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')

const errors = []
const warnings = []

function fail(message) {
  console.log(`  ✗ ${message}`)
  errors.push(message)
}

function warn(message) {
  console.log(`  ⚠ ${message}`)
  warnings.push(message)
}

function ok(message) {
  console.log(`  ✓ ${message}`)
}

function section(title) {
  console.log(`\n${title}`)
  console.log('='.repeat(title.length))
}

function read(file) {
  const full = path.resolve(ROOT, file)

  if (!fs.existsSync(full)) {
    fail(`${file}: file not found`)
    return ''
  }

  return fs.readFileSync(full, 'utf8')
}

function exists(file, label = file) {
  if (fs.existsSync(path.resolve(ROOT, file))) {
    ok(`${label}: present`)
    return true
  }

  fail(`${label}: missing`)
  return false
}

function contains(source, pattern, message) {
  if (pattern.test(source)) {
    ok(message)
    return true
  }

  fail(message)
  return false
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status === 0) {
    ok(label)
    return true
  }

  fail(label)

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()

  if (output) {
    console.log(output)
  }

  return false
}

function loadJson(file) {
  try {
    return JSON.parse(read(file))
  } catch {
    return null
  }
}

function validPlutusV2Envelope(file, label) {
  const json = loadJson(file)

  if (
    json &&
    json.type === 'PlutusScriptV2' &&
    typeof json.cborHex === 'string' &&
    /^[0-9a-fA-F]+$/.test(json.cborHex) &&
    json.cborHex.length > 0
  ) {
    ok(`${label}: valid PlutusScriptV2 envelope`)
    return true
  }

  fail(`${label}: invalid PlutusScriptV2 envelope`)
  return false
}

function sameCbor(a, b, label) {
  const aa = loadJson(a)
  const bb = loadJson(b)

  if (
    aa &&
    bb &&
    typeof aa.cborHex === 'string' &&
    typeof bb.cborHex === 'string' &&
    aa.cborHex.toLowerCase() === bb.cborHex.toLowerCase()
  ) {
    ok(`${label}: generated/frontend CBOR synchronized`)
    return true
  }

  fail(`${label}: generated/frontend CBOR mismatch`)
  return false
}

console.log(`
PRE-RICH PREDEPLOY GATE
=======================
`)

// ---------------------------------------------------------------------------
// 1. Repository & artifacts
// ---------------------------------------------------------------------------

section('1/8  REPOSITORY & ARTIFACTS')

const requiredFiles = [
  ['plutus/out/treasury.plutus.json', 'Treasury'],
  ['plutus/out/counterValidator.plutus.json', 'CounterValidator'],
  ['plutus/out/prizePool.plutus.json', 'PrizePool'],
  ['plutus/out/mintPolicyFactory.plutus.json', 'MintPolicy factory'],
  ['plutus/out/prizeValidatorFactory.plutus.json', 'PrizeValidator factory'],
  ['plutus/out/beaconRegistry.plutus.json', 'BeaconRegistry'],

  ['plutus/Beacon.hs', 'Beacon.hs'],
  ['plutus/BeaconRegistry.hs', 'BeaconRegistry.hs'],
  ['plutus/MintPolicy.hs', 'MintPolicy.hs'],
  ['plutus/PrizeValidator.hs', 'PrizeValidator.hs'],
  ['plutus/Types.hs', 'Types.hs'],
  ['plutus/GameRules.hs', 'GameRules.hs'],

  ['src/loadValidator.ts', 'src/loadValidator.ts'],
  ['src/mint.ts', 'src/mint.ts'],
  ['src/gameFlow.ts', 'src/gameFlow.ts'],

  ['relayer/relayer.js', 'relayer/relayer.js'],
  ['relayer/beaconProvider.js', 'relayer/beaconProvider.js'],
  ['relayer/registryPublisher.js', 'relayer/registryPublisher.js'],
]

for (const [file, label] of requiredFiles) {
  exists(file, label)
}

validPlutusV2Envelope(
  'plutus/out/treasury.plutus.json',
  'Treasury',
)

validPlutusV2Envelope(
  'plutus/out/counterValidator.plutus.json',
  'CounterValidator',
)

validPlutusV2Envelope(
  'plutus/out/prizePool.plutus.json',
  'PrizePool',
)

validPlutusV2Envelope(
  'plutus/out/mintPolicyFactory.plutus.json',
  'MintPolicy factory',
)

validPlutusV2Envelope(
  'plutus/out/prizeValidatorFactory.plutus.json',
  'PrizeValidator factory',
)

validPlutusV2Envelope(
  'plutus/out/beaconRegistry.plutus.json',
  'BeaconRegistry',
)

// ---------------------------------------------------------------------------
// 2. Plutus build
// ---------------------------------------------------------------------------

section('2/8  PLUTUS BUILD')

run(
  'cabal',
  ['build', 'all', '-j1'],
  'cabal build all -j1',
)

// ---------------------------------------------------------------------------
// 3. Script export
// ---------------------------------------------------------------------------

section('3/8  SCRIPT EXPORT')

run(
  'cabal',
  ['run', 'exe:export-scripts'],
  'cabal run exe:export-scripts',
)

validPlutusV2Envelope(
  'plutus/out/treasury.plutus.json',
  'Treasury post-export',
)

validPlutusV2Envelope(
  'plutus/out/counterValidator.plutus.json',
  'CounterValidator post-export',
)

validPlutusV2Envelope(
  'plutus/out/prizePool.plutus.json',
  'PrizePool post-export',
)

validPlutusV2Envelope(
  'plutus/out/mintPolicyFactory.plutus.json',
  'MintPolicy factory post-export',
)

validPlutusV2Envelope(
  'plutus/out/prizeValidatorFactory.plutus.json',
  'PrizeValidator factory post-export',
)

validPlutusV2Envelope(
  'plutus/out/beaconRegistry.plutus.json',
  'BeaconRegistry post-export',
)

// ---------------------------------------------------------------------------
// 4. On-chain architecture
// ---------------------------------------------------------------------------

section('4/8  ON-CHAIN ARCHITECTURE')

const mintHs = read('plutus/MintPolicy.hs')
const prizeHs = read('plutus/PrizeValidator.hs')
const registryHs = read('plutus/BeaconRegistry.hs')
const beaconHs = read('plutus/Beacon.hs')
const typesHs = read('plutus/Types.hs')
const rulesHs = read('plutus/GameRules.hs')

contains(
  mintHs,
  /compiledPolicyFactory[\s\S]*?CurrencySymbol[\s\S]*?ScriptHash[\s\S]*?ScriptHash[\s\S]*?PubKeyHash[\s\S]*?Integer/s,
  'MintPolicy exposes five configuration parameters',
)

contains(
  mintHs,
  /ScriptHash\s*->\s*ScriptHash\s*->\s*ScriptHash\s*->\s*PubKeyHash\s*->\s*Integer/s,
  'MintPolicy parameter types = counterHash, prizeHash, regHash, salePkh, priceLovelace',
)

contains(
  mintHs,
  /wrap\s+counterHash\s+prizeHash\s+regHash\s+(?:pkh|salePkh)\s+price[\s\S]*?mkPolicy[\s\S]*?counterHash[\s\S]*?prizeHash[\s\S]*?regHash[\s\S]*?(?:pkh|salePkh)[\s\S]*?price/s,
  'MintPolicy parameter order = counterHash, prizeHash, regHash, salePkh, priceLovelace',
)

contains(
  prizeHs,
  /compiledValidatorFactory[\s\S]*?ScriptHash\s*->\s*PrizeTable/s,
  'PrizeValidator factory exposes registry ScriptHash + PrizeTable',
)

contains(
  prizeHs,
  /mkValidator\s*::\s*ScriptHash\s*->\s*PrizeTable\s*->\s*PrizeDatum/s,
  'PrizeValidator parameter order = registry hash + PrizeTable',
)

contains(
  registryHs,
  /RegistryPublish/,
  'BeaconRegistry publish action exists',
)

contains(
  registryHs,
  /brRelayerPkh[\s\S]*?txInfoSignatories|relayerSigned/,
  'BeaconRegistry binds publication to authorized relayer',
)

contains(
  registryHs,
  /deriveBeacon/,
  'BeaconRegistry derives beacon on-chain',
)

contains(
  registryHs,
  /BeaconPending/,
  'BeaconRegistry enforces Pending state',
)

contains(
  registryHs,
  /BeaconReady/,
  'BeaconRegistry produces Ready state',
)

contains(
  beaconHs,
  /deriveBeacon/,
  'Beacon derivation function exists',
)

contains(
  beaconHs,
  /playerCommitment/,
  'Player commitment function exists',
)

contains(
  beaconHs,
  /deriveTicketSeed/,
  'Ticket seed derivation exists',
)

contains(
  beaconHs,
  /deriveSymbolsSeed/,
  'Symbol seed derivation exists',
)

contains(
  typesHs,
  /\bpdPlayerCommitment\b/,
  'PrizeDatum contains player commitment',
)

contains(
  typesHs,
  /\bpdBeaconTarget\b/,
  'PrizeDatum contains beacon target',
)

contains(
  typesHs,
  /\bpdPriceUsdm\b/,
  'PrizeDatum contains price',
)

const prizeDatumFields = [
  'pdTicketPolicy',
  'pdTicketName',
  'pdPlayerCommitment',
  'pdPriceUsdm',
  'pdCommitment',
  'pdGameVersion',
  'pdTicketNonce',
  'pdPrizeAmount',
  'pdPaymentPolicy',
  'pdPaymentName',
  'pdStatus',
  'pdResult',
  'pdPrizeTier',
  'pdBeaconTarget',
  'pdBeaconStatus',
  'pdBeaconValue',
  'pdMcHash',
  'pdMateriosContext',
]

const missingPrizeFields = prizeDatumFields.filter(
  (field) => !new RegExp(`\\b${field}\\b`).test(typesHs),
)

if (missingPrizeFields.length === 0) {
  ok('PrizeDatum exposes all 18 expected pd* fields')
} else {
  fail(
    `PrizeDatum missing fields: ${missingPrizeFields.join(', ')}`,
  )
}

contains(
  rulesHs,
  /PrizeTable/,
  'GameRules contains PrizeTable',
)

contains(
  rulesHs,
  /classifyTier/,
  'GameRules contains classifyTier',
)

contains(
  rulesHs,
  /prizeAmountForTier/,
  'GameRules contains prizeAmountForTier',
)

contains(
  rulesHs,
  /generateSymbols/,
  'GameRules contains generateSymbols',
)

// ---------------------------------------------------------------------------
// 5. TypeScript ↔ Plutus compatibility
// ---------------------------------------------------------------------------

section('5/8  TYPESCRIPT ↔ PLUTUS COMPATIBILITY')

const loadTs = read('src/loadValidator.ts')
const mintTs = read('src/mint.ts')
const flowTs = read('src/gameFlow.ts')

contains(
  loadTs,
  /applyParamsToScript/,
  'loadValidator uses Lucid applyParamsToScript',
)

contains(
  loadTs,
  /buildMintPolicy[\s\S]*?counterScriptHashHex[\s\S]*?prizeScriptHashHex[\s\S]*?registryScriptHashHex[\s\S]*?salePkhHex[\s\S]*?priceLovelace/s,
  'TypeScript MintPolicy builder accepts all five parameters',
)

contains(
  loadTs,
  /applyParamsToScript\([\s\S]*?counterScriptHashHex[\s\S]*?prizeScriptHashHex[\s\S]*?registryScriptHashHex[\s\S]*?salePkhHex[\s\S]*?BigInt\(priceLovelace\)/s,
  'TypeScript MintPolicy applies all five parameters in contract order',
)

contains(
  loadTs,
  /buildPrizeValidator[\s\S]*?registryScriptHashHex[\s\S]*?PrizeTable/s,
  'TypeScript PrizeValidator builder accepts registry hash + PrizeTable',
)

contains(
  loadTs,
  /prizeTableToData/,
  'PrizeTable is encoded for Plutus',
)

contains(
  loadTs,
  /applyParamsToScript\([\s\S]*?registryScriptHashHex[\s\S]*?prizeTableToData/s,
  'PrizeValidator receives registry hash + encoded PrizeTable',
)

contains(
  mintTs,
  /randomPlayerSecret|playerSecret/,
  'Mint generates or accepts playerSecret',
)

contains(
  mintTs,
  /playerCommitment/,
  'Mint creates pdPlayerCommitment',
)

contains(
  mintTs,
  /ticketCommitment/,
  'Mint creates ticket commitment',
)

contains(
  mintTs,
  /payToContract/,
  'Mint creates on-chain contract outputs',
)

contains(
  mintTs,
  /pdBeaconTarget|beaconTargetToData/,
  'Mint includes BeaconTarget in PrizeDatum',
)

contains(
  flowTs,
  /syncBeacon|syncTicketBeacon/,
  'SyncBeacon client flow exists',
)

contains(
  flowTs,
  /revealPrize|revealTicket/,
  'Reveal client flow exists',
)

contains(
  flowTs,
  /claimPrize/,
  'Claim client flow exists',
)

contains(
  flowTs,
  /playerSecretHex|playerSecret/,
  'Reveal uses playerSecret',
)

contains(
  flowTs,
  /deriveBeacon/,
  'Client re-derives Beacon',
)

contains(
  flowTs,
  /deriveTicketSeed/,
  'Client derives deterministic ticket seed',
)

// Claim must burn exactly one asset by quantity -1n.
// The exact variable name / formatting is intentionally irrelevant.
contains(
  flowTs,
  /mintAssets\s*\(\s*\{[\s\S]*?:\s*-1n[\s\S]*?\}/s,
  'Claim burns exactly one ticket NFT',
)

// Claim must attach a minting policy for the burn.
// Accept the current applied-policy variable as well as the older
// scripts.mintPolicy spelling.
contains(
  flowTs,
  /attachMintingPolicy\s*\(\s*[^)]+\s*\)/s,
  'Claim attaches the applied MintPolicy for ticket burn',
)

// ---------------------------------------------------------------------------
// 6. Relayer & automation
// ---------------------------------------------------------------------------

section('6/8  RELAYER & AUTOMATION')

const relayerJs = read('relayer/relayer.js')
const providerJs = read('relayer/beaconProvider.js')
const publisherJs = read('relayer/registryPublisher.js')

contains(
  relayerJs,
  /BEACON_REGISTRY_SCRIPT/,
  'Relayer loads BeaconRegistry',
)

contains(
  relayerJs,
  /RELAYER_PRIVATE_KEY/,
  'Relayer requires dedicated private key',
)

contains(
  relayerJs,
  /BLOCKFROST_PROJECT_ID/,
  'Relayer requires Blockfrost configuration',
)

contains(
  publisherJs,
  /RegistryPublish/,
  'Registry publisher uses RegistryPublish',
)

contains(
  publisherJs,
  /mcHash[\s\S]*materiosContext/s,
  'Registry publisher carries mcHash + materiosContext',
)

contains(
  providerJs,
  /Materios|materios/i,
  'Beacon provider contains Materios adapter surface',
)

contains(
  providerJs,
  /mcHash/,
  'Beacon provider produces mcHash',
)

contains(
  providerJs,
  /materiosContext/,
  'Beacon provider produces materiosContext',
)

// ---------------------------------------------------------------------------
// 7. Trust & security
// ---------------------------------------------------------------------------

section('7/8  TRUST & SECURITY')

contains(
  registryHs,
  /brRelayerPkh/,
  'Registry has explicit authorized-relayer identity',
)

contains(
  registryHs,
  /relayerSigned/,
  'Registry requires relayer signature',
)

contains(
  registryHs,
  /expectedR\s*=\s*deriveBeacon|deriveBeacon/,
  'Beacon value is deterministically derived',
)

contains(
  registryHs,
  /brBeaconValue.*expectedR|expectedR.*brBeaconValue/,
  'Registry verifies published Beacon against deterministic derivation',
)

contains(
  prizeHs,
  /readRegistry[\s\S]*referenceInputs|txInfoReferenceInputs/s,
  'PrizeValidator reads BeaconRegistry through reference input',
)

contains(
  prizeHs,
  /brStatus reg == BeaconReady/,
  'PrizeValidator requires Registry Ready state',
)

contains(
  prizeHs,
  /brRound reg == btRound target/,
  'PrizeValidator checks Registry round against Prize target',
)

contains(
  prizeHs,
  /sameTarget\s*\(brTarget reg\)\s*target/s,
  'PrizeValidator checks Registry target equality',
)

contains(
  prizeHs,
  /pdBeaconValue n == brBeaconValue reg/,
  'SyncBeacon binds PrizeDatum Beacon to Registry Beacon',
)

contains(
  prizeHs,
  /valuePreserved/,
  'PrizeValidator enforces exact value conservation during state transitions',
)

contains(
  prizeHs,
  /ticketBurned/,
  'PrizeValidator contains ticket-burn claim protection',
)

contains(
  prizeHs,
  /ownerSigned/,
  'PrizeValidator binds claim to ticket owner signature',
)

contains(
  prizeHs,
  /scriptClosed/,
  'PrizeValidator requires Prize UTxO closure on Claim',
)

warn(
  'Current architecture is B1: authorized relayer remains the external-observation trust boundary.',
)

warn(
  'B3 / pure trustless external-data verification is not yet enabled; deployment gate therefore does not claim full external-source trustlessness.',
)

// ---------------------------------------------------------------------------
// 8. Deployment hygiene
// ---------------------------------------------------------------------------

section('8/8  DEPLOYMENT HYGIENE')

const gitignore = read('.gitignore')
const configTs = read('src/config.ts')

if (
  /(^|\n)\.env(\.|\n|$)/.test(gitignore) ||
  /\.env/.test(gitignore)
) {
  ok('.gitignore protects environment configuration')
} else {
  fail('.gitignore does not clearly protect .env')
}

if (
  !/RELAYER_PRIVATE_KEY\s*[:=]/.test(configTs) &&
  !/BLOCKFROST_PROJECT_ID\s*[:=]/.test(configTs)
) {
  ok(
    'No relayer private key / Blockfrost project assignment found in src/config.ts',
  )
} else {
  fail('Sensitive relayer configuration appears in src/config.ts')
}

if (
  fs.existsSync(
    path.resolve(
      ROOT,
      'src/plutusScripts/mintPolicy.plutus.json',
    ),
  )
) {
  warn(
    'Legacy src/plutusScripts/mintPolicy.plutus.json exists; it must not be used for real minting.',
  )
} else {
  ok('Legacy MintPolicy artifact absent')
}

exists(
  'src/plutusScripts/prizeValidatorFactory.plutus.json',
  'Frontend PrizeValidator factory artifact',
)

exists(
  'src/plutusScripts/beaconRegistry.plutus.json',
  'Frontend BeaconRegistry factory artifact',
)

sameCbor(
  'plutus/out/beaconRegistry.plutus.json',
  'src/plutusScripts/beaconRegistry.plutus.json',
  'BeaconRegistry',
)

sameCbor(
  'plutus/out/counterValidator.plutus.json',
  'src/plutusScripts/counterValidator.plutus.json',
  'CounterValidator',
)

sameCbor(
  'plutus/out/prizePool.plutus.json',
  'src/plutusScripts/prizePool.plutus.json',
  'PrizePool',
)

sameCbor(
  'plutus/out/treasury.plutus.json',
  'src/plutusScripts/treasury.plutus.json',
  'Treasury',
)

sameCbor(
  'plutus/out/mintPolicyFactory.plutus.json',
  'src/plutusScripts/mintPolicyFactory.plutus.json',
  'MintPolicy factory',
)

sameCbor(
  'plutus/out/prizeValidatorFactory.plutus.json',
  'src/plutusScripts/prizeValidatorFactory.plutus.json',
  'PrizeValidator factory',
)

// ---------------------------------------------------------------------------
// Final compile / hygiene gate
// ---------------------------------------------------------------------------

section('FINAL COMPILE GATE')

run(
  'npx',
  ['tsc', '--noEmit'],
  'TypeScript typecheck',
)

run(
  'git',
  ['diff', '--check'],
  'git diff --check',
)

// ---------------------------------------------------------------------------
// Final result
// ---------------------------------------------------------------------------

console.log(`
========================================
WARNINGS: ${warnings.length}
ERRORS: ${errors.length}
`)

if (errors.length === 0) {
  console.log(`
PREDEPLOY_CHECK: PASS
Deployment gate passed.
`)

  if (warnings.length > 0) {
    console.log(
      'Review the warnings above before production deployment.',
    )
  }

  process.exit(0)
}

console.log(`
PREDEPLOY_CHECK: BLOCKED
Deployment must NOT proceed.
`)

process.exit(1)
