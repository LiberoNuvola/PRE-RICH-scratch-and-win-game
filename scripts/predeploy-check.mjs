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
  console.log(`\n${title}\n${'='.repeat(title.length)}`)
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
  if (output) console.log(output)
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
PRE-RICH PREDEPLOY GATE — B1
============================
`)

// ---------------------------------------------------------------------------
// 1. Repository & artifacts
// ---------------------------------------------------------------------------

section('1/8  REPOSITORY & ARTIFACTS')

const requiredFiles = [
  ['plutus/out/treasury.plutus.json', 'Treasury'],
  ['plutus/out/counterValidator.plutus.json', 'CounterValidator'],
  ['plutus/out/b1PrizePoolFactory.plutus.json', 'B1PrizePool factory'],
  ['plutus/out/mintPolicyFactory.plutus.json', 'MintPolicy factory'],
  ['plutus/out/prizeValidatorFactory.plutus.json', 'PrizeValidator factory'],
  ['plutus/out/beaconRegistry.plutus.json', 'BeaconRegistry'],

  ['plutus/Beacon.hs', 'Beacon.hs'],
  ['plutus/BeaconRegistry.hs', 'BeaconRegistry.hs'],
  ['plutus/B1PrizePool.hs', 'B1PrizePool.hs'],
  ['plutus/MintPolicy.hs', 'MintPolicy.hs'],
  ['plutus/PrizeValidator.hs', 'PrizeValidator.hs'],
  ['plutus/Types.hs', 'Types.hs'],
  ['plutus/GameRules.hs', 'GameRules.hs'],
  ['plutus/Treasury.hs', 'Treasury.hs'],

  ['src/loadValidator.ts', 'src/loadValidator.ts'],
  ['src/mint.ts', 'src/mint.ts'],
  ['src/gameFlow.ts', 'src/gameFlow.ts'],

  ['src/plutusScripts/treasury.plutus.json', 'Frontend Treasury artifact'],
  ['src/plutusScripts/counterValidator.plutus.json', 'Frontend Counter artifact'],
  ['src/plutusScripts/b1PrizePoolFactory.plutus.json', 'Frontend B1PrizePool factory'],
  ['src/plutusScripts/mintPolicyFactory.plutus.json', 'Frontend MintPolicy factory'],
  ['src/plutusScripts/prizeValidatorFactory.plutus.json', 'Frontend PrizeValidator factory'],
  ['src/plutusScripts/beaconRegistry.plutus.json', 'Frontend BeaconRegistry'],

  ['relayer/relayer.js', 'relayer/relayer.js'],
  ['relayer/beaconProvider.js', 'relayer/beaconProvider.js'],
  ['relayer/registryPublisher.js', 'relayer/registryPublisher.js'],
]

for (const [file, label] of requiredFiles) {
  exists(file, label)
}

for (const [file, label] of [
  ['plutus/out/treasury.plutus.json', 'Treasury'],
  ['plutus/out/counterValidator.plutus.json', 'CounterValidator'],
  ['plutus/out/b1PrizePoolFactory.plutus.json', 'B1PrizePool factory'],
  ['plutus/out/mintPolicyFactory.plutus.json', 'MintPolicy factory'],
  ['plutus/out/prizeValidatorFactory.plutus.json', 'PrizeValidator factory'],
  ['plutus/out/beaconRegistry.plutus.json', 'BeaconRegistry'],
]) {
  validPlutusV2Envelope(file, label)
}

// ---------------------------------------------------------------------------
// 2. Plutus build
// ---------------------------------------------------------------------------

section('2/8  PLUTUS BUILD')

run(
  'cabal',
  ['build', 'all', '-j1'],
  'cabal build all -j1'
)

// ---------------------------------------------------------------------------
// 3. Script export
// ---------------------------------------------------------------------------

section('3/8  SCRIPT EXPORT')

run(
  'cabal',
  ['run', 'exe:export-scripts'],
  'cabal run exe:export-scripts'
)

for (const [file, label] of [
  ['plutus/out/treasury.plutus.json', 'Treasury post-export'],
  ['plutus/out/counterValidator.plutus.json', 'CounterValidator post-export'],
  ['plutus/out/b1PrizePoolFactory.plutus.json', 'B1PrizePool factory post-export'],
  ['plutus/out/mintPolicyFactory.plutus.json', 'MintPolicy factory post-export'],
  ['plutus/out/prizeValidatorFactory.plutus.json', 'PrizeValidator factory post-export'],
  ['plutus/out/beaconRegistry.plutus.json', 'BeaconRegistry post-export'],
]) {
  validPlutusV2Envelope(file, label)
}

// ---------------------------------------------------------------------------
// 4. B1 on-chain architecture
// ---------------------------------------------------------------------------

section('4/8  B1 ON-CHAIN ARCHITECTURE')

const mintHs = read('plutus/MintPolicy.hs')
const poolHs = read('plutus/B1PrizePool.hs')
const prizeHs = read('plutus/PrizeValidator.hs')
const registryHs = read('plutus/BeaconRegistry.hs')
const beaconHs = read('plutus/Beacon.hs')
const typesHs = read('plutus/Types.hs')
const rulesHs = read('plutus/GameRules.hs')

contains(
  mintHs,
  /mkPolicy\s*::[\s\S]*?ScriptHash[\s\S]*?ScriptHash[\s\S]*?ScriptHash[\s\S]*?ScriptHash[\s\S]*?ScriptHash[\s\S]*?Bool/s,
  'MintPolicy exposes five B1 ScriptHash configuration parameters'
)

contains(
  mintHs,
  /counterHash[\s\S]*?prizeHash[\s\S]*?regHash[\s\S]*?treasuryHash[\s\S]*?b1PrizePoolHash/s,
  'MintPolicy binds counter, prize, registry, Treasury and B1PrizePool'
)

contains(
  mintHs,
  /atomicTreasuryPaymentValid/,
  'MintPolicy enforces atomic Treasury payment'
)

contains(
  mintHs,
  /atomicPoolReservationValid/,
  'MintPolicy enforces atomic Pool reservation'
)

contains(
  mintHs,
  /mintedExactlyOneSerial/,
  'MintPolicy enforces exactly one ticket NFT'
)

contains(
  mintHs,
  /pdPrizePoolHash/,
  'MintPolicy binds PrizeDatum to B1PrizePool'
)

contains(
  mintHs,
  /ticketPaymentLovelace\s*::\s*Integer/,
  'B1 sale settlement constant exists on-chain'
)

contains(
  poolHs,
  /TicketIssued/,
  'B1PrizePool supports TicketIssued'
)

contains(
  poolHs,
  /TicketRevealed/,
  'B1PrizePool supports TicketRevealed'
)

contains(
  poolHs,
  /TicketClaimed/,
  'B1PrizePool supports TicketClaimed'
)

contains(
  poolHs,
  /TicketExpired/,
  'B1PrizePool supports TicketExpired'
)

contains(
  poolHs,
  /singletonPoolTokenValid/,
  'B1PrizePool enforces singleton pool authority token'
)

contains(
  poolHs,
  /ticketMinted/,
  'B1PrizePool binds TicketIssued to the ticket mint'
)

contains(
  poolHs,
  /ppUnresolvedReserve/,
  'B1PrizePool tracks unresolved reserve'
)

contains(
  poolHs,
  /ppUnresolvedTicketCount/,
  'B1PrizePool tracks unresolved ticket count'
)

contains(
  poolHs,
  /solvencyInvariant/,
  'B1PrizePool enforces solvency invariant'
)

contains(
  poolHs,
  /effectivePool/,
  'B1PrizePool computes EffectivePool'
)

contains(
  poolHs,
  /oracle|Oracle/i,
  'B1PrizePool contains oracle valuation logic'
)

contains(
  prizeHs,
  /compiledValidatorFactory/,
  'PrizeValidator factory exists'
)

contains(
  prizeHs,
  /txInfoReferenceInputs/,
  'PrizeValidator uses BeaconRegistry reference input'
)

contains(
  prizeHs,
  /BeaconReady/,
  'PrizeValidator requires Registry Ready state'
)

contains(
  prizeHs,
  /sameTarget/,
  'PrizeValidator checks Registry target equality'
)

contains(
  prizeHs,
  /ownerSigned/,
  'PrizeValidator binds Claim to ticket owner signature'
)

contains(
  prizeHs,
  /valuePreserved/,
  'PrizeValidator enforces value conservation'
)

contains(
  registryHs,
  /RegistryPublish/,
  'BeaconRegistry publish action exists'
)

contains(
  registryHs,
  /brRelayerPkh/,
  'BeaconRegistry has explicit relayer identity'
)

contains(
  registryHs,
  /relayerSigned/,
  'BeaconRegistry requires relayer signature'
)

contains(
  registryHs,
  /deriveBeacon/,
  'BeaconRegistry derives/verifies Beacon'
)

contains(
  registryHs,
  /BeaconPending/,
  'BeaconRegistry supports Pending state'
)

contains(
  registryHs,
  /BeaconReady/,
  'BeaconRegistry supports Ready state'
)

contains(
  beaconHs,
  /deriveBeacon/,
  'Beacon derivation exists'
)

contains(
  beaconHs,
  /playerCommitment/,
  'Player commitment exists'
)

contains(
  beaconHs,
  /deriveTicketSeed/,
  'Ticket seed derivation exists'
)

contains(
  beaconHs,
  /deriveSymbolsSeed/,
  'Symbols seed derivation exists'
)

for (const field of [
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
  'pdPrizePoolHash',
  'pdIssuedAt',
  'pdExpiresAt',
]) {
  contains(
    typesHs,
    new RegExp(`\\b${field}\\b`),
    `PrizeDatum contains ${field}`
  )
}

contains(
  typesHs,
  /B1PrizePoolDatum/,
  'B1PrizePoolDatum type exists'
)

contains(
  typesHs,
  /B1PrizePoolAction/,
  'B1PrizePoolAction type exists'
)

contains(
  rulesHs,
  /PrizeTable/,
  'GameRules contains PrizeTable'
)

contains(
  rulesHs,
  /classifyTier/,
  'GameRules contains classifyTier'
)

contains(
  rulesHs,
  /prizeAmountForTier/,
  'GameRules contains prizeAmountForTier'
)

contains(
  rulesHs,
  /generateSymbols/,
  'GameRules contains generateSymbols'
)

// ---------------------------------------------------------------------------
// 5. TypeScript ↔ Plutus compatibility
// ---------------------------------------------------------------------------

section('5/8  B1 TYPESCRIPT ↔ PLUTUS COMPATIBILITY')

const loadTs = read('src/loadValidator.ts')
const mintTs = read('src/mint.ts')
const flowTs = read('src/gameFlow.ts')
const configTs = read('src/config.ts')

contains(
  loadTs,
  /b1PrizePoolFactory\.plutus\.json/,
  'loadValidator imports B1PrizePool factory'
)

contains(
  loadTs,
  /buildB1PrizePool/,
  'loadValidator exposes buildB1PrizePool'
)

contains(
  loadTs,
  /applyParamsToScript/,
  'loadValidator uses applyParamsToScript'
)

contains(
  loadTs,
  /buildMintPolicy\s*\([\s\S]*?counterScriptHashHex[\s\S]*?prizeScriptHashHex[\s\S]*?registryScriptHashHex[\s\S]*?treasuryScriptHashHex[\s\S]*?b1PrizePoolScriptHashHex/s,
  'TypeScript MintPolicy builder accepts all five B1 hashes'
)

contains(
  loadTs,
  /applyParamsToScript\([\s\S]*?counterScriptHashHex[\s\S]*?prizeScriptHashHex[\s\S]*?registryScriptHashHex[\s\S]*?treasuryScriptHashHex[\s\S]*?b1PrizePoolScriptHashHex/s,
  'TypeScript applies MintPolicy parameters in B1 order'
)

contains(
  loadTs,
  /b1PrizePoolHash/,
  'TypeScript wiring exposes B1PrizePool hash'
)

contains(
  loadTs,
  /mintPolicy[\s\S]*?b1PrizePoolHash/s,
  'MintPolicy is wired with the B1PrizePool dependency'
)

contains(
  mintTs,
  /TICKET_PAYMENT_LOVELACE/,
  'Mint uses canonical settlement constant'
)

contains(
  mintTs,
  /b1PrizePool/i,
  'Mint flow references B1PrizePool'
)

contains(
  mintTs,
  /payToContract/,
  'Mint constructs protocol outputs'
)

contains(
  mintTs,
  /pdPrizePoolHash/,
  'Mint binds PrizeDatum to B1PrizePool'
)

contains(
  mintTs,
  /playerCommitment/,
  'Mint creates player commitment'
)

contains(
  mintTs,
  /ticketCommitment/,
  'Mint creates ticket commitment'
)

contains(
  mintTs,
  /TICKET_PAYMENT_LOVELACE[\s\S]*?payToContract|payToContract[\s\S]*?TICKET_PAYMENT_LOVELACE/s,
  'Mint settlement uses the canonical Treasury payment amount'
)

contains(
  mintTs,
  /b1PrizePool[\s\S]*?payToContract|payToContract[\s\S]*?b1PrizePool/s,
  'Mint updates the B1PrizePool in the sale flow'
)

contains(
  flowTs,
  /syncBeacon|syncTicketBeacon/,
  'SyncBeacon flow exists'
)

contains(
  flowTs,
  /revealPrize|revealTicket/,
  'Reveal flow exists'
)

contains(
  flowTs,
  /claimPrize/,
  'Claim flow exists'
)

contains(
  flowTs,
  /playerSecretHex|playerSecret/,
  'Reveal is bound to player secret'
)

contains(
  flowTs,
  /deriveBeacon/,
  'Client re-derives Beacon'
)

contains(
  flowTs,
  /deriveTicketSeed/,
  'Client derives ticket seed'
)

contains(
  flowTs,
  /b1PrizePool/i,
  'Reveal/Claim coordinates B1PrizePool'
)

contains(
  configTs,
  /GENESIS_TICKET_PRICE_USDM\s*=\s*100/,
  'Genesis price = 1 USDM'
)

contains(
  configTs,
  /TICKET_PAYMENT_LOVELACE\s*=\s*1_000_000/,
  'Preprod settlement baseline = 1 ADA'
)

// ---------------------------------------------------------------------------
// 6. Relayer & B1 scope
// ---------------------------------------------------------------------------

section('6/8  RELAYER & B1 SCOPE')

const relayerJs = read('relayer/relayer.js')
const providerJs = read('relayer/beaconProvider.js')
const publisherJs = read('relayer/registryPublisher.js')

contains(
  relayerJs,
  /BEACON_REGISTRY_SCRIPT/,
  'Relayer loads BeaconRegistry'
)

contains(
  relayerJs,
  /RELAYER_PRIVATE_KEY/,
  'Relayer requires dedicated private key'
)

contains(
  relayerJs,
  /BLOCKFROST_PROJECT_ID/,
  'Relayer requires Blockfrost configuration'
)

contains(
  publisherJs,
  /RegistryPublish/,
  'Registry publisher uses RegistryPublish'
)

contains(
  publisherJs,
  /mcHash[\s\S]*materiosContext/s,
  'Registry publisher carries mcHash + materiosContext'
)

contains(
  providerJs,
  /Materios|materios/i,
  'Beacon provider has Materios adapter surface'
)

contains(
  providerJs,
  /mcHash/,
  'Beacon provider produces mcHash'
)

contains(
  providerJs,
  /materiosContext/,
  'Beacon provider produces materiosContext'
)

warn(
  'B1 external-data boundary remains the authorized relayer / BeaconRegistry publication path.'
)

warn(
  'B3 pure trustless external-data verification is NOT enabled and is NOT claimed.'
)

// ---------------------------------------------------------------------------
// 7. Constitutional / economic invariants
// ---------------------------------------------------------------------------

section('7/8  CONSTITUTION & ECONOMIC SAFETY')

contains(
  mintTs,
  /priceUsdm|GENESIS_TICKET_PRICE_USDM/,
  'Mint carries explicit economic ticket price'
)

contains(
  mintHs,
  /pdPriceUsdm/,
  'MintPolicy validates price inside PrizeDatum'
)

contains(
  poolHs,
  /ppLockedJackpot/,
  'Locked jackpot liquidity is accounted for'
)

contains(
  poolHs,
  /ppJackpotThreshold/,
  'Jackpot threshold is on-chain state'
)

contains(
  poolHs,
  /TicketExpired/,
  'Expiry has explicit economic state transition'
)

contains(
  typesHs,
  /pdExpiresAt/,
  'PrizeDatum contains expiry'
)

contains(
  typesHs,
  /pdIssuedAt/,
  'PrizeDatum contains issuance time'
)

contains(
  flowTs,
  /claimRedeemer/,
  'Claim has explicit protocol redeemer'
)

contains(
  flowTs,
  /payToAddress\(buyer,\s*\{\s*\[[^\]]+\]:\s*1n\s*\}\)/s,
  'Claim returns the ticket NFT to the claimant'
)

// The ticket is intentionally NOT required to be burned by B1.
if (
  /attachMintingPolicy[\s\S]*?mintAssets[\s\S]*?-1n/s.test(flowTs)
) {
  warn(
    'Claim flow contains an explicit burn path; verify it remains optional and is never required by B1.'
  )
} else {
  ok('B1 does not require NFT burn on claim')
}

// Reject the old sale architecture explicitly.
if (/salePkh/.test(mintHs) || /priceLovelace/.test(mintHs)) {
  fail(
    'Legacy MintPolicy salePkh/priceLovelace architecture is still present'
  )
} else {
  ok(
    'Legacy MintPolicy salePkh/priceLovelace architecture absent'
  )
}

// ---------------------------------------------------------------------------
// 8. Artifact synchronization & final typecheck
// ---------------------------------------------------------------------------

section('8/8  DEPLOYMENT HYGIENE')

const gitignore = read('.gitignore')

if (/\.env/.test(gitignore)) {
  ok('.gitignore protects environment configuration')
} else {
  fail('.gitignore does not clearly protect .env')
}

if (
  !/RELAYER_PRIVATE_KEY\s*[:=]/.test(configTs) &&
  !/BLOCKFROST_PROJECT_ID\s*[:=]/.test(configTs)
) {
  ok(
    'No relayer private key / Blockfrost project assignment found in src/config.ts'
  )
} else {
  fail(
    'Sensitive relayer configuration appears in src/config.ts'
  )
}

if (
  fs.existsSync(
    path.resolve(ROOT, 'src/plutusScripts/mintPolicy.plutus.json')
  )
) {
  warn(
    'Legacy src/plutusScripts/mintPolicy.plutus.json exists; it must not be used for real minting.'
  )
} else {
  ok('Legacy MintPolicy artifact absent')
}

for (const [generated, frontend, label] of [
  [
    'plutus/out/treasury.plutus.json',
    'src/plutusScripts/treasury.plutus.json',
    'Treasury',
  ],
  [
    'plutus/out/counterValidator.plutus.json',
    'src/plutusScripts/counterValidator.plutus.json',
    'CounterValidator',
  ],
  [
    'plutus/out/b1PrizePoolFactory.plutus.json',
    'src/plutusScripts/b1PrizePoolFactory.plutus.json',
    'B1PrizePool factory',
  ],
  [
    'plutus/out/mintPolicyFactory.plutus.json',
    'src/plutusScripts/mintPolicyFactory.plutus.json',
    'MintPolicy factory',
  ],
  [
    'plutus/out/prizeValidatorFactory.plutus.json',
    'src/plutusScripts/prizeValidatorFactory.plutus.json',
    'PrizeValidator factory',
  ],
  [
    'plutus/out/beaconRegistry.plutus.json',
    'src/plutusScripts/beaconRegistry.plutus.json',
    'BeaconRegistry',
  ],
]) {
  sameCbor(generated, frontend, label)
}

section('FINAL COMPILE GATE')

run(
  'npx',
  ['tsc', '--noEmit'],
  'TypeScript typecheck'
)

run(
  'git',
  ['diff', '--check'],
  'git diff --check'
)

console.log(`
========================================
WARNINGS: ${warnings.length}
ERRORS: ${errors.length}
`)

if (errors.length === 0) {
  console.log(`
B1 PREDEPLOY_CHECK: PASS
B1 scope is verified by this gate.
B3 external-data trustlessness is NOT claimed.
`)

  if (warnings.length > 0) {
    console.log(
      'Review the B1 scope warnings above before deployment.'
    )
  }

  process.exit(0)
}

console.log(`
B1 PREDEPLOY_CHECK: BLOCKED
Deployment must NOT proceed.
`)

process.exit(1)
