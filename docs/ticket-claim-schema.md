# Unified ticket, reveal, receipt and claim schema

This document defines the single canonical JSON schema that binds the entire ticket lifecycle together.

## 1. Ticket purchase / commitment record

This is created when the user buys or mints the ticket and before the result becomes visible.

```json
{
  "schemaVersion": "pre-rich-ticket-v1",
  "ticketId": "tx-abc-001",
  "purchaseTxHash": "7f4a2d7c7a1d9c4a0f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "walletAddress": "addr1qx9...",
  "gameVersion": "v1",
  "salt": "e7f6c7d2b0a9f8c1d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
  "seed": "7a2d4f1b9c8e0a3d5f6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
  "commitmentHash": "c5d3d8e6a4b7f91c2e3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "createdAt": "2026-08-21T12:00:00Z",
  "status": "committed"
}
```

Rules:
- `ticketId` is the canonical identity of the ticket across the system
- `commitmentHash` is derived from the seed, salt, ticket identity, and game version
- the result remains hidden until reveal is accepted

## 2. Reveal payload

This is created when the user reveals the ticket content and proves that it matches the original commitment.

```json
{
  "schemaVersion": "pre-rich-reveal-v1",
  "ticketId": "tx-abc-001",
  "purchaseTxHash": "7f4a2d7c7a1d9c4a0f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "gameVersion": "v1",
  "seed": "7a2d4f1b9c8e0a3d5f6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6",
  "salt": "e7f6c7d2b0a9f8c1d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2,
    "isWinner": true
  },
  "commitmentHash": "c5d3d8e6a4b7f91c2e3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "revealHash": "d7f1a8c2e9b4d6f0a3c5e7b8d9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
  "revealedAt": "2026-08-21T12:05:00Z"
}
```

Rules:
- `revealHash` must match the original `commitmentHash`
- the result is hidden until reveal is accepted
- the reveal must be tied to the same `ticketId`

## 3. Receipt / attestation record

This is the canonical receipt submitted to Materios and optionally embedded in a batch root or Merkle proof.

```json
{
  "schemaVersion": "pre-rich-receipt-v1",
  "receiptId": "mat-xyz-42",
  "ticketId": "tx-abc-001",
  "purchaseTxHash": "7f4a2d7c7a1d9c4a0f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "commitmentHash": "c5d3d8e6a4b7f91c2e3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "revealHash": "d7f1a8c2e9b4d6f0a3c5e7b8d9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2,
    "isWinner": true
  },
  "gameVersion": "v1",
  "timestamp": "2026-08-21T12:05:00Z",
  "batchRoot": "8d1a0b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "proofDigest": "f8d4c7b1a9e2d6c0f3a5b7d8e9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2"
}
```

Rules:
- `receiptId` is the external attestation key
- `batchRoot` and `proofDigest` are optional but useful for audit/aggregation
- the receipt must correspond to the same `ticketId`

## 4. Claim witness payload

This is the payload that the on-chain claim logic should validate before paying out.

```json
{
  "schemaVersion": "pre-rich-claim-witness-v1",
  "ticketId": "tx-abc-001",
  "receiptId": "mat-xyz-42",
  "purchaseTxHash": "7f4a2d7c7a1d9c4a0f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "commitmentHash": "c5d3d8e6a4b7f91c2e3d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
  "revealHash": "d7f1a8c2e9b4d6f0a3c5e7b8d9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2,
    "isWinner": true
  },
  "gameVersion": "v1",
  "receiptProof": {
    "batchRoot": "8d1a0b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
    "proofDigest": "f8d4c7b1a9e2d6c0f3a5b7d8e9c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2"
  },
  "claimantAddress": "addr1qx9...",
  "claimedAt": "2026-08-21T12:10:00Z"
}
```

Rules:
- claim is valid only if the witness is consistent with `ticketId`, receipt, and commitment
- any mismatch between `commitmentHash` and `revealHash` invalidates the claim
- the browser can only present a claim witness after the reveal and receipt are verified

## 5. End-to-end invariant

The canonical invariant is:

```text
ticketId == purchase.ticketId == reveal.ticketId == receipt.ticketId == claim.ticketId
commitmentHash == purchase.commitmentHash == reveal.commitmentHash == receipt.commitmentHash == claim.commitmentHash
revealHash == reveal.revealHash == receipt.revealHash == claim.revealHash
```

If any of these do not match, the claim is invalid.

## 6. Operational interpretation

- frontend may generate the commitment and reveal payload
- backend or attestation layer may store Materios receipt and Orynq proof bundle
- on-chain validator validates the claim witness, not the browser-side trust signal
- relayer is not a result oracle
