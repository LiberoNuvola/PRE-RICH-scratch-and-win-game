PRE-RICH — GAME ECONOMY SPECIFICATION

Version: B1
Status: Normative implementation specification
Protocol: PRE-RICH Scratch & Win

This document is the implementation-facing companion to docs/Game-Economy.md.

Game-Economy.md is authoritative for the economic policy. This file defines the state and transition requirements needed to implement that policy on-chain and off-chain without introducing conflicting economic rules.

1. Canonical Economic Values

The implementation must use:

Genesis ticket price = 1 USDM
Ticket classes       = 1, 2, 3, 5, 10, 25, 50, 100 USDM
Maximum normal win   = 500 × ticket price
Genesis activation   = Treasury PRE value >= 4,000 USDM

There is no fixed 2-USDM canonical ticket price and no constitutional 2-USDM prize floor.

USDM is the canonical accounting unit. ADA or other approved assets may be used for payment or settlement through verified conversion.

2. Ticket Price Validation

The ticket purchase transaction must carry a class price selected from the approved class ladder.

The on-chain validation must establish:

the class is currently active;

the declared USDM price exactly matches that class;

the player's supplied value is sufficient for that price under the verified oracle configuration;

the corresponding economic reserve is recorded atomically;

the transaction cannot create a state violating PrizePool solvency invariants.

The frontend may display a quote, but the frontend is never the authority for the economic amount.

3. Prize Rules

The normal five tiers remain those defined by the current game rules:

Tier

Base multiplier

Effective payout

1

2

1× price

2

5

2.5× price

3

10

5× price

4

200

100× price

5

1000

500× price

Therefore:

MaximumNormalPayout(price) = 500 × price

The tier is derived from the cryptographically verified result. The payout is calculated in USDM subunits using integer arithmetic.

No floating-point arithmetic is permitted in economic validation.

4. PrizePool State

The B1 PrizePool must account for at least:

TotalLiquidity
PendingWinningLiabilities
UnresolvedTicketReserve
UnresolvedTicketExposure / equivalent class-aware exposure state
LockedJackpotLiquidity
JackpotThreshold / level state
Suspended or active class state
Prize hash / configuration binding

The singleton PrizePool authority token identifies the unique pool state.

5. Effective Pool Invariant

The implementation must preserve:

EffectivePool =
    TotalLiquidity
  - PendingWinningLiabilities
  - UnresolvedTicketReserve
  - LockedJackpotLiquidity

with:

PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity

Jackpot liquidity must not be deducted twice.

6. Unresolved Tickets

An issuance transition must increase unresolved exposure atomically with ticket creation.

A reveal transition must release the ticket's unresolved reserve and, for a winning ticket, create the crystallised pending liability.

Expiry of an unrevealed ticket must release its unresolved reserve according to the protocol rules.

Because prices differ by class, an aggregate unresolved count is not sufficient by itself for deterministic worst-case protection. The implementation must either maintain per-class unresolved counts or maintain an equivalent class-aware exposure accounting state.

7. Statistical Reserve

The reference statistical model is:

R(N) = N × μ + Z × σ × sqrt(N)

The Genesis reference parameters are approximately:

μ = 0.65 USDM
σ = 6.676 USDM
Z = 3.09

When payout distributions scale linearly with class price, reserve parameters scale accordingly.

This statistical reserve is not a substitute for deterministic worst-case protection.

8. Deterministic Exposure Budget

For a ticket class priced at P USDM and N unresolved tickets:

WorstCaseExposure = 500 × P × N

A proposed class sale must be rejected if the post-sale state would exceed the approved exposure budget, safety floor or other mandatory solvency condition.

This check must be performed by the protocol state transition, not only by the frontend or relayer.

9. Automatic Class Activation and Suspension

The protocol must determine the current maximum saleable class from verified economic state.

Activation is state-derived and non-discretionary.

Suspension occurs automatically in reverse order:

100 → 50 → 25 → 10 → 5 → 3 → 2 → 1

The system must use hysteresis so that small state changes do not repeatedly toggle a class.

If Genesis is unsafe, new ticket sales must halt.

Suspension does not invalidate existing tickets or crystallised liabilities.

A separate monotonic value must track:

HighestClassEverActivated

because the Jackpot ladder is tied to protocol maturity rather than the temporarily active class.

10. Jackpot Ladder

Let:

M = 500 × HighestClassEverActivated

The reference Jackpot targets are:

J1 = 10 × M
J2 = 20 × M
J3 = 50 × M
J4 = 100 × M
J5 = 250 × M

Genesis therefore has the reference ladder:

5,000 / 10,000 / 25,000 / 50,000 / 125,000 USDM

Class-100 maturity has:

500,000 / 1,000,000 / 2,500,000 / 5,000,000 / 12,500,000 USDM

The ladder must not alter the probability distribution of the normal five symbols.

11. Jackpot Funding

Jackpot liquidity may be funded only from genuine economic capacity remaining after mandatory liabilities and safety requirements.

The implementation should expose a governed allocation parameter, provisionally named:

JackpotAllocationRate

The numeric value remains a simulation/configuration decision until frozen.

Funding must atomically increase LockedJackpotLiquidity and preserve the Effective Pool invariant.

12. Jackpot Activation and Payout

A Jackpot level is active only when its target has been reached:

LockedJackpotLiquidity >= Target(level)

and the resulting pool state remains valid.

Jackpot assignment must use cryptographic randomness and cannot be selected by an operator or backend.

At payout:

the winning condition is derived from verified randomness;

the actual Jackpot amount is frozen;

that amount becomes a pending liability;

the corresponding locked Jackpot balance is removed from the Jackpot bucket exactly once;

after successful claim, the liability is cleared;

the Jackpot then rebuilds from future surplus.

The exact choice between paying the threshold amount or the full current Jackpot balance must be frozen before implementing the final validator transition.

13. Multi-Asset Payment and Settlement

USDM remains the economic reference value.

If the player pays with ADA, the protocol must verify that the ADA amount corresponds to the required USDM class price under the approved oracle configuration.

If a winner is owed P USDM but the pool lacks enough USDM, an approved alternative settlement asset may be used to satisfy exactly the same frozen USDM value.

The oracle validation must include:

asset identity;

price validity;

freshness;

decimal handling;

deterministic rounding;

minimum-UTxO treatment;

rejection of stale or malformed data.

14. Reveal and Crystallisation

The reveal transition must:

validate the ticket commitment;

validate the synchronised randomness/beacon state;

derive the game result;

derive the normal tier or Jackpot result;

read the current PrizePool economic state;

validate the resulting payout against available capacity;

update unresolved exposure;

create or update the pending liability;

bind the ticket to the frozen payout and result.

A crystallised payout must never be recalculated in a later claim transaction.

15. Claim

A valid claim requires the current owner of the ticket to satisfy the ownership and signature conditions.

Claim must:

pay the frozen economic value;

reduce pending liabilities by exactly that amount;

prevent a second claim;

preserve the NFT unless the owner voluntarily burns it under the separate burn rules.

The implementation must not assume that a USDM-denominated payout can be paid by copying the same integer amount into lovelace.

Settlement-asset conversion must be explicit and verified.

\n---\n\n## 15.5 Secondary Market\n\nThe ticket is transferable and the economic right follows the ticket. An unrevealed ticket may move between owners without changing its commitment, result or economic identity. A revealed but unclaimed winning ticket may also be transferred where permitted; the frozen payout remains attached to the ticket.\n\n---\n\n## 15.6 Collectible Ticket and Voluntary Burn\n\nClaiming does not require burning the NFT. A claimed ticket may remain as a historical collectible containing identity, result, tier, payout and claim state. Burning is voluntary and provides no refund, bonus or additional economic right.\n\ntext\nCLAIM ≠ BURN\n\n\n---\n\n## 15.7 Atomic Sale Requirement\n\nA B1 ticket sale must economically bind:\n\ntext\nticket mint\n+\nTreasury payment\n+\nPrizePool unresolved-ticket reservation\n\n\nThe protocol must reject a sale that mints a ticket without the corresponding required payment and reservation. Off-chain bookkeeping cannot replace on-chain enforcement.\n\n---\n\n## 15.8 Treasury → PrizePool\n\nTreasury funding must target the configured PrizePool script and preserve outstanding-liability, unresolved-reserve, Jackpot and safety-capital constraints. No operator-controlled personal wallet may be used as an intermediate economic destination.\n

16. Expiry

The initial ticket lifetime is at least 365 days.

Expiry must release unresolved exposure for unrevealed tickets and must handle expired winning rights according to the economic rules without destroying the historical NFT by default.

17. Treasury Distribution

The proposed initial configuration is:

PrizePool    75%
Reserve      10%
Stake        10%
Maintenance   5%

These are governed protocol parameters, not personal entitlements.

Distribution must not occur in a way that violates:

Pending liabilities
+ unresolved reserve
+ locked Jackpot
+ safety capital
<= total economically available liquidity

18. Implementation Order

The economic model must be implemented in this order:

freeze the final economic parameters;

add class-aware exposure state or an equivalent deterministic mechanism;

implement state-derived class activation/suspension;

implement HighestClassEverActivated;

implement Jackpot ladder and funding accounting;

update ticket payment construction for dynamic USDM/ADA settlement;

update reveal and claim settlement logic;

update tests to distinguish economic value from transaction fees and lovelace;

run validator and integration tests;

update the predeploy gate and documentation.

No code change should be considered complete while Game-Economy.md and this specification disagree.