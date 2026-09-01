
---

## File 2 — `docs/CONSTITUTION-GAP-MATRIX.md`

```markdown
# PRE-RICH Constitution — Gap Matrix

**Companion to:** `docs/CONSTITUTION.md`  
**Rule:** do not mark a row DONE unless Plutus + off-chain + tests agree.

Legend:

| Tag | Meaning |
|-----|---------|
| DONE | Enforced and tested |
| PARTIAL | Direction present; invariants incomplete or untested |
| GAP | Missing or contradictory |
| N/A | Not applicable to this file |
| UNKNOWN | Needs file-level audit before claim |

---

## A. Cross-cutting invariants

| ID | Invariant | Status | Notes / next proof |
|----|-----------|--------|--------------------|
| C1 | No team/dev treasury share | PARTIAL | Relayer fee / PKH splits must be reclassified vs constitution |
| C2 | Treasury → script categories only | PARTIAL | Confirm Treasury validator outputs to scripts not admin prize PKH |
| C3 | Ticket not auto-burned on claim | UNKNOWN/GAP | Historical design often burned on claim — must match validator |
| C4 | Pre-reveal opacity (§22) | PARTIAL | Commit-reveal path exists; formal non-deducibility tests missing |
| C5 | Payout crystallized at reveal | UNKNOWN/GAP | Must be in datum at reveal; claim only pays frozen amount |
| C6 | effectivePool accounting | GAP | Liabilities + reserve not first-class |
| C7 | Jackpot automatic on threshold | GAP | Rules + on-chain activation |
| C8 | Floor 2 USDM | PARTIAL/GAP | Confirm GameRules + oracle units |
| C9 | expiresAt ≥ 365d at mint | GAP | Datum fields + mint policy checks |
| C10 | Reveal after expiry, no claim | GAP | State machine |
| C11 | Single claim | PARTIAL | Must be state-locked CLAIMED |
| C12 | Transfer without result leak | PARTIAL | Depends on uniform UNREVEALED datum |
| C13 | Charli3 conversion on-chain | PARTIAL | Architecture mentions oracle; validator binding TBD |
| C14 | Beacon not fairness authority (B3) | GAP | Today B1 publisher; PoC-0 only extraction |
| C15 | Backend cannot decide outcome | PARTIAL | Docs intent; end-to-end proof pending |
| C16 | Governance cannot break constitution | GAP | Need frozen constitution params vs governable bounds |

---

## B. `plutus/` (on-chain)

| File / module | Constitution relevance | Status | Action |
|---------------|----------------------|--------|--------|
| `Types.hs` | Ticket/prize/treasury/beacon datums & actions | PARTIAL | Add explicit ticket statuses: UNREVEALED, REVEALED_*, CLAIMABLE, CLAIMED; expiresAt; frozen payout fields |
| `Beacon.hs` | Domain separation, deriveTicketSeed, deriveSymbolsSeed | PARTIAL | Keep domain separation; align with constitution §7 |
| `BeaconRegistry.hs` / registry | Beacon publish path | PARTIAL | Document B1; do not claim B3 |
| `PrizeValidator.hs` | Reveal, claim, payout, burn | PARTIAL/GAP | Align claim keep-NFT vs burn; freeze payout; expiry rules |
| `PrizePool.hs` | Liquidity / legacy index | GAP vs §19 | Move toward effectivePool + liabilities; legacy path clearly isolated |
| `Treasury.hs` | Splits | PARTIAL | Outputs to PrizePool script; no team; maintenance category |
| `GameRules.hs` | Symbols 1–5, tiers, amounts, floor | PARTIAL | Floor 2 USDM; jackpot separate path; effectivePool input |
| `MintPolicy.hs` / counter | Ticket mint identity | PARTIAL | issuedAt/expiresAt; unique asset; secondary-market safe |
| Export / factories | Script hashes wiring | PARTIAL | Rebuild after type changes |

---

## C. `src/` (off-chain / UI)

| File | Relevance | Status | Action |
|------|-----------|--------|--------|
| `ticketSchema.ts` | Public ticket shape | PARTIAL | Only allowed pre-reveal fields |
| `tickets.ts` / `mint.ts` | Mint, metadata | PARTIAL | 2 USDM display; expiry; no result fields |
| `gameFlow.ts` / `gameRules.ts` | Client derivation mirror | PARTIAL | Must match Plutus byte-for-byte rules |
| `beacon.ts` / `createRound.ts` / `registryFlow.ts` | Round + beacon | PARTIAL | B1 labeling; no B3 claims in UI |
| `claim.ts` / `claimFlow.ts` | Claim UX + txs | GAP/PARTIAL | Keep NFT default; optional burn; single claim |
| `treasuryPolicy.ts` | Client treasury helpers | PARTIAL | Align with script categories |
| `config.ts` | Params | PARTIAL | Separate governable vs constitutional constants |
| `ui.ts` / `main.ts` | UX copy | PARTIAL | Honest B1 beacon; historical expired wins |
| `loadValidator.ts` | Script loading | N/A operational | Must track export-scripts output |
| `plutusScripts/` | Compiled artifacts | PARTIAL | Regenerate after plutus changes |

---

## D. `poc/`

| Path | Relevance | Status | Action |
|------|-----------|--------|--------|
| `poc/materios-checkpoint/` | PoC-0 CanonicalCheckpoint | PARTIAL | Extraction only; NOT B3; NOT fairness oracle |
| Future poc finality/storage | B3 path | GAP | Per beacon canonicality spec |

---

## E. `relayer/`

| Item | Relevance | Status | Action |
|------|-----------|--------|--------|
| Treasury distribution relayer | Automation only | PARTIAL | Must not decide results; fee must not be team share under another name |
| README claims | Honesty | PARTIAL | Keep “facilitator not authority on ticket result” |

---

## F. `docs/`

| Doc | Role | Status |
|-----|------|--------|
| `CONSTITUTION.md` | Binding philosophy | TO ADD / THIS PACK |
| `CONSTITUTION-GAP-MATRIX.md` | This file | TO ADD |
| `architecture-spec.md` | Technical architecture | PARTIAL — reconcile burn-on-claim vs constitution keep-NFT |
| Beacon trust / canonicality specs | B1/B3 honesty | PARTIAL if present |

---

## G. Suggested implementation order (from constitution)

1. **Docs freeze** — constitution + this matrix + honest B1 beacon wording  
2. **Ticket state machine in Types + PrizeValidator + claim off-chain** (C3, C5, C9–C11, C12)  
3. **§22 property tests** (C4)  
4. **effectivePool + PrizePool + Treasury script wiring** (C6, C2, §19–20)  
5. **Jackpot + floor** (C7, C8)  
6. **Oracle payment path** (C13)  
7. **Beacon B3 track** (C14) — parallel, does not block ticket state machine  

---

## H. Definition of “milestone ready”

A milestone may be called ready only if:

- [ ] Relevant Plutus modules compile
- [ ] Off-chain builders match datum/redeemer types
- [ ] Tests cover the constitutional invariant
- [ ] No UI/docs claim stronger than code
- [ ] Gap row for that invariant is DONE

Until then: **PARTIAL or GAP only**.