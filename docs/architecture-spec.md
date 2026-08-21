# PreRich architecture specification

## 1. Goal

Build a Cardano app where:
- users connect a wallet,
- buy or mint a ticket serial NFT,
- play / reveal the ticket content,
- claim prizes from on-chain validation,
- fees accumulate in a treasury and are redistributed automatically.

The architecture must keep secret material out of the browser and keep critical logic on-chain wherever possible.

## 2. Core components

### 2.1 Frontend (browser / Vite + TypeScript)
Responsible for:
- wallet connection
- ticket selection and purchase UX
- minting transaction building and signing
- claim flow UI
- simple balance display and notifications

Files:
- `src/main.ts`
- `src/wallet.ts`
- `src/claim.ts`
- `src/tickets.ts`
- `src/mint.ts`
- `src/ui.ts`

The frontend must not hold admin keys. It only signs user transactions.

### 2.2 Proxy / backend read layer
Responsible for:
- hiding Blockfrost project id from the browser
- read-only access to chain data
- rate limiting and key validation

Files:
- `blockfrost-proxy/proxy.js`

The browser must call the proxy, never Blockfrost directly.

### 2.3 On-chain scripts

#### Mint policy / counter
Responsible for:
- serial NFT generation
- uniqueness enforcement via on-chain counter UTxO
- exact token name derivation from counter value

Files:
- `plutus/MintPolicy.hs`
- `plutus/CounterValidator.hs`

#### Prize validator
Responsible for:
- validating claim conditions
- verifying payment asset type and payout rules
- preventing invalid or forged claims

File:
- `plutus/PrizeValidator.hs`

#### Treasury validator
Responsible for:
- collecting fees from ticket purchases and mint flows
- enforcing threshold logic
- allowing distribution when funds reach a configured threshold

File:
- `plutus/Treasury.hs`

#### Prize-pool validator
Responsible for:
- allocating prize UTxOs according to weighted randomization or deterministic index selection
- ensuring prizes are spent only under valid conditions

Planned file:
- `plutus/PrizePool.hs`

## 3. Fee flow

### 3.1 Sources of funds
Ticket purchase fees plus optional mint fees accumulate in the treasury address.

### 3.2 Routing
When treasury balance reaches a configured threshold, the distributor relayer triggers a transaction that routes funds to:
- prize pool
- staking pool or reserve
- relayer reward
- business reserve / operating fund
- advertising inventory / slot funding budget

Suggested default split:
- 50% prize pool
- 30% staking pool
- 19.5% reserve
- 0.5% relayer reward

This should be encoded in the treasury datum and reviewed by admin before production use.

### 3.3 Ad-slot monetization
Ad slots are a secondary revenue stream and should be treated as a time-based lease, not a manual admin tool.

The accepted pricing model is:
- base price quoted in USDM
- official packages: 1h, 6h, 1d, 3d
- final payment accepted in USDM, ADA, or PRE if the equivalent USDM value meets the required threshold
- slot expiry is deterministic from the selected package duration
- once the lease expires, the slot returns to availability automatically

This keeps the sponsorship channel simple, auditable, and fully compatible with the treasury flow.

## 4. Relayer / distributor
Responsible for:
- polling treasury state
- detecting threshold reach
- constructing and submitting distribution tx
- optionally handling swaps if multi-asset distribution is required

Files:
- `relayer/relayer.js`
- `relayer/README.md`

The relayer is not a privileged admin key holder; it is an automated facilitator receiving a small reward for processing the tx.

## 5. Administrative responsibility
Admin responsibilities:
- deploy scripts to preprod/mainnet
- initialize treasury and prize pool UTxOs
- set thresholds and distribution params
- maintain operational wallet keys offline
- monitor relayer performance and treasury health

The admin must not live inside browser code.

## 6. Human automation split

### Fully automated
- wallet connection and signing
- balance refresh
- tx build and submit for user actions
- treasury threshold detection and distribution trigger by relayer
- serial NFT counter progression on-chain

### Requires human action
- initial script deployment
- initial treasury/prize-pool creation
- governance parameter setup
- relayer configuration and monitoring
- emergency stop / operational rollback

## 7. Security rules
- no Blockfrost secret in frontend code
- no admin keys in browser build
- use proxy for read-only chain queries
- validate every user-supplied address / asset / datum before tx construction
- run full review before preprod launch
- no ticket result may be visible before the reveal step
- commit-reveal must be used so the result is hidden until the reveal is validated
- the claim path must verify the receipt and the commitment, not just a browser-side value

## 7.1 Commit-reveal and result secrecy
The ticket lifecycle must enforce a strict commit-reveal pattern:

1. the ticket mint or purchase records a unique `ticketId` and a hidden commitment hash
2. the final symbol vector and result stay hidden until the reveal step
3. the reveal payload must match the original commitment before any claim is accepted
4. the attestation is recorded in a receipt layer such as Materios or equivalent audit storage
5. the on-chain claim validator only accepts payout if the revealed outcome matches the receipt-backed commitment

This is the protection against early knowledge of the result, front-running, and forged payout attempts.

## 8. Review gate before preprod
The following must be complete before entering `preprod` tests:
- [ ] UI migration and asset cleanup complete
- [ ] prize-pool validator implemented
- [ ] treasury validator implemented and reviewed
- [ ] relayer reference implemented and reviewed
- [ ] admin scripts and governance params defined
- [ ] commit-reveal and result secrecy rules documented and reviewed
- [ ] Materios receipt integration defined
- [ ] build/test scripts operational
- [ ] proxy hardened and documented
- [ ] runbook written and reviewed

Only after this gate passes do we start preprod tests.

## 9. Next milestone
The next milestone should be closing the remaining implementation tasks, then executing the review gate, and only then moving to end-to-end preprod testing.
