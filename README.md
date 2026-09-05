# PRE-RICH — Cardano Scratch & Win

**On-chain scratch and win game built on Cardano.**

Buy NFT tickets, commit a secret, reveal a deterministic outcome, and claim prizes directly to your wallet.  
Critical game logic and economic settlement are enforced on-chain.

---

## Overview

PRE-RICH is a fully on-chain scratch & win protocol with the following properties:

- **NFT Tickets** — Unique serial tickets minted on Cardano
- **Commit-Reveal** — Player secret is committed before the result is known
- **Deterministic Outcomes** — Symbols, tier and payout are derived on-chain
- **Trust-minimized** — Frontend and relayer cannot decide results or payouts
- **Non-custodial** — Prizes are claimed directly by the ticket owner
- **Collectible NFTs** — Winning tickets can be kept after claim

**Current protocol version:** B1 (Authorized Publisher)  
**Target architecture:** B3 (L1-anchored canonical Beacon via Materios)

---

## How it works

1. **Mint** — User buys/mints a unique ticket NFT and commits a secret
2. **SyncBeacon** — The round Beacon is synchronized from the Beacon Registry
3. **Reveal** — User reveals the secret → symbols, tier and prize are derived on-chain
4. **Claim** — Winner claims the crystallized prize (NFT can be kept as collectible)

The result is a pure function of:
