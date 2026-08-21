# Orynq proof verification design

## 1. Role of Orynq

Orynq is not a payout authority and not a treasury authority. It is an external proof and audit layer that records the process trail for the ticket lifecycle:

- ticket purchase / mint
- commitment generation
- reveal and receipt publication
- claim preparation
- final payout verification

The purpose is to provide an independent attestation trail that can be checked by users, operators, and auditors without trusting the browser or the relayer alone.

## 2. Principle

Cardano L1 remains the economic and enforcement layer. Materios and Orynq remain evidence layers that support verification, dispute resolution, and public auditability.

## 3. Proof bundle

When a ticket is revealed, the system should prepare a proof bundle containing:

```json
{
  "ticketId": "tx-abc-001",
  "receiptId": "mat-xyz-42",
  "purchaseTxHash": "...",
  "commitmentHash": "...",
  "revealHash": "...",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2
  },
  "materiosBatchRoot": "...",
  "timestamp": "2026-08-21T12:05:00Z",
  "proofDigest": "..."
}
```

This bundle is submitted or anchored via Orynq as a tamper-evident audit object.

## 4. Verification flow

A verifier should do the following:

1. fetch the reveal payload from the receipt layer
2. recompute the commitment from the stored seed / salt / ticket identity
3. recompute the reveal hash
4. compare the recomputed hash to the original commitment
5. confirm the receipt matches the same `ticketId`
6. confirm the Orynq proof bundle references the same `receiptId`
7. confirm the proof bundle is consistent with the Materios batch root or receipt hash

If any step fails, the reveal is rejected and the claim cannot continue.

## 5. Security boundaries

Orynq must never be used as a replacement for on-chain validation. It supports, but does not enforce, the following:

- final result history
- dispute resolution
- public log of reveal steps
- independent verification of the receipt chain

The final economic decision remains on-chain, in the validator and in the treasury distribution scripts.

## 6. Acceptance criteria

The design is accepted when:

- a result cannot be displayed before the reveal is verified
- the same `ticketId` binds purchase, receipt, and proof
- Orynq and Materios can be cross-checked without trusting browser code
- a claim becomes valid only after the reveal proof is consistent with the commitment
- a treasury relayer does not process any outcome decision based on unaudited browser data
