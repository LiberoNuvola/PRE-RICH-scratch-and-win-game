# PRE-RICH — GAME ECONOMY

## 1. Purpose

This document defines the normative economic model of PRE-RICH.

The objective is to create a transparent, deterministic and protocol-controlled game economy in which:

* all game revenue enters protocol-controlled Treasury;
* no team, developer, founder or administrator receives a privileged economic allocation;
* prizes are determined by deterministic on-chain rules;
* existing liabilities are always accounted for before new economic exposure is created;
* ticket ownership carries the associated economic right;
* higher ticket classes become available automatically as protocol solvency permits;
* Jackpot activation and assignment are deterministic and non-discretionary;
* governance may modify bounded parameters but cannot override individual economic outcomes.

The economic denomination of PRE-RICH is **USDM**.

USDM is the canonical unit for accounting, prize calculation and economic thresholds. Other assets may be accepted or used for settlement only when an appropriate on-chain verified conversion mechanism is available.

---

# 2. Core Economic Principles

PRE-RICH follows these principles:

1. **Protocol custody**
   Revenue belongs to the protocol and is held by protocol-controlled scripts.

2. **No privileged beneficiary**
   No Treasury allocation may directly benefit a team member, developer, founder, administrator or other privileged individual.

3. **Deterministic economics**
   Prize calculation, solvency checks, Jackpot activation and ticket-class activation are determined by protocol rules.

4. **Liability-first accounting**
   The protocol must account for existing obligations before treating capital as economically available.

5. **No discretionary winners**
   No operator or backend may select a winning ticket, symbol, tier or payout.

6. **Payout crystallisation**
   Once a ticket becomes a winning ticket and its payout is calculated, that payout becomes immutable.

7. **Economic right follows the ticket**
   Transfer of a ticket transfers its associated economic right.

8. **Pre-reveal opacity**
   Public information available before reveal must not permit meaningful deduction of the ticket's symbol, tier, prize or Jackpot status.

9. **Automatic activation**
   Economic expansion is driven by measurable protocol conditions rather than administrative decisions.

10. **Solvency before growth**
    The protocol must suspend new economic exposure when its available capital is insufficient to support it.

---

# 3. Canonical Accounting Unit

The canonical accounting denomination is **USDM**.

All core economic quantities are expressed in USDM or USDM-equivalent value:

* ticket price;
* prize value;
* Treasury thresholds;
* Reserve requirements;
* PrizePool safety capital;
* unresolved-ticket reserve;
* pending winning liabilities;
* Jackpot thresholds;
* ticket-class activation thresholds.

Where an asset other than USDM is used, its USDM-equivalent value must be determined through an approved and validated on-chain oracle mechanism.

The protocol must not rely on an off-chain operator's statement of value.

---

# 4. Genesis Activation

## 4.1 Genesis is the first economic class

The initial PRE-RICH game class is:

**Genesis — 1 USDM**

The previous 2-USDM baseline is superseded by this specification.

Genesis is intentionally inexpensive so that the protocol can bootstrap participation and liquidity before enabling higher-value ticket classes.

---

# 5. PRE Genesis Activation Mechanism

## 5.1 Purpose

The PRE token can provide the initial economic bootstrap mechanism for PRE-RICH.

A quantity of PRE may be placed in the protocol Treasury before Genesis activation.

Genesis becomes eligible for activation when the Treasury's PRE position reaches a verified economic value of:

**4,000 USDM**

This threshold refers specifically to the **PRE held by the Treasury**.

It does **not** refer to:

* PRE market capitalization;
* the total value of all PRE in circulation;
* PRE's fully diluted valuation;
* the value of PRE held by the community;
* the price of one PRE being 4,000 USDM.

The relevant condition is:

```text
TreasuryPREValueUSDM >= 4,000 USDM
```

where:

```text
TreasuryPREValueUSDM =
    TreasuryPREQuantity × VerifiedPRE_USDMPrice
```

subject to the protocol's price-validation rules.

---

## 5.2 Treasury position, not market capitalization

The activation mechanism deliberately uses the value of the PRE actually controlled by the protocol.

For a Treasury position of `T` PRE:

```text
Required PRE Price = 4,000 / T
```

Illustrative values:

| Treasury PRE | Required PRE price |
| -----------: | -----------------: |
|    1,000,000 |         0.004 USDM |
|    2,000,000 |         0.002 USDM |
|    5,000,000 |        0.0008 USDM |
|   10,000,000 |        0.0004 USDM |
|   20,000,000 |        0.0002 USDM |
|   40,000,000 |        0.0001 USDM |

These quantities are examples only.

The protocol does **not** require a fixed Treasury PRE quantity such as 10 million PRE.

The initial quantity should be minimized while still making the activation mechanism credible and economically robust.

---

## 5.3 PRE is bootstrap capital, not PrizePool capital

PRE held for the Genesis activation mechanism must not automatically be treated as liquid PrizePool capital.

The protocol must distinguish:

```text
PRE Bootstrap Position
```

from:

```text
PrizePool Liquidity
```

The PRE position establishes the Genesis activation condition.

It does not by itself constitute a promise that the same PRE can immediately settle a USDM prize.

If PRE is later sold, converted, or otherwise used to create PrizePool liquidity, the resulting economic value becomes subject to the normal Treasury and solvency rules.

---

## 5.4 Bonding phase and activation

The PRE activation mechanism is independent of whether PRE is still on the Snek.fun bonding curve or has graduated to a conventional liquidity pool.

Genesis activation therefore does not require:

* PRE to have already graduated;
* PRE to have reached a particular market capitalization;
* PRE to have reached a particular trading volume.

The only relevant condition is whether the protocol can verify the required Treasury PRE value under the approved valuation mechanism.

If the required Treasury value cannot safely be established while PRE remains on the bonding curve, the protocol may remain inactive until sufficient price discovery and liquidity exist after graduation.

The protocol must not assume that a thin or manipulable market represents reliable economic value.

---

## 5.5 PRE valuation

The PRE/USDM price used for activation must satisfy protocol-defined validation rules.

At minimum, the valuation mechanism must specify:

* price source;
* asset identity;
* oracle/feed version;
* freshness requirement;
* decimal handling;
* minimum liquidity requirements where applicable;
* manipulation-resistance rules;
* fallback behaviour;
* rejection behaviour for stale or invalid data.

A backend operator may submit a price observation or construct a transaction, but cannot arbitrarily define the activation value.

---

## 5.6 One-way Genesis activation

Once the protocol has legitimately activated Genesis, activation is permanent for that protocol version.

A later fall in PRE price must not retroactively invalidate already issued Genesis tickets.

The PRE activation condition therefore controls **initial Genesis activation**, not the continuing validity of tickets.

Higher ticket classes have their own independent solvency conditions.

---

# 6. Genesis Ticket Economics

The Genesis ticket price is:

**1 USDM**

The ticket price represents the player's economic purchase price.

The protocol must not embed an arbitrary fixed transaction-fee deduction into the economic model.

For economic modelling:

```text
NetSaleValue =
    TicketPrice - ActualTransactionCost
```

`ActualTransactionCost` means the actual protocol transaction cost necessary to execute the relevant transaction.

A percentage such as 2% may be used as a prudential modelling assumption during simulations, but it is **not** a constitutional fee and must not be hard-coded as such.

---

# 7. Ticket Classes

PRE-RICH is designed to expand automatically through the following ticket classes:

```text
1
2
3
5
10
25
50
100 USDM
```

Genesis is the 1-USDM class.

Higher classes do not become available because an administrator decides to enable them.

They become available when the protocol's verified economic state satisfies the corresponding activation requirements.

---

# 8. Automatic Solvency-Based Class Activation

Each class has an associated economic exposure.

Before enabling a class for new sales, the protocol must verify that sufficient effective solvency exists to support the additional unresolved-ticket and prize exposure.

Conceptually:

```text
ClassAvailable(C) =
    EffectiveSolvency >= RequiredCapital(C)
```

The exact `RequiredCapital(C)` must be defined by the approved prize distribution, unresolved-ticket reserve and safety-capital model.

If solvency falls below the requirement for a class:

* that class is suspended for **new sales**;
* existing tickets remain valid;
* already crystallised prizes remain payable;
* no retroactive change occurs.

The protocol may automatically move from:

```text
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1
```

as necessary.

If even Genesis cannot safely be supported, new ticket sales must halt.

This is a **circuit breaker**, not an administrative intervention.

---

# 9. Treasury

All ticket revenue must enter protocol-controlled Treasury.

The intended economic flow is:

```text
Player
   ↓
Protocol Treasury
   ↓
PrizePool
Stake
Maintenance
Reserve
```

No player payment may be routed through a team-controlled personal wallet as an intermediate economic destination.

Treasury destinations must be protocol-controlled credentials whose validators enforce their intended category purpose.

Governance may not convert a protocol category destination into an arbitrary personal payment address.

---

# 10. Treasury Distribution

Treasury distribution occurs only after existing economic obligations and required safety capital have been accounted for.

The priority order is:

1. crystallised winning liabilities;
2. unresolved-ticket reserve;
3. PrizePool safety capital;
4. locked Jackpot liquidity;
5. Reserve protection;
6. only then distributable surplus.

Only genuine distributable surplus may be allocated according to the governed Treasury percentages.

A proposed initial distribution model may be:

```text
75% PrizePool
10% Reserve
10% Stake
5% Maintenance
```

These percentages are **economic configuration**, not personal entitlement and not an unconditional allocation of gross revenue.

The percentages apply only after the protocol's obligations and safety requirements have been satisfied.

---

# 11. PrizePool

PrizePool is the protocol-controlled liquidity reserve from which winning tickets are settled.

For B1, a single global PrizePool singleton is the preferred architecture because it provides one atomic accounting point for:

* ticket issuance;
* unresolved reserve;
* reveal;
* crystallisation;
* claims;
* expiry handling;
* Treasury funding;
* Jackpot accounting.

Any future sharding must preserve equivalent global solvency guarantees.

---

# 12. Effective Pool

Raw Treasury or PrizePool balance must never be interpreted as freely available prize liquidity.

For each settlement/accounting asset `A`:

```text
effectivePool(A) =
    totalLiquidity(A)
  - pendingWinningLiabilities(A)
  - unresolvedTicketReserve(A)
  - lockedJackpotLiquidity(A)
```

where `lockedJackpotLiquidity` is subtracted only when Jackpot liquidity is separately reserved.

If Jackpot funds are already represented inside pending liabilities, they must not be subtracted twice.

The protocol must enforce:

```text
pendingWinningLiabilities
+ unresolvedTicketReserve
+ lockedJackpotLiquidity
≤ totalLiquidity
```

and therefore:

```text
effectivePool ≥ 0
```

---

# 13. Pending Winning Liabilities

A winning ticket whose prize has been crystallised but not yet claimed creates a protocol liability.

Conceptually:

```text
pendingWinningLiabilities(A) =
    sum of all crystallised, unclaimed payouts denominated in A
```

The aggregate must be represented in the PrizePool state or be deterministically derivable under the same on-chain accounting rules.

A crystallised payout cannot later be changed because of:

* Treasury fluctuations;
* PRE price changes;
* changes in ticket-class availability;
* governance changes;
* changes in the prize table.

---

# 14. Unresolved-Ticket Reserve

Every unrevealed ticket represents unresolved economic exposure.

The protocol therefore reserves capital for unresolved tickets.

A B1 representation is:

```text
unresolvedTicketReserve =
    unresolvedTicketCount × reservePerUnresolvedTicket
```

The reserve must be updated atomically with ticket issuance and reveal/expiry transitions.

The exact statistical reserve formula must be implemented consistently with the approved prize and Jackpot distribution.

A preliminary modelling formula is:

```text
UnresolvedReserve(N) =
    N × μ + Z × σ × sqrt(N)
```

where:

* `N` = number of unresolved tickets;
* `μ` = expected payout;
* `σ` = payout standard deviation;
* `Z` = selected confidence multiplier.

For Genesis modelling, the current reference distribution is:

* Loss: 75%
* 1 USDM: 17%
* 2.5 USDM: 6%
* 5 USDM: 1.8%
* 100 USDM: 0.19%
* 500 USDM: 0.01%

with:

```text
μ ≈ 0.65 USDM
σ ≈ 6.676 USDM
```

and approximately:

```text
Z ≈ 3.09
```

for a 99.9% confidence multiplier.

These values are **modelling parameters**, not permission to create an economically unsafe payout obligation.

The validator must reject a transition that creates an exposure exceeding available liquidity.

---

# 15. Prize Calculation

Prize calculation follows:

```text
Reveal
   ↓
Verify randomness
   ↓
Derive result
   ↓
Determine tier
   ↓
Calculate effective pool
   ↓
Calculate payout
   ↓
Verify solvency
   ↓
Crystallise payout
```

For a winning reveal:

```text
Payout ≤ EffectivePool_before_reveal
```

The exact payout is frozen in the ticket state.

Once crystallised:

```text
FrozenPayout = immutable
```

No subsequent transaction may recalculate the prize using a different pool value.

---

# 16. Prize Denomination and Settlement

The prize is denominated in USDM.

If the PrizePool does not contain enough USDM to settle the fixed prize, the protocol may use another approved settlement asset.

For example, if:

```text
FrozenPrize = 10,000 USDM
```

and the PrizePool contains insufficient USDM but sufficient ADA, the protocol determines the ADA quantity required to settle exactly:

```text
10,000 USDM
```

using the verified on-chain ADA/USDM price.

The prize does not become smaller because the settlement asset changes.

The economic obligation remains:

```text
10,000 USDM
```

Only the asset composition used to satisfy that obligation changes.

Unsupported assets, stale oracle values, invalid quotations or insufficient settlement backing must cause the transaction to fail.

---

# 17. Reserve

Reserve is a protocol safety category.

Reserve exists to absorb economic variance and protect the PrizePool against adverse conditions.

Reserve must not become an unrestricted accumulation mechanism.

The protocol should maintain:

* a defined safety floor;
* a defined replenishment mechanism;
* a defined maximum or target where appropriate;
* rules preventing continuous extraction when the reserve is below its required level.

If Reserve falls below its safety requirement, higher ticket classes may automatically be suspended.

---

# 18. Maintenance

Maintenance is a protocol economic category.

It exists to pay legitimate operating expenses required by the protocol, such as:

* infrastructure;
* indexing;
* oracle-related infrastructure;
* monitoring;
* transaction execution costs;
* other explicitly approved protocol expenses.

Maintenance is **not** a team salary or founder allocation.

No individual has an unconditional claim over the Maintenance balance.

Once the Maintenance target has been reached, surplus may be redirected according to governed protocol rules.

---

# 19. Jackpot

Jackpot is economically separate from the normal symbol distribution.

The Jackpot symbol must not alter the normal probability distribution of the five standard symbols:

```text
1
2
3
4
5
```

Jackpot activation is automatic.

Conceptually:

```text
JackpotActive =
    EffectivePool >= JackpotThreshold
```

The Jackpot cannot be:

* manually activated;
* manually assigned to a ticket;
* selected by an operator;
* altered after the winning result has been determined.

Jackpot liquidity must be included in solvency accounting.

---

# 20. Ticket Identity

Each ticket is represented by a unique NFT/native asset.

The ticket is:

* unique;
* transferable;
* persistent;
* collectible;
* not automatically destroyed when claimed.

The NFT represents the ticket identity and its historical state.

---

# 21. Unrevealed Ticket

Before reveal, the public ticket state must contain only information necessary for protocol operation.

It may include:

* ticket ID;
* commitment;
* round;
* configuration reference;
* protocol version;
* issuance timestamp;
* expiry timestamp;
* current owner.

It must not expose the outcome.

The following constitutional privacy rule applies:

> **Nessuna informazione pubblicamente disponibile prima del reveal di un ticket deve consentire di determinare o dedurre in modo significativo il simbolo, il tier, il premio o l'eventuale jackpot associato a quel ticket.**

All unrevealed tickets must have the same economically relevant public structure.

---

# 22. Commit-Reveal and Randomness

The randomness architecture follows:

```text
COMMIT
   ↓
LOCK
   ↓
REVEAL
   ↓
RANDOMNESS
```

The relayer is not the fairness authority.

The ticket commitment must be bound to the relevant protocol context, including where required:

* ticket identity;
* player commitment/secret;
* game version;
* round;
* configuration;
* beacon target;
* domain separation values.

The reveal must be independently verified on-chain.

The protocol must not permit a participant to choose a favourable result after observing the relevant randomness.

---

# 23. Random Symbol Derivation

The five normal symbols remain:

```text
1, 2, 3, 4, 5
```

Random mapping must not use a biased simple modulo operation.

If a uniform integer is required, the implementation must use an unbiased technique such as rejection sampling.

All derivations must use domain separation so that different game outputs cannot accidentally share the same derivation domain.

---

# 24. Ticket Lifecycle

The intended economic lifecycle is:

```text
UNREVEALED
     ↓
REVEALED LOSS
```

or:

```text
UNREVEALED
     ↓
REVEALED WIN
     ↓
CLAIMABLE
     ↓
CLAIMED
```

The NFT remains after claim.

The ticket owner may optionally burn the NFT after claiming.

Burning the NFT does not create or increase an economic entitlement.

---

# 25. Expiry

The minimum claim period is:

**365 days**

Conceptually:

```text
expiresAt = issuedAt + 365 days
```

Expiry must be enforced by the protocol, not merely calculated by the frontend.

Expiry terminates the economic claim.

It does not necessarily require destruction of the NFT.

A historical reveal after expiry may be supported, provided that it cannot recreate an expired economic claim.

---

# 26. Secondary Market

Tickets are transferable.

An unrevealed ticket may move:

```text
Alice → Bob → Charlie → Reveal
```

The economic right follows the ticket.

A revealed winning ticket may also be transferred before claim:

```text
Alice reveals → 10,000 USDM frozen
             ↓
Alice transfers ticket
             ↓
Bob claims 10,000 USDM
```

The payout remains unchanged.

The transfer itself must not reveal information that allows observers to determine whether an unrevealed ticket is winning.

---

# 27. Claim

A claim is valid only when:

* the ticket is in a claimable winning state;
* the claimant controls the current ticket;
* the payout is already crystallised;
* the claim has not previously occurred;
* the claim is within the valid claim period;
* the PrizePool accounting transition remains solvent.

Claiming once changes the ticket state to:

```text
CLAIMED
```

The protocol must make a second claim impossible.

The NFT is retained.

---

# 28. Burn

NFT burning is optional.

The player may:

```text
Claim + Keep
```

or:

```text
Claim + Burn
```

Burning:

* is voluntary;
* provides no additional payment;
* does not replace claim validation;
* must not be required for prize settlement.

---

# 29. Treasury → PrizePool

Treasury funding of PrizePool must be a protocol-controlled transition.

The destination must be the PrizePool script, not a personal prize wallet.

Treasury-to-PrizePool transfers must respect:

* Treasury accounting;
* PrizePool state;
* Reserve requirements;
* liabilities;
* asset identity;
* minimum-UTxO requirements;
* governance configuration.

---

# 30. Ticket-Sale Atomicity

The preferred B1 architecture is atomic accounting.

A ticket sale should, where technically feasible, update in one transaction:

* ticket issuance;
* Treasury payment;
* PrizePool/reserve state;
* required protocol state.

The critical invariant is:

> An issued ticket must never exist in an economically unreserved state.

A future accumulator architecture is possible only if the same invariant is preserved.

---

# 31. Automatic Safety Circuit Breakers

The protocol must automatically reduce exposure when solvency deteriorates.

The preferred sequence is:

```text
Suspend 100
Suspend 50
Suspend 25
Suspend 10
Suspend 5
Suspend 3
Suspend 2
Genesis remains
```

If Genesis itself cannot safely be supported:

```text
HALT NEW SALES
```

Existing tickets remain valid.

Existing crystallised liabilities remain payable.

The circuit breaker cannot modify historical payouts.

---

# 32. Genesis Bootstrap Reference

A reference Genesis bootstrap scenario is approximately:

```text
4,000 USDM risk-adjusted initial capital
```

with an illustrative structure of:

```text
2,500 USDM-equivalent PrizePool
1,000 USDM Reserve
500 USDM Maintenance
0 USDM initial Stake allocation
```

plus a small ADA operational-fee buffer.

This is a bootstrap planning reference, not an immutable constitutional allocation.

The actual asset composition may differ provided that the protocol's risk-adjusted value and solvency requirements are satisfied.

---

# 33. Genesis Economic Model

For modelling purposes only, an illustrative Genesis distribution is:

```text
Loss       75%
1 USDM     17%
2.5 USDM    6%
5 USDM      1.8%
100 USDM    0.19%
500 USDM    0.01%
```

Expected payout:

```text
μ ≈ 0.65 USDM
```

This implies that if a 2% transaction-cost assumption is used for simulation:

```text
Net inflow ≈ 0.98 USDM
Expected payout ≈ 0.65 USDM
Expected economic surplus ≈ 0.33 USDM
```

However, the 2% value is only a modelling assumption.

The production protocol uses actual transaction costs and actual on-chain economic accounting.

---

# 34. Governance

Governance may modify bounded economic and operational parameters.

Examples include:

* Treasury percentages;
* class activation thresholds;
* Reserve parameters;
* Jackpot threshold;
* supported assets;
* settlement assets;
* oracle configuration;
* operational timing;
* keeper/relayer compensation.

Governance may **not** authorize:

* manual winner selection;
* manual symbol selection;
* manual tier selection;
* manual Jackpot assignment;
* arbitrary individual claim approval;
* retroactive payout changes;
* personal-beneficiary Treasury destinations;
* forced NFT burning;
* violation of pre-reveal opacity;
* reduction of the minimum claim period below 365 days.

Any governed destination must remain a protocol-controlled script enforcing the same economic category.

---

# 35. Backend and Relayer Trust Boundary

Backend infrastructure may:

* construct transactions;
* index blockchain state;
* notify users;
* facilitate reveal;
* facilitate claim;
* submit protocol transactions.

Backend infrastructure may not decide:

* winner;
* symbol;
* tier;
* prize;
* Jackpot assignment;
* Treasury allocation;
* solvency;
* validity of a claim.

The blockchain must independently enforce all economically material rules.

B1 may use an authorised beacon publisher.

This does **not** mean B1 is equivalent to the future B3 canonical-state proof architecture.

---

# 36. B1 / B3 Distinction

B1 may rely on an authorised publisher for the Beacon.

B3 is intended to remove the publisher from the root of trust by proving canonical external state on-chain.

Therefore:

```text
B1 = authorised evidence
B2 = committee-attested evidence
B3 = publisher-independent canonical-state proof
```

B1 must not be marketed as having B3's trust properties.

---

# 37. PRE Genesis Invariants

The following invariants apply to the PRE Genesis activation mechanism.

### G1 — Treasury-specific valuation

Genesis activation depends on the value of PRE actually held by Treasury.

### G2 — No market-cap substitution

PRE market capitalization cannot substitute for Treasury PRE value.

### G3 — No fixed PRE quantity

The protocol does not require a predetermined quantity such as 10M PRE.

### G4 — Verified valuation

Activation requires a protocol-valid PRE/USDM valuation.

### G5 — No arbitrary operator activation

An administrator cannot activate Genesis manually.

### G6 — No automatic PRE liquidation

Reaching 4,000 USDM does not automatically require the protocol to sell PRE.

### G7 — Bootstrap separation

PRE bootstrap holdings are distinct from PrizePool liquidity until an explicit protocol-controlled conversion occurs.

### G8 — No retroactive invalidation

Once Genesis is activated, subsequent PRE price changes do not invalidate existing Genesis tickets.

### G9 — Solvency remains independent

Genesis activation does not override PrizePool, Reserve or liability constraints.

### G10 — Higher classes remain conditional

Activation of Genesis does not automatically activate higher ticket classes.

### G11 — No price guarantee

The 4,000 USDM condition does not create a promise regarding the future PRE market price.

### G12 — Minimal bootstrap

The Treasury PRE position should be minimized subject to achieving a credible and robust activation condition.

---

# 38. Open Implementation Decisions

The following items must be resolved before production B1 deployment:

1. Exact PRE/USDM oracle and manipulation-resistance mechanism.
2. Exact Genesis activation transaction/state transition.
3. Exact ticket-class capital requirements.
4. Exact unresolved-ticket reserve implementation.
5. Exact prize distribution formula.
6. Exact Jackpot reserve and payout model.
7. Exact Treasury distribution trigger.
8. Governance authorization mechanism.
9. Multi-asset representation and settlement rules.
10. Historical-reveal accounting and unresolved-reserve release.
11. Final PrizePool singleton datum.
12. Exact transaction topology for atomic ticket sale.
13. Final expiry transition semantics.
14. Final on-chain oracle validation.
15. Reproducible Plutus/off-chain implementation parity.
16. Full property, integration and adversarial test suite.

No unresolved design choice may be silently converted into an assumed production rule.

---

# 39. Production Invariant

The economic system is considered B1-complete only when the implementation enforces the documented economic model on-chain.

Documentation alone is insufficient.

In particular, production B1 must demonstrate consistency between:

```text
Ticket Mint
     ↓
Treasury
     ↓
PrizePool
     ↓
Unresolved Reserve
     ↓
Reveal
     ↓
Effective Pool
     ↓
Prize Crystallisation
     ↓
Claim
```

and:

```text
PRE Treasury Bootstrap
     ↓
Verified PRE/USDM Value
     ↓
Genesis Activation
     ↓
1 USDM Tickets
     ↓
Solvency-Based Expansion
     ↓
Higher Ticket Classes
```

No frontend, backend, relayer or operator may bypass these economic invariants.
