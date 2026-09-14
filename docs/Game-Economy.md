PRE-RICH — GAME ECONOMY

Status: Normative economic policy baseline
Protocol: PRE-RICH Scratch & Win
Baseline: B1 / b1-hardening
Document role: Authoritative economic policy. It defines economic semantics and invariants; it does not by itself prove current implementation conformance.

1. Purpose

PRE-RICH uses a transparent, deterministic and protocol-controlled game economy.

The economic model is based on:

protocol-controlled custody;

no privileged personal allocation;

liability/protection-first accounting;

verified randomness;

ticket-bound economic rights;

state-derived class activation and automatic contraction;

a separate, protected Jackpot;

bounded governance that cannot override individual economic outcomes.

The canonical economic denomination is USDM. Other assets may be accepted for payment or settlement only through a validated conversion mechanism.

2. Canonical Economic Parameters

The following values are frozen for this baseline:

KA = 8

KC = 4

KD = 4

Ticket ladder: 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM

Genesis ticket price: 1 USDM

Genesis activation threshold: verified PRE Treasury value >= 4,000 USDM

Maximum normal payout: 500 × P

Unresolved-ticket reserve: price-based statistical model

Deterministic unresolved exposure: 500 × P × N

HighestClassEverActivated is monotonic

Jackpot is separate, locked and protected

RawSurplus = max(0, ExecutableEconomicValue - ProtectedCapital)

These parameters must not be silently changed by implementation convenience.

3. Protocol Custody and Accounting

Player payments enter protocol-controlled Treasury. No required economic flow may route player funds through a personal operator wallet.

There is no protocol-level team, founder, developer or administrator entitlement. Maintenance is an accounting category, not a personal claim.

Accounting is liability-first:

crystallised winning liabilities;

unresolved-ticket reserve and deterministic exposure;

safety capital;

required locked Jackpot capital;

reserve protection and other mandatory obligations;

only then genuine distributable surplus.

Effective Pool

For accounting asset A:

EffectivePool(A) =
    TotalLiquidity(A)
  - PendingWinningLiabilities(A)
  - UnresolvedTicketReserve(A)
  - LockedJackpotLiquidity(A)

The invariant is:

PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity

Jackpot liquidity must be deducted exactly once.

4. Genesis Activation

The first class is:

Genesis = 1 USDM

Genesis may activate only when protocol-controlled PRE has verified economic value of at least:

TreasuryPREValueUSDM >= 4,000 USDM

The bootstrap PRE position is not automatically PrizePool liquidity.

Once Genesis is legitimately activated, later PRE price movements cannot retroactively invalidate Genesis or already-issued tickets.

5. Ticket Class Ladder

1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM

Classes are never enabled by an administrator. Saleability is derived from verified post-sale economic state.

The current active class and the historical maximum class are distinct:

CurrentActiveClass may contract when solvency deteriorates.

HighestClassEverActivated only increases and anchors Jackpot maturity.

6. Normal Prize Economics

The normal game retains its five winning tiers.

Tier

Base multiplier

Effective payout

1

2

1 × P

2

5

2.5 × P

3

10

5 × P

4

200

100 × P

5

1000

500 × P

Therefore:

MaximumNormalPayout(P) = 500 × P

A winning payout is calculated at reveal and becomes immutable at crystallisation.

7. Unresolved-Ticket Reserve

Every unrevealed ticket consumes economic capacity.

The reference statistical model is:

UnresolvedReserve(N) = N × μ + Z × σ × sqrt(N)

Genesis reference values:

μ ≈ 0.65 USDM
σ ≈ 6.676 USDM
Z ≈ 3.09

Reference Genesis distribution:

Loss       75%
1 USDM     17%
2.5 USDM    6%
5 USDM      1.8%
100 USDM    0.19%
500 USDM    0.01%

The statistical reserve is a risk model, not a deterministic guarantee.

8. Deterministic Exposure and Class Control

For class price P and N unresolved tickets:

WorstCaseExposure(P, N) = 500 × P × N

A proposed sale is valid only if the post-sale state satisfies all mandatory economic constraints.

Conceptually:

ClassAvailable(C) =
    PostSaleState(C)
    satisfies:
      - statistical reserve requirement
      - deterministic exposure requirement
      - safety floor
      - liability constraints
      - protected Jackpot constraints

An aggregate unresolved count alone is insufficient because ticket prices differ. The implementation must maintain class-aware exposure or an equivalent deterministic mechanism.

Automatic contraction

When solvency deteriorates:

100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT

Suspension affects only new sales. Existing tickets and crystallised liabilities remain valid.

Hysteresis

Activation and suspension use separate thresholds to avoid oscillation.

The economic principle is frozen. Exact numerical hysteresis validation is an implementation/conformance matter, not a reopening of the semantic decision.

The canonical kernel parameters are:

KA = 8
KC = 4
KD = 4

9. Treasury Distribution

The former:

75% PrizePool / 10% Reserve / 10% Stake / 5% Maintenance

split is historical and non-canonical.

It is:

not a constitutional default;

not an obligation;

not a current economic constant;

not a personal entitlement.

Current accounting is liability/protection-first, followed by genuine distributable surplus and any explicitly governed policy distribution.

10. Jackpot Economy

The Jackpot is economically separate from the five normal symbols and must not alter their probability distribution.

10.1 Maturity reference

Let:

M = 500 × HighestClassEverActivated

HighestClassEverActivated is monotonic.

Reference ladder:

J1 = 10 × M
J2 = 20 × M
J3 = 50 × M
J4 = 100 × M
J5 = 250 × M

At Genesis (M = 500 USDM):

5,000 / 10,000 / 25,000 / 50,000 / 125,000 USDM

After class 100 has once been activated (M = 50,000 USDM):

500,000 / 1,000,000 / 2,500,000 / 5,000,000 / 12,500,000 USDM

10.2 Funding

Jackpot funding comes only from genuine residual surplus and must pass the Economic Gate.

There is no fixed canonical JackpotAllocationRate.

Any future allocation policy is a separate normative decision only if such a policy is actually required. Its future consideration must not be presented as a current fixed rule.

10.3 Activation

A level is active when:

LockedJackpotLiquidity >= Target(level)

and the resulting state remains solvent.

10.4 Payout safety invariant

The payout can never exceed the locked Jackpot:

JackpotPayout <= LockedJackpotLiquidity

The policy choice between paying the threshold amount and paying the full current locked balance remains explicitly open until adopted as a normative decision. Implementation must not silently choose one.

10.5 Selection and reset

Jackpot assignment uses cryptographically verifiable randomness and is non-discretionary.

After payout, the paid amount becomes a normal pending liability and the Jackpot bucket is reduced exactly once. HighestClassEverActivated remains monotonic.

11. Settlement

Prize values are frozen in USDM.

Settlement may occur in USDM, ADA or another approved asset only when the verified conversion preserves the frozen USDM economic value.

Oracle validation must address:

asset identity;

price validity;

freshness;

decimal handling;

deterministic rounding;

minimum-UTxO treatment;

rejection of stale or malformed data.

The economic value of a crystallised prize cannot be reduced by changing settlement asset.

12. Reveal, Crystallisation and Claim

At reveal:

Reveal
  ↓
Verify randomness
  ↓
Derive result
  ↓
Determine tier / Jackpot result
  ↓
Check economic capacity
  ↓
Freeze payout

A crystallised payout is immutable.

It cannot be changed by:

Treasury movements;

PRE price changes;

class suspension;

governance changes;

later Pool growth or contraction.

Claims are single-use economic transitions.

CLAIM ≠ BURN: claiming does not require NFT destruction.

13. Expiry

The economic semantics of expiry are frozen:

no claim is possible after expiresAt;

no new liability is created after expiry;

unresolved reserve is released exactly once;

an expired unclaimed winning right is released exactly once;

a late historical reveal may preserve historical information;

a late reveal must not create claimability or revive a dissolved economic right.

The exact ticket lifetime duration remains an explicitly open policy parameter. No specific duration is normative until separately adopted.

14. Secondary Market and Ticket Identity

Tickets are transferable.

Transfer does not alter:

ticket identity;

commitment;

round;

game configuration;

future result.

The economic right follows the ticket.

A revealed but unclaimed winning ticket may be transferable where permitted; its crystallised payout remains attached to the ticket. Transfer must never duplicate the economic claim.

15. NFT Retention and Voluntary Burn

A claimed ticket may remain as a historical collectible containing its identity, result, tier, payout and claim status.

Burning is voluntary and provides no refund, bonus or additional economic right.

CLAIM ≠ BURN

16. Ticket-Sale Atomicity

The intended B1 economic transition is:

Ticket mint
    +
Treasury payment
    +
PrizePool unresolved-ticket reservation

The protocol must not accept an economically issued ticket when the required payment or reservation is absent.

Off-chain bookkeeping cannot substitute for on-chain enforcement.

17. Treasury → PrizePool Funding

Treasury funding of PrizePool is protocol-controlled and must target the configured PrizePool script.

Funding must preserve:

crystallised liabilities;

unresolved reserve;

deterministic exposure;

locked Jackpot;

safety capital;

all other mandatory economic invariants.

18. Operational OPEX

Maintenance is a protocol accounting category, not an automatic personal reimbursement.

Operational observation should be activity-proportional:

SLEEP: no relevant event pending;

ACTIVE: protocol-relevant event requires observation/construction;

QUIESCENT: event completed, awaiting the next trigger.

Recovery is a liveness function only. It cannot alter outcomes, economic rights, randomness, payouts or protocol truth.

B1 may require an authorized Beacon publisher/relayer. A future B3 proof path must not be assumed to be implemented.

19. Governance

Governance may modify bounded parameters where constitutionally permitted, including:

safety floor;

statistical reserve parameters;

class exposure limits;

activation/suspension hysteresis;

future Jackpot allocation policy;

Jackpot ladder parameters;

supported settlement assets;

oracle configuration.

Governance may not:

assign an individual winner;

assign a Jackpot recipient;

alter a crystallised payout;

bypass solvency requirements for a specific transaction;

create a privileged personal Treasury entitlement.

Governance controls parameters; it does not become the economic authority of individual games.

20. Economic Invariants

E1 — No privileged beneficiary
No protocol revenue is a personal entitlement.

E2 — Protocol custody
Player payments are received by protocol-controlled components.

E3 — Liability-first accounting
Committed liabilities and reserves reduce available capacity.

E4 — Deterministic payout
Payout derives from protocol rules and verified randomness.

E5 — Crystallisation
A winning payout becomes immutable when crystallised.

E6 — Automatic class control
Class availability depends on verified economic state.

E7 — Worst-case safety
New exposure must remain within the approved deterministic risk budget.

E8 — Jackpot separation
The Jackpot does not alter normal symbol probabilities.

E9 — Jackpot autonomy
Jackpot activation and recipient selection are non-discretionary.

E10 — Transferability
The economic right follows the ticket.

E11 — Single claim
A winning economic right can be claimed only once.

E12 — No forced burn
Claim does not require NFT destruction.

E13 — Expiry finality
Expiry dissolves the remaining economic right; late reveal cannot recreate it.

E14 — Multi-asset value preservation
Alternative settlement assets preserve the frozen USDM value.

E15 — Governance limitation
Governance cannot override individual economic outcomes.

E16 — Activity-proportional operations
Operational work must not create an automatic personal entitlement to protocol revenue.

21. Implementation Truth

This document is normative economic policy. It is not evidence that every requirement is already enforced by the B1 validator or off-chain implementation.

Implementation truth is established separately through:

docs/CONSTITUTION-GAP-MATRIX.md;

validator code and generated artifacts;

off-chain implementation;

unit/integration/conformance tests;

reference-model evidence;

deployment/predeploy gates.

An implementation gap does not reopen frozen economic parameters. A change to a frozen economic parameter requires an explicit new normative decision.

Economic baseline status: SEMANTICALLY CLOSED / NORMATIVE
Implementation status: CONFORMANCE OPEN

Open policy decisions retained explicitly:

1. Jackpot payout mode: threshold payout vs full current locked-balance payout.
2. Exact ticket expiry duration.
3. Future Jackpot allocation policy only if an allocation rule is actually required; no fixed JackpotAllocationRate is canonical by default.

Hysteresis is semantically closed; remaining work is quantitative/implementation conformance.
