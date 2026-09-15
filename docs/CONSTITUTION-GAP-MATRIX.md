# IMMORTAL / PRE-RICH — Constitution & Conformance Gap Matrix

**Status:** OPERATIONAL / NON-NORMATIVE  
**Repository reference:** `b1-hardening` / `9d0b8c6`  
**Role:** implementation/conformance tracker subordinate to the canonical Constitutions and specifications.

> This document does not define protocol semantics. It records gaps against them.

## 1. Canonical authority

Primary authority is external to this matrix:

- `docs/IMMORTAL/CONSTITUTION.md`
- `docs/IMMORTAL/ECONOMIC-KERNEL.md`
- `docs/IMMORTAL/ECONOMIC-ALGORITHM.md`
- `docs/IMMORTAL/ARCHITECTURE.md`
- `docs/IMMORTAL/CONFORMANCE.md`
- `docs/CARDANO/ADAPTER-SPECIFICATION.md`
- `docs/PRE-RICH/CONSTITUTION.md`
- `docs/PRE-RICH/APPLICATION-SPECIFICATION.md`
- `docs/PRE-RICH/GAME-ECONOMY.md`
- `docs/PRE-RICH/ECONOMIC-ALGORITHM.md`
- `docs/PRE-RICH/CONFORMANCE.md`

The matrix cannot supersede any of them.

## 2. Status legend

| Status | Meaning |
|---|---|
| CLOSED | semantic/normative rule is settled |
| CLOSING | settled rule with proof, implementation or conformance work remaining |
| IMPLEMENTATION GAP/FAIL | implementation contradicts or omits a settled rule |
| EVIDENCE GAP | evidence is incomplete |
| TARGET | future architecture |
| HISTORICAL CLOSED | retained for traceability, not current authority |
| OPEN DECISION | genuine normative choice remains |

`IMPLEMENTATION GAP/FAIL` never means `OPEN DECISION`.

## 3. Canonical baseline to protect

The gap tracker must never rewrite the following as proposals:

| Requirement | Semantic status | Conformance status |
|---|---|---|
| KA=8, KC=4, KD=4 | CLOSED | CLOSING / evidence |
| Hysteresis semantic/structural rule | CLOSED | numerical/implementation/evidence CLOSING/OPEN |
| Ladder 1/2/3/5/10/25/50/100 USDM | CLOSED | CLOSING |
| Genesis = 1 USDM | CLOSED | CLOSING |
| PRE Treasury bootstrap >= 4000 USDM | CLOSED | CLOSING |
| Maximum normal payout 500×P | CLOSED | CLOSING |
| Liability-first accounting | CLOSED | CLOSING |
| ProtectedCapital | CLOSED | CLOSING |
| `RawSurplus=max(0, EEV-ProtectedCapital)` | CLOSED | CLOSING |
| CurrentActiveClass contraction | CLOSED | CLOSING |
| HighestClassEverActivated monotonicity | CLOSED | CLOSING |
| Expiry finality | CLOSED | CLOSING |
| Jackpot isolation/protection | CLOSED | CLOSING |
| `NewJackpot <= RawSurplus` | CLOSED | CLOSING |
| Jackpot payout <= LockedJackpotLiquidity | CLOSED | CLOSING |
| Ticket identity/transferability | CLOSED | CLOSING |
| Voluntary burn / CLAIM != BURN | CLOSED | CLOSING |
| Sale atomicity | CLOSED | CLOSING |
| Treasury → PrizePool invariants | CLOSED | CLOSING |
| Settlement-value preservation | CLOSED | CLOSING |
| Reveal → result → crystallization | CLOSED | CLOSING |
| Crystallized payout immutability | CLOSED | CLOSING |
| Jackpot selection/reset/liability | CLOSED | CLOSING |
| Liveness boundary | CLOSED | CLOSING |
| Verified multi-asset conversion | CLOSED | CLOSING |

## 4. True normative OPEN set

Only the following may be marked `OPEN DECISION`:

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy, only if an explicit future allocation policy is required.

KA/KC/KD and hysteresis are **not** in this set.

## 5. Gap register

| Area | Current gap | Classification | Required treatment |
|---|---|---|---|
| Hysteresis | numerical derivation/parametrization | CLOSING | derive/validate without changing semantic rule |
| Hysteresis | on-chain enforcement | IMPLEMENTATION GAP / CLOSING | implement against canonical semantics |
| Hysteresis | conformance evidence | EVIDENCE GAP | produce reproducible evidence |
| KA/KC/KD | quantitative robustness validation | CLOSING | validate the canonical baseline |
| KA/KC/KD | implementation | IMPLEMENTATION GAP / CLOSING | enforce `8/4/4` and their roles |
| KA/KC/KD | evidence | EVIDENCE GAP | produce conformance evidence |
| SALE | atomic payment/reservation/issuance | IMPLEMENTATION GAP / CLOSING | prove atomicity |
| REVEAL | deterministic result and crystallization | CLOSING | complete parity/proof |
| EXPIRY | finality / late-reveal non-claimability | CLOSING | prove transition behavior |
| CLAIM | frozen payout and once-only liability transition | CLOSING | prove current path |
| Multi-asset | verified conversion enforcement | CLOSING | validate identity, price, freshness, decimals, rounding, min-UTxO and rejection |
| Jackpot | lifecycle/accounting enforcement | CLOSING | prove isolation, funding, selection, reset and liability rules |
| Liveness | permissionless/event-driven execution | CLOSING | verify triggerability and safe stall behavior |
| Infinite horizon | transition relation / invariance proof | CLOSING — PROOF | complete proof or explicitly bound the claim |

## 6. Historical classification

The following may appear in historical evidence but must not be treated as current policy:

- `75/10/10/5` allocation.
- V25 artifacts.
- `K*=1.482`.
- old Constitution / Architecture / Economic Algorithm documents.
- historical Beacon B1/B3 research.

When referenced, label them `HISTORICAL`, `NON-CANONICAL`, `EXPERIMENTAL` or `EVIDENCE` as appropriate.

## 7. Audit rule

For every mismatch:

1. identify the highest authoritative source;
2. classify the mismatch as semantic, model, proof/validation, implementation or evidence;
3. correct the subordinate artifact;
4. never promote implementation behavior into economic authority;
5. never reopen a CLOSED normative decision without an explicit new decision.

## 8. Finality statement

This matrix is not a second Constitution, Economic Algorithm or policy document.

Its job is to answer only:

> **What is specified, what is implemented, what is proved, and what evidence is still missing?**

That separation is mandatory for the IMMORTAL / PRE-RICH documentation set.
