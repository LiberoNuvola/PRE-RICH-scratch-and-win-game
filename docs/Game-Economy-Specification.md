# PRE-RICH — Game Economy Specification

**Version:** B1
**Status:** Normative specification
**Protocol:** PRE-RICH Scratch & Win
**Principle:** 100% on-chain, automatic, verifiable and non-custodial

---

## 1. Purpose

This document defines the economic model of PRE-RICH.

The purpose of the game economy is to establish deterministic and verifiable rules governing:

* ticket price;
* collection of player funds;
* Treasury allocation;
* PrizePool liquidity;
* prize calculation;
* prize liabilities;
* jackpot activation;
* minimum prize;
* ticket expiry;
* claims;
* and the relationship between tickets and their economic rights.

The economic system must operate without discretionary intervention by a team, developer, founder, administrator, publisher, backend operator or relayer.

No individual participant is entitled to a protocol-defined share of the Treasury.

---

# 2. Economic Principles

PRE-RICH follows five fundamental economic principles.

### 2.1 No privileged beneficiary

The protocol does not allocate a team, developer, founder or administrator share.

There is no protocol-level economic role whose purpose is to extract value for an individual operator.

Maintenance is a **protocol category**, not a personal beneficiary.

---

### 2.2 Player payments enter the protocol

The canonical economic flow is:

```text
PLAYER
   │
   ▼
TREASURY
   │
   ├──► PRIZE POOL
   ├──► STAKE
   ├──► MAINTENANCE
   └──► RESERVE
```

The percentages assigned to these categories are configuration parameters subject to PRE governance, within the constitutional limits of the protocol.

There must be no required intermediate flow such as:

```text
PLAYER → TEAM → TREASURY
```

---

### 2.3 Prize determination is not discretionary

No backend or operator may determine:

* whether a ticket wins;
* its tier;
* its prize;
* whether the jackpot is active;
* which ticket receives the jackpot;
* whether a claim is valid.

These properties must derive from the protocol's on-chain rules and cryptographically verifiable inputs.

---

### 2.4 Liquidity matters

The prize economy is based on **effective liquidity**, not merely on the gross balance visible at a PrizePool address.

A balance cannot be considered freely available if the protocol has already incurred an economic obligation against it.

---

### 2.5 Economic rights belong to the ticket

A ticket represents an economic right.

If the ticket is transferred, the economic right follows the ticket.

Therefore:

```text
Alice owns Ticket #123
        ↓
Alice transfers Ticket #123 to Bob
        ↓
Bob owns the economic right associated with Ticket #123
```

This remains true for unrevealed tickets and, where permitted, for revealed but unclaimed winning tickets.

---

# 3. Canonical Ticket Price

The canonical PRE-RICH ticket price is:

## **2 USDM**

USDM is the reference denomination displayed to the user.

The frontend must therefore present the canonical ticket price as:

> **2 USDM**

The user may pay using:

* USDM;
* ADA;
* PRE;
* or a combination of supported assets.

When payment is made using an asset other than USDM, the equivalent value is determined using the configured Charlie3 price feed.

The conversion must be verified by the on-chain protocol.

The frontend display must not be considered an authority for the payment amount.

---

# 4. Treasury

All protocol revenue is directed to the on-chain Treasury.

The Treasury is a protocol-controlled economic component, not an operator wallet.

Treasury funds may be allocated among protocol categories according to governance-controlled parameters.

The principal categories are:

1. PrizePool;
2. Stake;
3. Maintenance;
4. Reserve.

The Treasury must not contain a discretionary destination that allows an operator to extract protocol revenue for personal benefit.

---

# 5. PrizePool

The PrizePool is the shared liquidity reserve from which winning tickets are paid.

It is not a personal wallet and does not represent funds belonging to the team or developer.

The PrizePool exists to provide liquidity for protocol-defined winning obligations.

Treasury funding of the PrizePool must therefore follow an on-chain protocol rule:

```text
Treasury → PrizePool
```

rather than an administrator-controlled destination such as:

```text
Treasury → arbitrary operator wallet
```

---

# 6. Total Pool and Effective Pool

The gross amount held by the PrizePool is not necessarily available for new prizes.

PRE-RICH therefore distinguishes between:

### TOTAL POOL

The total assets controlled by the PrizePool.

### EFFECTIVE POOL

The portion of the PrizePool that can actually be considered available for new economic obligations.

Conceptually:

```text
EFFECTIVE POOL =
    TOTAL POOL
  - PENDING WINNING LIABILITIES
  - UNRESOLVED-TICKET RESERVE
```

The exact accounting representation is an on-chain implementation concern, but the economic invariant is mandatory:

> Funds already economically committed to existing obligations must not be counted again as freely available liquidity.

---

# 7. Winning Liabilities

When a ticket is revealed and its prize is determined, that prize becomes an economic liability of the protocol.

For example:

```text
PrizePool = 100,000 USDM
Existing winning liabilities = 20,000 USDM
Unresolved-ticket reserve = 10,000 USDM

Effective Pool = 70,000 USDM
```

The protocol must not calculate future prizes as though the entire 100,000 USDM were freely available.

This prevents the protocol from promising the same liquidity multiple times.

---

# 8. Prize Calculation

Prize calculation occurs at reveal.

The conceptual sequence is:

```text
REVEAL
   ↓
DETERMINE RESULT
   ↓
DETERMINE TIER
   ↓
CALCULATE EFFECTIVE POOL
   ↓
CALCULATE PAYOUT
   ↓
CRYSTALLIZE PAYOUT
```

The payout is therefore not determined by the frontend and is not selected by a backend operator.

Once the ticket has been revealed as a winner, its payout is fixed on-chain.

---

# 9. Initial Prize Tiers

The initial PRE-RICH tier structure is:

| Tier   | Base multiplier |
| ------ | --------------: |
| Tier 1 |               2 |
| Tier 2 |               5 |
| Tier 3 |              10 |
| Tier 4 |             200 |
| Tier 5 |            1000 |

The current game rules determine the tier from the cryptographically derived ticket result.

The economic model must preserve the distinction between:

* the **game result**;
* the **tier**;
* and the **final payout**.

The tier alone is not a substitute for the on-chain payout calculation.

---

# 10. Prize Denomination

The payout is conceptually denominated in USDM.

This provides a stable reference unit even when the actual settlement uses:

* USDM;
* ADA;
* PRE;
* or an approved combination.

Therefore the protocol can state:

> **Prize: 200 USDM**

while the actual transaction may deliver the equivalent amount in another supported asset.

The conversion used for settlement must follow the protocol's verified price-feed rules.

---

# 11. Prize Floor

Every valid winning ticket has an absolute minimum prize of:

## **2 USDM**

Conceptually:

```text
payout = max(calculatedPrize, 2 USDM)
```

However, the floor does not override solvency.

The protocol must never create an economically impossible obligation merely because the nominal minimum is 2 USDM.

Therefore:

> The prize floor applies subject to the protocol's solvency rules.

---

# 12. Prize Crystallization

A prize becomes fixed at reveal.

For a winning ticket:

```text
UNREVEALED
     ↓
REVEALED WIN
     ↓
TIER FIXED
     ↓
PAYOUT FIXED
     ↓
CLAIMABLE
```

After crystallization:

* the payout cannot increase;
* the payout cannot decrease;
* changes in the PrizePool do not retroactively change it;
* later Treasury operations do not change it;
* the age of the ticket does not change it.

A player who claims immediately and a player who claims shortly before expiry must receive the same crystallized prize, assuming both claims are valid and within the economic claim period.

---

# 13. Jackpot Economy

The jackpot is economically separate from the five normal symbols.

The jackpot has its own symbol.

Its activation is determined automatically from the PrizePool state.

Conceptually:

```text
effectivePool >= jackpotThreshold
        ↓
JACKPOT ACTIVE
```

No administrator may manually activate the jackpot.

No backend may assign the jackpot to a selected ticket.

The ticket receiving the jackpot must be selected through the protocol's cryptographic randomness.

The jackpot must not alter the normal distribution of symbols 1, 2, 3, 4 and 5.

---

# 14. Jackpot and PrizePool Growth

The economic purpose of the jackpot threshold is to make jackpot activation dependent on actual protocol liquidity rather than on an operator decision.

As effective liquidity grows, the protocol can automatically enter the jackpot-active state once the configured threshold is reached.

Conversely, the economic accounting must not treat committed liabilities as available liquidity merely because they remain physically present in a UTxO.

The relevant quantity is therefore:

> **effectivePool, not gross pool balance.**

---

# 15. Unresolved Tickets

Unrevealed tickets represent unresolved economic states.

The protocol must account for this uncertainty when determining effective liquidity.

The economic model therefore reserves an amount for unresolved tickets according to the defined protocol rules.

This prevents the protocol from treating every unrevealed ticket as though it had already been proven to be a loss.

The exact reserve mechanism must be deterministic and enforceable on-chain.

---

# 16. Ticket Expiry

The initial ticket economic lifetime is:

## **365 days minimum**

Conceptually:

```text
expiresAt = issuedAt + 365 days
```

Expiry primarily terminates the economic right associated with an unclaimed winning ticket.

Expiry does not necessarily require destruction of the NFT.

---

# 17. Reveal After Expiry

The protocol may permit historical reveal after expiry.

In that case:

```text
EXPIRED
   ↓
REVEAL
   ↓
WIN / LOSS
```

If the expired ticket would have been a winner, the historical result may still be recorded.

The interface may display:

> Historical win: X USDM
> Status: EXPIRED

However:

> An expired winning ticket has no remaining economic claim.

This preserves the historical and collectible value of the NFT without creating an indefinite financial liability.

---

# 18. Claim

A winning prize may be claimed exactly once.

The economic state transition is:

```text
CLAIMABLE → CLAIMED
```

Once claimed, the same economic right cannot be claimed again.

The NFT itself is not automatically destroyed.

This distinction is fundamental:

```text
CLAIM ≠ BURN
```

---

# 19. Collectible Winning Tickets

A winning ticket may remain in existence after its prize has been claimed.

For example:

```text
Ticket #123
Status: CLAIMED
Historical Prize: 10,000 USDM
```

The ticket can therefore retain:

* its ticket identity;
* its result;
* its historical prize;
* its tier;
* jackpot status, where applicable;
* and collectible value.

The protocol does not require valuable winning NFTs to be destroyed merely because their economic claim has been exercised.

---

# 20. Voluntary Burn

The ticket owner may voluntarily burn the NFT.

Burning provides:

* no additional prize;
* no refund;
* no economic bonus.

The valid economic choices are therefore:

```text
CLAIM + KEEP NFT
```

or

```text
CLAIM + BURN NFT
```

The protocol must prevent a winning economic right from being accidentally destroyed before it has been properly handled.

---

# 21. Secondary Market

Tickets are transferable from the beginning.

This creates a native secondary market.

An unrevealed ticket may move through multiple owners:

```text
Alice → Bob → Charlie → Reveal
```

The final owner receives the economic right.

A revealed winning ticket may also be transferable before claim, where the protocol permits it:

```text
Alice reveals Ticket #123
        ↓
Ticket wins 10,000 USDM
        ↓
Alice transfers Ticket #123 to Bob
        ↓
Bob claims 10,000 USDM
```

The prize is attached to the ticket, not to the wallet that originally purchased it.

---

# 22. Privacy of Economic State

Before reveal, the public blockchain must not expose information that allows the economic result to be inferred.

The constitutional privacy requirement is:

> **“Nessuna informazione pubblicamente disponibile prima del reveal di un ticket deve consentire di determinare o dedurre in modo significativo il simbolo, il tier, il premio o l'eventuale jackpot associato a quel ticket.”**

This includes information contained in:

* the ticket asset;
* datum;
* redeemer;
* transaction structure;
* public blockchain history;
* configuration references;
* and other publicly available protocol data.

All unrevealed tickets must therefore present the same economic privacy model.

---

# 23. Governance

Governance may modify economic and operational parameters within constitutional limits.

Potentially configurable parameters include, where explicitly permitted by the Constitution:

* Treasury allocation percentages;
* PrizePool allocation;
* jackpot threshold;
* economic reserve parameters;
* other operational economic parameters.

Governance must not be able to transform PRE-RICH into a system contrary to its constitutional principles.

In particular, governance must not be used to introduce:

* team/developer extraction;
* discretionary prize assignment;
* discretionary jackpot assignment;
* discretionary winner selection;
* arbitrary claim rejection;
* centralized custody of player funds;
* or other mechanisms incompatible with the protocol's trustless philosophy.

Governance controls parameters.

Governance does not become the economic authority of individual games.

---

# 24. No Fiduciary Backend

The backend may facilitate the economic system.

It may:

* construct transactions;
* monitor the blockchain;
* index tickets;
* notify users;
* facilitate reveal;
* facilitate claims;
* act as a relayer.

It may not decide:

* prize amount;
* winner;
* tier;
* jackpot activation;
* jackpot recipient;
* Treasury entitlement;
* claim validity.

The backend is infrastructure.

It is not a fiduciary authority.

---

# 25. Economic Security Invariants

The following properties are normative.

### E1 — No personal beneficiary

No protocol revenue is assigned to team, developer, founder or administrator wallets as a personal entitlement.

### E2 — Treasury custody

Protocol revenue enters the on-chain Treasury according to the defined payment rules.

### E3 — PrizePool accounting

Effective liquidity accounts for existing economic obligations.

### E4 — Deterministic payout

A payout is determined by protocol rules and verified on-chain.

### E5 — Crystallization

A winning payout becomes fixed at reveal.

### E6 — Solvency

The protocol must not treat committed liabilities as freely available liquidity.

### E7 — Prize floor

A valid winning prize has a minimum reference value of 2 USDM, subject to solvency rules.

### E8 — Jackpot autonomy

Jackpot activation and assignment cannot be controlled by an administrator.

### E9 — Transferability

The economic right follows the ticket.

### E10 — Single claim

A winning economic right can be claimed only once.

### E11 — No forced burn

Claim does not require NFT destruction.

### E12 — Expiry

The economic right expires after the defined claim period.

### E13 — Pre-reveal privacy

Public information before reveal must not significantly determine or expose the economic outcome.

### E14 — Governance limitation

Governance cannot override constitutional economic principles.

### E15 — No fiduciary backend

Off-chain infrastructure cannot become the economic decision-maker.

---

# 26. Example — Basic Game

Assume:

```text
Ticket price: 2 USDM
```

A player purchases one ticket.

The payment enters the protocol Treasury.

The Treasury subsequently allocates funds according to the configured percentages.

The ticket remains unrevealed.

At this point the public blockchain must not reveal its symbol, tier, prize or jackpot status.

The player then initiates reveal.

The protocol verifies the randomness inputs and derives the game result.

The result determines the tier.

The protocol calculates the effective liquidity.

The payout is calculated and crystallized.

The ticket becomes either:

```text
REVEALED LOSS
```

or:

```text
REVEALED WIN
PAYOUT = X USDM
CLAIMABLE
```

No operator is involved in deciding the outcome.

---

# 27. Example — PrizePool with Existing Liabilities

Assume:

```text
TOTAL POOL                    100,000 USDM
PENDING WINNING LIABILITIES    20,000 USDM
UNRESOLVED-TICKET RESERVE      10,000 USDM
--------------------------------------------
EFFECTIVE POOL                 70,000 USDM
```

The protocol must use the effective pool for calculations that depend on available liquidity.

It must not treat the full 100,000 USDM as freely available.

After a new winning ticket is revealed and its payout is crystallized, that new obligation becomes part of the protocol's liability accounting.

---

# 28. Economic Lifecycle

The complete economic lifecycle is:

```text
                  ┌──────────────┐
                  │    PLAYER    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │    TICKET    │
                  │    2 USDM    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   TREASURY   │
                  └──────┬───────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌───────┐ ┌─────────┐
        │ PrizePool│ │ Stake │ │ Reserve │
        └────┬─────┘ └───────┘ └─────────┘
             │
             ▼
       Effective Pool
             │
             ▼
          REVEAL
             │
             ▼
       Result / Tier
             │
             ▼
          PAYOUT
             │
             ▼
         CLAIMABLE
             │
             ▼
          CLAIMED
             │
             ▼
       Keep NFT / Burn
```

---

# 29. Constitutional Boundary

The economic model exists to make the game sustainable while preserving the fundamental PRE-RICH philosophy.

Economic optimization must never become an excuse to introduce trusted economic actors.

The protocol may evolve its parameters.

It may not abandon its principles.

The fundamental rule is:

> **The protocol determines economic rights through verifiable rules; people may participate in the protocol, but no privileged person may decide who deserves the money.**

---

# 30. Implementation Requirement

Every economic statement in this document must eventually correspond to:

```text
CONSTITUTION
      ↓
ECONOMIC SPECIFICATION
      ↓
PLUTUS VALIDATOR
      ↓
OFF-CHAIN IMPLEMENTATION
      ↓
TEST
      ↓
AUDITABLE INVARIANT
```

A feature is not considered implemented merely because the frontend displays it or because an off-chain component follows the intended behavior.

For an economic invariant to be considered trustless, the relevant property must be **enforced or cryptographically verified on-chain**.

The implementation must not replace a specified invariant with an approximate or operationally equivalent mechanism.

---

## Status

This document defines the intended **PRE-RICH B1 economic model**.

It does not by itself certify that the current implementation satisfies every requirement.

Implementation compliance must be demonstrated independently through code inspection, validator analysis and adversarial tests.
