# IMMORTAL / PRE-RICH — Economic Algorithm Conformance Matrix

**Status:** OPERATIONAL / NON-NORMATIVE  
**Repository reference:** `b1-hardening` / `9d0b8c6`  
**Purpose:** track implementation, proof and evidence against canonical economic semantics.  
**Authority:** this matrix does not create or modify economic policy.

## 1. Authority hierarchy

```text
IMMORTAL CONSTITUTION
        ↓
IMMORTAL ECONOMIC KERNEL
        ↓
IMMORTAL ECONOMIC ALGORITHM
        ↓
IMMORTAL ARCHITECTURE / CONFORMANCE
        ↓
CARDANO ADAPTER
        ↓
PRE-RICH PROJECT CONSTITUTION
        ↓
PRE-RICH APPLICATION SPECIFICATION
        ↓
PRE-RICH GAME ECONOMY
        ↓
PRE-RICH ECONOMIC ALGORITHM
        ↓
PRE-RICH CONFORMANCE
        ↓
IMPLEMENTATION
        ↓
TESTS / PROOFS / EVIDENCE
```

This matrix is a measurement layer, not a second authority.

## 2. Status model

| Status | Meaning |
|---|---|
| CLOSED — NORMATIVE | normative choice is settled |
| CLOSED — MODEL | formula/structure is settled |
| VALIDATED — SCOPE BOUNDED | result demonstrated within a declared scope |
| CLOSING — PROOF | structure is settled; proof remains |
| CLOSING — CONFORMANCE | rule is settled; implementation/evidence remains |
| IMPLEMENTATION GAP/FAIL | implementation does not satisfy a settled rule |
| EVIDENCE GAP | conformance evidence is missing or incomplete |
| OPEN DECISION | genuine normative choice is still required |
| HISTORICAL CLOSED | retained for traceability, not authority |

**Critical rule:** `GAP/FAIL ≠ OPEN DECISION`.

## 3. Core conformance matrix

| Area | Semantic | Model | Proof/Validation | Implementation | Evidence |
|---|---|---|---|---|---|
| Liability-first accounting | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| ProtectedCapital | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| `RawSurplus=max(0, EEV-ProtectedCapital)` | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| CurrentActiveClass | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| HighestClassEverActivated | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Class contraction | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Hysteresis semantics/structure | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Hysteresis numerical parametrization | CLOSED baseline/structure | CLOSING | CLOSING | OPEN | OPEN |
| KA/KC/KD roles | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| KA/KC/KD baseline `8/4/4` | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Deterministic exposure | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Expiry finality | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Exact ticket lifetime | OPEN DECISION | — | — | TARGET | OPEN |
| Jackpot isolation/protection | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Jackpot payout mode | OPEN DECISION | — | — | TARGET | OPEN |
| Future Jackpot allocation policy | OPEN only if required | — | — | TARGET | OPEN |
| Ticket transfer / identity | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Voluntary burn / CLAIM != BURN | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Sale atomicity | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Treasury → PrizePool invariants | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Settlement-value preservation | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Reveal → result → crystallization | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Crystallized payout immutability | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Jackpot selection/reset/liability | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Liveness boundary | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Multi-asset verified conversion | CLOSED | CLOSED | CLOSING | CLOSING | OPEN |
| Relayer/backend economic authority | CLOSED — prohibited | CLOSED | CLOSING | CLOSING | OPEN |

## 4. Frozen economic baseline

The following are not OPEN DECISIONS:

- `KA=8`
- `KC=4`
- `KD=4`
- ladder `1/2/3/5/10/25/50/100 USDM`
- Genesis `1 USDM`
- verified PRE Treasury bootstrap `>= 4000 USDM`
- maximum normal payout `500×P`
- liability-first accounting
- `ProtectedCapital`
- `RawSurplus=max(0, EEV-ProtectedCapital)`
- `CurrentActiveClass` may contract
- `HighestClassEverActivated` is monotonic non-decreasing
- expiry finality and dissolution of expired payment commitment
- protected/isolated Jackpot
- `NewJackpot <= RawSurplus`
- Jackpot payout `<= LockedJackpotLiquidity`
- five normal payout tiers: `2→1×P`, `5→2.5×P`, `10→5×P`, `200→100×P`, `1000→500×P`
- Jackpot probability independence
- ticket transferability / identity preservation
- voluntary burn
- `CLAIM != BURN`
- sale atomicity
- Treasury → PrizePool invariants
- settlement-value preservation
- reveal → result → crystallization
- crystallized payout immutability
- Jackpot selection/reset/liability
- liveness boundary
- verified multi-asset settlement conversion

## 5. True OPEN DECISION SET

Exactly three normative items remain:

1. **Jackpot payout mode:** threshold payout OR full current locked-balance payout.
2. **Exact ticket expiry duration.**
3. **Future Jackpot allocation policy**, only if an explicit future allocation policy is actually required.

No other implementation, proof or evidence gap may be relabeled as an OPEN DECISION.

## 6. Historical / non-canonical material

- `75/10/10/5` = HISTORICAL / NON-CANONICAL.
- V25 = HISTORICAL CLOSED.
- `K*=1.482` = historical numerical oracle/reference.
- old Constitution / Architecture / Economic Algorithm documents = ARCHIVE / non-authoritative.
- Beacon B1/B3 historical research = evidence/research, not economic authority.

Historical material may remain useful for regression, comparison and evidence.

## 7. Conformance rule

A failing implementation does not authorize changing the rule it failed to implement.

A normative change requires a new explicit decision. A proof gap requires proof work. An implementation gap requires implementation work. An evidence gap requires reproducible evidence.

```text
DOCUMENTED ≠ IMPLEMENTED
IMPLEMENTED ≠ VERIFIED
REFERENCE MODEL ≠ ON-CHAIN PROOF
GAP/FAIL ≠ OPEN DECISION
```

## 8. Release/conformance gate

A row may be marked `IMPLEMENTED / VERIFIED` only when the relevant semantic rule, model, implementation and reproducible evidence agree on the same repository state.

This matrix deliberately reports implementation/conformance work as open where evidence is incomplete. That does not reopen the frozen economic baseline.
