Relayer (reference)
====================

This is a minimal reference relayer that watches a `treasury` script address and triggers distribution
when the configured threshold is reached. It uses `lucid-cardano` and Blockfrost for chain queries.

Setup
-----

- Copy `.env.example` to `.env` and set `BLOCKFROST_PROJECT_ID`, `NETWORK` (`Preprod`), and the relayer wallet.
- Install dependencies with `npm install` in the project root.
- Configure treasury addresses and thresholds to match the deployed treasury policy.

Run
---

```bash
npm run relayer
```

Default policy
--------------

- threshold: 25 ADA
- split after relayer fee: 50% prize, 30% stake, 19.5% reserve
- relayer reward: 0.5% of treasury, minimum 0.2 ADA

Notes
-----
- This relayer is a reference implementation and should be treated as an operational scaffold before production hardening.
- The browser never owns treasury authority; the relayer is only an automated facilitator that receives a policy-defined reward.
- The relayer never decides the ticket result. It only observes treasury state and submits a distribution transaction once the threshold and split policy are satisfied.
- Claim validation must be independent from the relayer: the reveal and receipt proof must be validated before any user payout is accepted on-chain.

Result and attestation gate
--------------------------
- the reveal is not considered valid until the commitment is checked against the stored seed / salt / ticket identity
- the receipt is stored with Materios and tied to the same `ticketId`
- Orynq provides an audit proof bundle for dispute resolution and transparency
- the relayer may distribute treasury funds, but it must not rewrite or infer a ticket outcome from a browser-provided value
