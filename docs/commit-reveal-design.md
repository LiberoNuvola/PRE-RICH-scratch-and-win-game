# Commit-reveal and result secrecy design

## 1. Core rule

No ticket result may be known before the reveal step. The system must use a commit-reveal pattern so that the outcome is hidden at purchase time and only becomes verifiable when the user reveals the ticket.

This rule is mandatory for fairness, anti-front-running, and auditability.

## 2. Why this matters

Without commit-reveal:
- a browser or server can infer or alter the outcome before the user interacts with the ticket
- a player can claim a result that was not truly generated at the time of purchase
- the receipt trail cannot be independently verified
- treasury and prize-pool logic become vulnerable to manipulation or timing attacks

## 3. Required sequence

1. Ticket purchase
   - wallet signs the purchase transaction
   - ticket is minted or created with a unique `ticketId`
   - the system generates a hidden commitment derived from a secret seed and the game parameters

2. Commitment registration
   - the commitment hash is stored in the ticket metadata or in the Materios receipt layer
   - it is not possible to derive the final outcome from the commitment alone

3. Reveal / scratch step
   - user reveals the ticket
   - the system exposes the seed, symbol vector, and final result
   - the reveal payload is bound to the original commitment

4. Receipt generation
   - the receipt includes: `ticketId`, `commitmentHash`, `revealSeed`, `symbolVector`, `result`, `gameVersion`, `attestationId`
   - this receipt is anchored to Materios and optionally to Cardano metadata

5. Claim step
   - claim on-chain only accepts the revealed result if it matches the signed receipt and the stored commitment
   - payout occurs only if the receipt is valid and the result matches the prize logic

## 4. Commitment model

The system should use a deterministic hash approach similar to:

`commitment = sha256(ticketId || seed || gameVersion || salt || ticketNonce)`

Where:
- `ticketId` is unique per ticket
- `seed` is generated at purchase time or reveal time and kept secret until reveal
- `gameVersion` prevents cross-version mismatch
- `salt` prevents precomputation or brute-force correlation
- `ticketNonce` binds the result to the exact minted ticket

The commitment must be recorded before the reveal becomes visible.

## 5. Reveal payload

The reveal payload should contain enough data to reproduce the outcome and verify the commitment. A minimal structure:

```json
{
  "ticketId": "...",
  "gameVersion": "v1",
  "seed": "...",
  "salt": "...",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2
  },
  "commitmentHash": "..."
}
```

The verifier recomputes the hash from the reveal payload and compares it with the recorded commitment.

## 6. Integration with Materios

Materios should act as the receipt and attestation layer, not as the payout authority.

Recommended flow:

- frontend or client creates ticket commitment
- ticket receipt is submitted to Materios
- Materios stores the receipt along with a `receiptId`
- the ticket reveal is published to Materios as a signed receipt
- the resulting Merkle root or batch root is anchored to Cardano periodically

This allows the system to keep user data private while keeping a public audit trail.

## 7. Integration with Cardano on-chain claim

The on-chain claim must validate only the previously attested result.

The claim witness should include:
- `ticketId`
- `receiptId`
- `commitmentHash`
- `revealHash`
- optionally a Merkle proof if the receipt is batched

The validator should reject any claim where:
- the receipt is missing
- the reveal does not match the commitment
- the result is not consistent with the originally defined prize rules
- the claim is attempted before the reveal is recorded

## 8. Security requirements

- No result shall be visible before the reveal action.
- The commitment must be stored before the reveal is accepted.
- The reveal payload must be immutably linked to the ticket.
- The on-chain claim must verify the receipt, not just a browser-side flag.
- Any admin or relayer must never be able to rewrite the reveal without a valid receipt.

## 9. Acceptance criteria

The design is accepted when all of the following are true:

- a user cannot know the result before the reveal step
- the reveal can be independently recomputed and verified
- Materios receipt and Cardano claim are bound by the same ticket identity
- claim validation rejects forged or stale reveal payloads
- the frontend can only display the result after the reveal receipt is verified

## 10. Exact ticket lifecycle and proof flow

The logical flow must be:

1. Purchase / mint
   - generate `ticketId`, `purchaseTxHash`, `gameVersion`, `salt`
   - generate a hidden `seed` or `revealSecret`
   - compute `commitmentHash = sha256(ticketId || seed || salt || gameVersion || ticketNonce)`
   - store `commitmentHash` in the ticket metadata and in the first Materios receipt record

2. Pre-reveal state
   - the browser may display the ticket as "pending reveal"
   - it may never reveal the winning pattern or prize tier before the reveal step
   - no claim can be executed because the reveal receipt is still absent

3. Reveal
   - user reveals `seed`, `salt`, and the generated symbol vector
   - recompute the hash locally and verify it matches the stored commitment
   - build reveal payload: `ticketId`, `seed`, `salt`, `gameVersion`, `symbolVector`, `result`, `commitmentHash`
   - sign the reveal payload or store a witness proof in the receipt layer

4. Materios attestation
   - create a receipt object with fields:
     - `ticketId`
     - `purchaseTxHash`
     - `commitmentHash`
     - `revealHash`
     - `symbolVector`
     - `result`
     - `gameVersion`
     - `timestamp`
     - `receiptId`
     - `batchRoot` if batched
   - submit it to Materios and keep `receiptId` as the canonical attestation reference

5. Orynq proof audit
   - Orynq receives the attestation or a derived proof bundle for process trace / auditability
   - store a tamper-evident proof of the reveal process, not the economic payout itself
   - the proof may be used for dispute resolution and verification, but not as the actual payout authority

6. On-chain claim
   - claim witness includes: `ticketId`, `receiptId`, `commitmentHash`, `revealHash`, optional Merkle path
   - validator checks that:
     - `commitmentHash` existed for the ticket
     - `revealHash` matches the stored commitment
     - the result is consistent with the prize logic
     - the receipt was previously attested by Materios
   - only if all conditions match is the payout allowed

## 11. Recommended data schema

### Purchase / commitment record

```json
{
  "ticketId": "tx-abc-001",
  "purchaseTxHash": "...",
  "gameVersion": "v1",
  "salt": "...",
  "seedHash": "...",
  "commitmentHash": "...",
  "createdAt": "2026-08-21T12:00:00Z"
}
```

### Reveal record

```json
{
  "ticketId": "tx-abc-001",
  "gameVersion": "v1",
  "seed": "...",
  "salt": "...",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2
  },
  "commitmentHash": "...",
  "revealHash": "..."
}
```

### Materios receipt"

```json
{
  "receiptId": "mat-xyz-42",
  "ticketId": "tx-abc-001",
  "purchaseTxHash": "...",
  "commitmentHash": "...",
  "revealHash": "...",
  "symbolVector": ["A", "B", "C", "D"],
  "result": {
    "matchType": "three-of-a-kind",
    "prizeTier": 3,
    "payoutMultiplier": 2
  },
  "timestamp": "2026-08-21T12:05:00Z",
  "batchRoot": "..."
}
```

This schema keeps the sensitive reveal data bound to the ticket identity while preserving a verifiable, public audit trail.

## 12. Practical implication for PRE-RICH

For PRE-RICH, the correct shape is:

- purchase ticket on Cardano
- create commitment and store it externally
- reveal outcome via Materios receipt
- verify against stored commitment
- attach Orynq proof for tamper-evident audit
- only then allow prize claim or payout logic to proceed on-chain

This preserves fairness, privacy, and auditability without giving the frontend any unchecked authority over the result.
