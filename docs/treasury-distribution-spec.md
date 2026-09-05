PRE-RICH — Treasury Distribution Specification

Protocol baseline: Constitution V3 — Deterministic Economy
Scope: protocol Treasury, PrizePool funding, Reserve, Maintenance, Stake and relayer execution reward.

1. Purpose

The Treasury collects protocol revenue and distributes only the value that remains available after the protocol's existing economic obligations and safety requirements are satisfied.

Treasury distribution must be:

deterministic;

protocol-controlled;

verifiable on-chain;

independent of operator discretion;

compatible with the PrizePool solvency model;

denominated economically in USDM or verified USDM-equivalent value.

The Treasury must never become a mechanism for discretionary personal allocation.

2. Economic Denomination

USDM is the canonical economic unit.

Treasury accounting may contain ADA, USDM and other supported assets, but economic thresholds, obligations and allocation decisions must be expressed in:

USDM

or in a deterministically verified USDM-equivalent value.

A nominal ADA balance must not be used as a substitute for an economic threshold when asset prices are variable.

3. Treasury Architecture

The intended flow is:

PLAYER
   ↓
PROTOCOL TREASURY
   ↓
OBLIGATION / SAFETY ACCOUNTING
   ↓
DISTRIBUTABLE SURPLUS
   ├── PrizePool
   ├── Reserve
   ├── Stake
   └── Maintenance

A relayer may execute a permissionless distribution transaction and receive an explicitly governed execution reward, but it is not a privileged economic beneficiary.

There must be no required path:

PLAYER → TEAM WALLET → TREASURY

4. Liability-First Distribution

Treasury funds must be considered in the following order:

crystallised winning liabilities;

unresolved-ticket reserve;

PrizePool safety capital;

locked Jackpot liquidity;

Reserve protection;

distributable surplus.

The Treasury may distribute only the amount remaining after the required higher-priority obligations are satisfied.

Conceptually:

DistributableSurplus =
    VerifiedTreasuryValue
  - CrystallisedLiabilities
  - UnresolvedReserve
  - RequiredPrizePoolSafetyCapital
  - LockedJackpot
  - RequiredReserveProtection

with:

DistributableSurplus >= 0

Any negative result means that no surplus distribution is permitted.

5. PrizePool Funding

PrizePool funding is a protocol-controlled transition.

Treasury funds sent to PrizePool must be sent to the configured PrizePool script.

The funding transaction must preserve:

pending liabilities;

unresolved-ticket reserve;

locked Jackpot accounting;

required safety capital;

the distinction between economic obligations and free surplus.

PrizePool funding must not be routed through an operator-controlled personal wallet.

6. Distribution Configuration

The protocol may use governed percentages for distributable surplus.

The proposed initial configuration is:

75% PrizePool
10% Reserve
10% Stake
 5% Maintenance

These percentages apply to distributable surplus, not automatically to gross ticket revenue.

They are configuration parameters subject to governance within the constitutional limits.

They do not create personal ownership rights.

If governance changes them, the resulting configuration must remain compatible with:

economic safety;

PrizePool solvency;

Reserve protection;

Jackpot accounting;

the prohibition on privileged beneficiaries.

7. Relayer Execution Reward

The relayer is an execution facilitator.

A relayer reward may exist as a governed protocol parameter.

The reward must:

be deterministic;

be visible in the transaction;

be bounded;

not give the relayer control over economic outcomes;

not be treated as a team/founder allocation;

not override the liability-first priority.

A relayer reward must be paid only from value that is legitimately available for the relevant operation.

The relayer must not be able to choose:

winner;

tier;

payout;

Jackpot;

class activation;

Reserve protection level.

The relayer may submit or execute the transaction. The validator determines whether the transition is valid.

8. Distribution Trigger

A distribution may be triggered only when the protocol's distribution conditions are satisfied.

The trigger must be based on verified economic state, not on an arbitrary wallet balance observed by an operator.

A threshold may be used as an operational optimization, but it must not bypass the liability-first rules.

Conceptually:

VerifiedAvailableSurplus >= DistributionThreshold
        ↓
Distribution permitted

The threshold itself must be denominated in USDM or verified USDM-equivalent value.

9. Remainder and Rounding

Distribution calculations must be deterministic.

The protocol must define:

integer units;

asset precision;

rounding direction;

remainder assignment;

minimum output value rules.

Rounding must never create a hidden negative allocation or underfund a required protocol category.

Any remainder after percentage calculations must be assigned by a deterministic rule and must not be sent to an arbitrary operator destination.

10. Multi-Asset Treasury

The Treasury may hold:

USDM;

ADA;

other protocol-approved assets.

When an economic decision depends on value rather than nominal quantity, the protocol must use the approved verified oracle mechanism.

For example:

ADA quantity
    ↓
verified ADA/USDM price
    ↓
USDM-equivalent Treasury value

Stale, missing, unauthorized or inconsistent valuation data must cause the economic transition to fail when such data is required.

The Treasury must not rely on a browser-side exchange rate.

11. Jackpot Interaction

The Treasury must treat locked Jackpot liquidity as economically committed capital.

Therefore:

LockedJackpotLiquidity

must be accounted for before surplus is distributed.

The Treasury must not distribute capital required to maintain an already funded Jackpot level.

Jackpot funding itself must occur only after higher-priority liabilities and safety requirements have been satisfied.

12. Reserve Interaction

Reserve is a safety category, not a personal accumulation pool.

Before distributable surplus is created, the protocol must protect the required Reserve level.

When Reserve is below its required level:

surplus distribution
        ↓
restricted

until the defined Reserve protection condition is satisfied.

Higher ticket classes may also be suspended when required safety capital is insufficient.

13. Maintenance Interaction

Maintenance is a protocol category.

It may fund legitimate protocol operation, including:

infrastructure;

indexing;

monitoring;

oracle-related infrastructure;

transaction execution costs;

other explicitly approved protocol expenses.

Maintenance does not constitute a team salary, founder entitlement or developer share.

A Maintenance balance is protocol-controlled.

14. Treasury Thresholds and Ticket Class Activation

Treasury distribution thresholds must not be confused with ticket-class activation thresholds.

They serve different purposes:

DistributionThreshold
    ↓
determines when a surplus distribution may be operationally executed

while:

ClassActivation
    ↓
determines whether a ticket class is economically safe to sell

A Treasury distribution must never be used to bypass a class safety requirement.

A class must become available only when its own economic conditions are satisfied.

15. Safety Invariant

At every valid Treasury/PrizePool state:

CrystallisedLiabilities
+ UnresolvedReserve
+ RequiredPrizePoolSafetyCapital
+ LockedJackpot
+ RequiredReserveProtection
≤ VerifiedProtocolEconomicValue

The precise implementation may distribute value across several protocol-controlled components, but the aggregate economic invariant must remain true.

16. Atomicity and Non-Discretion

A Treasury transition must be rejected if:

the destination category is invalid;

the economic accounting does not balance;

a required liability is omitted;

the Jackpot is double-counted;

an unauthorized destination receives protocol value;

rounding violates the defined invariant;

the transition depends on an operator decision not represented in protocol rules.

A backend or relayer may construct and submit the transaction, but cannot define a different economic interpretation.

17. Legacy Dynamic Pricing

The previous Treasury document contained a separate model in which ticket/ad prices changed according to hourly demand, floor, ceiling and step values.

That mechanism is not the PRE-RICH game ticket economic model.

PRE-RICH game ticket pricing is defined by the constitutional class ladder:

1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM

with availability determined by economic safety.

A separate commercial feature may use deterministic dynamic advertising pricing, provided it does not alter the game ticket economy.

18. Ad-Slot Monetization

Advertising is a separate protocol revenue source.

The advertising subsystem may use fixed packages such as:

1 hour;

6 hours;

1 day;

3 days.

Advertising prices are commercial configuration and must not be confused with ticket-class economics.

Where ad payments use ADA or another asset, the contract may require a minimum verified USDM-equivalent value.

The ad subsystem must not be allowed to consume funds already reserved for player winnings or mandatory PrizePool safety.

19. Preprod Defaults

The following are operational defaults only and are not constitutional economic guarantees:

Distribution trigger:
    governed USDM-equivalent threshold

Distribution base:
    distributable surplus

Initial surplus allocation proposal:
    75% PrizePool
    10% Reserve
    10% Stake
     5% Maintenance

Relayer reward:
    governed bounded parameter

Any concrete numeric deployment configuration must be recorded in the applicable deployment/configuration documentation and tested against the constitutional invariants.

20. Implementation Requirements

The Treasury implementation must support:

protocol-controlled destinations;

verified USDM-equivalent valuation when required;

liability-first accounting;

deterministic allocation;

deterministic remainder handling;

bounded relayer reward;

locked Jackpot protection;

Reserve protection;

no personal beneficiary path;

safe failure when required economic data is invalid.

21. Verification Requirements

Tests must cover at least:

distribution below threshold;

distribution at threshold;

distribution above threshold;

crystallised liability protection;

unresolved reserve protection;

PrizePool safety protection;

Jackpot lock protection;

Reserve protection;

percentage accounting;

remainder handling;

oracle valuation;

stale oracle rejection;

unauthorized oracle rejection;

unauthorized destination rejection;

relayer reward bounds;

no operator discretionary allocation.

A Treasury implementation is not complete merely because the arithmetic balances in an off-chain model. The corresponding on-chain transition must enforce the same rules.

22. Relationship with the Game Economy

This document is subordinate to:

docs/CONSTITUTION.md

and must remain consistent with:

docs/Game-Economy.md
docs/Game-Economy-Specification.md
docs/CONSTITUTION-GAP-MATRIX.md

If a contradiction appears, the constitutional rule prevails and the affected specification must be corrected before code is changed.