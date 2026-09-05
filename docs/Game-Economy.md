PRE-RICH — GAME ECONOMY

1. Purpose

This document defines the normative economic model of PRE-RICH.

The objective is to maintain a transparent, deterministic and protocol-controlled game economy in which:

all game revenue enters protocol-controlled Treasury;

no team, developer, founder or administrator receives a privileged economic allocation;

prizes and winner selection derive from protocol rules and verified randomness;

existing liabilities and unresolved exposure are accounted for before new economic exposure is created;

ticket ownership carries the associated economic right;

ticket classes expand automatically as solvency permits and contract automatically when solvency falls;

Jackpot activation is automatic and non-discretionary;

governance may modify bounded parameters but cannot override individual economic outcomes.

The canonical economic denomination is USDM. Other assets may be accepted for payment or settlement only through a validated on-chain conversion mechanism.

2. Core Economic Principles

2.1 Protocol custody

Player payments belong to the protocol and enter protocol-controlled Treasury. No required flow may route player funds through a personal operator wallet.

2.2 No privileged beneficiary

There is no protocol-level team, founder, developer or administrator entitlement. Maintenance is a protocol category, not a personal allocation.

2.3 Deterministic economics

Ticket price, class availability, prize calculation, Jackpot activation and claim validity derive from protocol state, configured parameters and cryptographically verifiable inputs.

2.4 Liability-first accounting

Funds already committed to pending prizes, unresolved tickets, safety capital or a locked Jackpot are not freely available for new obligations.

2.5 Economic right follows the ticket

Transfer of a ticket transfers its associated economic right, including a crystallised but unclaimed prize where transfer is permitted.

2.6 Pre-reveal opacity

Public information available before reveal must not meaningfully determine the ticket's symbol, tier, payout or Jackpot outcome.

3. Canonical Accounting Unit and Payment

USDM is the canonical reference unit for:

ticket prices;

prize values;

solvency thresholds;

unresolved-ticket reserve;

pending liabilities;

Jackpot thresholds and levels.

The ticket price is expressed in USDM, but settlement may use USDM, ADA or another governance-approved asset.

When a player pays with an asset other than USDM, the protocol must determine the USDM-equivalent amount using a verified on-chain price source. The frontend quote is informational only.

The payment transaction must satisfy the class price selected by the protocol. There is no constitutional fixed 1 ADA ticket payment.

4. Genesis Activation

4.1 Genesis class

The first ticket class is:

Genesis — 1 USDM

4.2 PRE bootstrap condition

Genesis may activate only after the Treasury contains a PRE position whose verified economic value is at least:

TreasuryPREValueUSDM >= 4,000 USDM

with:

TreasuryPREValueUSDM =
    TreasuryPREQuantity × VerifiedPRE_USDMPrice

The 4,000 USDM value refers to PRE actually controlled by the protocol, not market capitalisation or circulating value.

4.3 Bootstrap is not PrizePool liquidity

The PRE position used to satisfy the Genesis condition is not automatically counted as PrizePool liquidity. If PRE is later converted into liquid settlement capital, that resulting value becomes subject to the normal Treasury and solvency rules.

4.4 Genesis activation is one-way

Once Genesis is legitimately activated, later PRE price movements cannot invalidate already-issued tickets or retroactively deactivate Genesis.

5. Ticket Class Ladder

PRE-RICH uses the following ticket classes:

Class

Ticket price

Genesis

1 USDM

2

2 USDM

3

3 USDM

4

5 USDM

5

10 USDM

6

25 USDM

7

50 USDM

8

100 USDM

The protocol may present the classes as simply:

1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM

Higher classes are never enabled by an administrator. They become saleable only when the protocol's economic state satisfies the class activation rules.

6. Normal Prize Economics

The normal game keeps the existing five winning tiers and their current probability distribution.

The current Plutus game rules use base multipliers:

Tier

Base multiplier

Effective normal payout

Tier 1

2

1× ticket price

Tier 2

5

2.5× ticket price

Tier 3

10

5× ticket price

Tier 4

200

100× ticket price

Tier 5

1000

500× ticket price

Therefore the maximum normal payout is always 500× the ticket price.

Examples:

Ticket

Maximum normal win

1 USDM

500 USDM

2 USDM

1,000 USDM

3 USDM

1,500 USDM

5 USDM

2,500 USDM

10 USDM

5,000 USDM

25 USDM

12,500 USDM

50 USDM

25,000 USDM

100 USDM

50,000 USDM

A winning payout is calculated at reveal and becomes immutable at crystallisation.

7. Effective Pool

The PrizePool gross balance is not automatically available for new economic exposure.

For accounting asset A:

EffectivePool(A) =
    TotalLiquidity(A)
  - PendingWinningLiabilities(A)
  - UnresolvedTicketReserve(A)
  - LockedJackpotLiquidity(A)

The protocol must maintain:

PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity

and therefore:

EffectivePool >= 0

Jackpot liquidity is subtracted exactly once. It must not also be represented as another liability unless the accounting transition explicitly removes it from the Jackpot bucket at the same time.

8. Unresolved-Ticket Reserve

Every unrevealed ticket creates uncertainty and therefore consumes economic capacity.

The current statistical model is:

UnresolvedReserve(N) =
    N × μ + Z × σ × sqrt(N)

For Genesis modelling, the reference distribution is:

Loss: 75%

1 USDM: 17%

2.5 USDM: 6%

5 USDM: 1.8%

100 USDM: 0.19%

500 USDM: 0.01%

with approximately:

μ ≈ 0.65 USDM
σ ≈ 6.676 USDM
Z ≈ 3.09

The statistical reserve is a risk model, not a deterministic guarantee. Safety must additionally account for the maximum possible unresolved exposure and the available safety floor.

Because payout scales linearly with ticket price, the Genesis reserve model scales linearly with class price when the probability table is unchanged.

9. Deterministic Exposure and Class Activation

The protocol must distinguish statistical reserve from deterministic worst-case exposure.

For class price P and N unresolved tickets of that class:

WorstCaseExposure(P, N) = 500 × P × N

A class may be opened for new sales only if the resulting state remains within the protocol's approved risk budget.

The activation decision must therefore be based on the post-sale economic state, not on a single static balance check.

Conceptually:

ClassAvailable(C) =
    PostSaleState(C)
    satisfies:
      - statistical reserve requirement
      - deterministic exposure requirement
      - safety floor
      - Jackpot/liability constraints

This replaces arbitrary hard-coded RequiredCapital(C) values with a state-derived rule.

9.1 Per-class exposure caps

The PrizePool state must be able to enforce a maximum unresolved exposure per class or an equivalent deterministic exposure accounting method.

An aggregate unresolved-ticket count alone is not sufficient when ticket prices differ.

9.2 Current active class

Only classes at or below the highest class currently permitted by solvency may be sold.

If solvency deteriorates, the highest permitted class contracts automatically:

100 → 50 → 25 → 10 → 5 → 3 → 2 → 1

If Genesis itself is unsafe, new ticket sales halt.

Existing tickets remain valid and existing crystallised liabilities remain payable.

9.3 Hysteresis

Activation and suspension thresholds should be separate so that a class does not oscillate on and off because of small market or accounting changes.

10. Treasury Distribution

All player payments enter Treasury and are then allocated according to protocol rules.

The economic priority is:

crystallised winning liabilities;

unresolved-ticket reserve;

PrizePool safety capital;

required locked Jackpot capital;

Reserve protection;

only then distributable surplus.

A proposed initial configurable distribution remains:

75% PrizePool
10% Reserve
10% Stake
5% Maintenance

These percentages are configuration parameters, not unconditional claims on gross revenue. They must never override solvency requirements.

Jackpot funding must come from genuine surplus/available economic capacity, not from capital already required to satisfy player liabilities.

11. Jackpot Economy

The Jackpot is separate from the five normal symbols. It must not change the normal probability distribution.

The Jackpot must be substantially larger than the maximum normal win.

11.1 Reference unit

Let:

M = 500 × HighestClassEverActivated

where HighestClassEverActivated is monotonic and is not reduced by later temporary solvency contraction.

The reference Jackpot ladder is:

Jackpot level

Target

J1

10 × M

J2

20 × M

J3

50 × M

J4

100 × M

J5

250 × M

At Genesis, where M = 500 USDM, the reference levels are:

J1 =   5,000 USDM
J2 =  10,000 USDM
J3 =  25,000 USDM
J4 =  50,000 USDM
J5 = 125,000 USDM

After class 100 has once been activated, M = 50,000 USDM and the corresponding levels become:

J1 =   500,000 USDM
J2 = 1,000,000 USDM
J3 = 2,500,000 USDM
J4 = 5,000,000 USDM
J5 = 12,500,000 USDM

These levels form the economic reference ladder. Their implementation constants must be frozen before contract changes are made.

11.2 Jackpot accumulation

Jackpot liquidity accumulates only from economic capacity that remains after mandatory obligations and safety requirements.

A governed JackpotAllocationRate may determine what fraction of genuine distributable surplus is locked into the Jackpot. The rate is not yet a frozen constant and must be chosen after simulation.

11.3 Jackpot activation

A Jackpot level becomes active when its locked Jackpot balance reaches that level's target and the resulting state remains solvent.

JackpotActive(level) =
    LockedJackpotLiquidity >= Target(level)

The actual Jackpot amount available to the winner may be the full locked Jackpot balance, subject to the final payout accounting rule adopted before implementation.

11.4 Jackpot selection

Jackpot assignment must use the protocol's cryptographically verifiable randomness. No operator, backend or administrator may select the recipient.

A Jackpot event must be domain-separated from the normal symbol derivation so that adding the Jackpot cannot alter the normal five-symbol distribution.

11.5 Jackpot payout and reset

After a successful Jackpot payout, the paid Jackpot liability must be transferred into the normal pending-liability accounting and the Jackpot bucket reset according to the final state transition.

HighestClassEverActivated remains monotonic. A later Jackpot rebuild therefore starts from the same maturity-based ladder rather than falling back to a lower class-derived target.

12. Prize Settlement

Prize values are frozen in USDM.

If the pool lacks sufficient USDM but has sufficient ADA or another approved asset, the protocol may settle the same frozen USDM value using the verified on-chain exchange rate.

For example:

FrozenPrize = 100 USDM

may be settled in the exact ADA amount required by the verified ADA/USDM quote, subject to rounding, freshness and minimum-UTxO rules.

Changing settlement asset must never reduce the frozen economic value of the prize.

13. Prize Crystallisation and Claims

At reveal:

Reveal
  ↓
Verify randomness
  ↓
Derive symbols/result
  ↓
Determine tier
  ↓
Check EffectivePool
  ↓
Freeze payout

A winning payout becomes a pending protocol liability and cannot later change because of:

Treasury movements;

PRE price movements;

ticket-class suspension;

governance changes;

later Pool growth or contraction.

Claims are single-use economic transitions. Claiming does not require burning the NFT.

The NFT may remain as a historical collectible after the economic claim is exercised.

14. Expiry

The initial ticket economic lifetime is at least 365 days.

Expiry removes the remaining economic claim of an unclaimed winning ticket according to the protocol expiry rules. The NFT may remain as historical data.

\n---\n\n## 14.5 Secondary Market and Economic Right\n\nTickets are transferable. For an unrevealed ticket:\n\ntext\nAlice → Bob → Charlie → Reveal\n\n\nTransfer does not modify the ticket identity, commitment, round, game configuration or future result. The economic right follows the ticket. Where permitted, a revealed but unclaimed winning ticket may also be transferred, and its crystallised payout remains attached to the ticket. Transfer must never duplicate the economic claim.\n\n---\n\n## 14.6 NFT Retention and Voluntary Burn\n\nClaiming a prize does not require destroying the ticket NFT. A claimed ticket may remain a historical collectible containing its identity, result, tier, historical payout, Jackpot status and claim status.\n\nBurning is voluntary and provides no refund, additional prize or economic bonus.\n\ntext\nCLAIM ≠ BURN\n\n\nThe protocol must never require burning a winning ticket merely to exercise its economic right.\n\n---\n\n## 14.7 Ticket-Sale Atomicity\n\nFor B1, the preferred ticket-sale transition is atomic from the protocol's economic perspective:\n\ntext\nTicket mint\n    +\nTreasury payment\n    +\nPrizePool unresolved-ticket reservation\n\n\nThe protocol must not accept an economically issued ticket when the required payment or unresolved-ticket reservation is absent. Off-chain bookkeeping cannot replace on-chain enforcement.\n\n---\n\n## 14.8 Treasury → PrizePool Funding\n\nTreasury funding of PrizePool is a protocol-controlled economic transition. The destination must be the configured PrizePool script, not an arbitrary operator wallet. Funding must preserve all liability, unresolved-reserve, Jackpot and safety-capital invariants.\n\n---\n\n## 14.9 Automatic Safety Circuit Breaker\n\nIf verified solvency deteriorates, the protocol automatically reduces new economic exposure in this order:\n\ntext\n100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT\n\n\nSuspension affects only new sales. Existing tickets, historical results and crystallised payouts remain valid. Reactivation occurs only when the defined activation condition, including hysteresis, is satisfied.\n

15. Governance

Governance may modify bounded economic parameters, including where constitutionally allowed:

Treasury percentages;

safety floor;

statistical reserve parameters;

per-class exposure limits;

activation/suspension hysteresis;

Jackpot allocation rate;

Jackpot ladder parameters;

supported settlement assets;

oracle configuration.

Governance may not:

assign an individual winner;

assign an individual Jackpot recipient;

alter a crystallised payout;

bypass solvency requirements for a specific transaction;

create a privileged personal Treasury entitlement.

Governance controls parameters. It does not become the economic authority of individual games.

16. Economic Invariants

The following properties are normative:

E1 — No privileged beneficiary
No protocol revenue is a personal entitlement of the team, founder, developer or administrator.

E2 — Protocol custody
Player payments are received by protocol-controlled components.

E3 — Liability-first accounting
Committed liabilities and reserves reduce available economic capacity.

E4 — Deterministic payout
The payout derives from protocol rules and verified randomness.

E5 — Crystallisation
A winning payout becomes immutable when crystallised.

E6 — Automatic class control
Ticket-class availability depends on verified economic state, not operator discretion.

E7 — Worst-case safety
Class activation must not create deterministic exposure beyond the approved risk budget.

E8 — Jackpot separation
The Jackpot does not alter the normal five-symbol distribution.

E9 — Jackpot autonomy
Jackpot activation and recipient selection are non-discretionary.

E10 — Transferability
The economic right follows the ticket.

E11 — Single claim
A winning economic right can be claimed only once.

E12 — No forced burn
Claim does not require NFT destruction.

E13 — Expiry
Economic rights expire according to the defined ticket lifetime.

E14 — Multi-asset settlement
Alternative settlement assets must preserve the frozen USDM economic value.

E15 — Governance limitation
Governance cannot override constitutional economic outcomes.