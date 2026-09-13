PRE-RICH — Treasury Distribution Specification

Protocol baseline: Constitution V3 — Deterministic Economy
Status: Normative reconciliation candidate — aligned with the frozen V3 economic model
Scope: Protocol Treasury, PrizePool funding, Reserve protection, Jackpot protection, mandatory costs and permissionless execution rewards.

1. Purpose

The Treasury is a protocol-controlled economic component. It receives protocol revenue and holds value that may be used to satisfy protocol obligations, maintain required safety capital, fund the protected PrizePool, maintain protected Jackpot liquidity, satisfy mandatory future costs and, only where permitted by the canonical economic state, support legitimate residual-surplus operations.

Treasury behavior MUST be deterministic, protocol-controlled, verifiable on-chain, independent of discretionary operator allocation, and compatible with the Solvency/Viability Kernel.

The Treasury MUST NOT be a mechanism for discretionary personal, founder or team allocation.

2. Canonical Economic Denomination

USDM is the canonical economic unit.

The Treasury MAY physically hold USDM, ADA and other protocol-approved assets. When an economic decision depends on value rather than nominal quantity, the protocol MUST use the approved deterministic valuation mechanism.

asset quantity
      ↓
verified asset/USDM valuation
      ↓
USDM-equivalent economic value

A nominal asset balance MUST NOT substitute for a value-based economic threshold when prices are variable. Stale, missing, unauthorized or invalid valuation data MUST cause the relevant economic transition to fail when valuation is required.

3. Treasury Authority

The Treasury is protocol-controlled.

No human operator, backend, founder, team wallet or relayer may possess discretionary authority to determine winner, payout tier, payout amount, class activation, class contraction, unresolved exposure, safety capital, Reserve protection, Jackpot protection or distributable surplus.

A relayer MAY execute a valid permissionless transaction and MAY receive a separately defined execution reward if such reward is explicitly authorized by the canonical protocol rules. Execution authority is not economic authority.

There MUST NOT be a required path:

PLAYER → TEAM / OPERATOR WALLET → TREASURY

4. Liability-First Economic Ordering

Treasury value MUST be evaluated according to the protocol's liability-first model:

1. Crystallized winning liabilities
2. Unresolved-ticket exposure / reserve
3. Safety Capital
4. Reserve Protection
5. Locked Jackpot
6. Mandatory Future Costs
7. Residual surplus

Only value remaining after all protected obligations and capital requirements may be treated as residual surplus.

5. Executable Economic Value

Let:

EEV = ExecutableEconomicValue

EEV is the verified economic value that the protocol can legitimately use within the applicable execution horizon.

Its methodology is defined by the canonical economic specification and includes the approved asset perimeter, valuation mechanism, liquidation horizon, execution-cost assumptions and operational constraints.

EEV MUST NOT be replaced by arbitrary TVL, nominal wallet balance, global market depth or an unverified market-price assumption.

6. Protected Capital

ProtectedCapital =
      CrystallizedLiabilities
    + WorstCaseExposure
    + SafetyCapital
    + ReserveProtection
    + LockedJackpot
    + MandatoryFutureCosts

For class i:

ClassExposure_i =
    ClassPrice_i × UnresolvedCount_i

and:

WorstCaseExposure =
    500 × Σ ClassExposure_i

subject to the canonical V3 definition of class state and exposure.

An aggregate unresolved reserve MAY be stored for efficiency or compatibility only if it is invariantly equal to the required class-aware exposure.

7. Effective Pool and Residual Surplus

The protected PrizePool calculation is conceptually:

EffectivePool =
    EEV
    - CrystallizedLiabilities
    - UnresolvedReserve
    - LockedJackpot

The canonical residual surplus is:

RawSurplus =
    max(
        0,
        EEV - ProtectedCapital
    )

No Treasury operation may manufacture surplus by ignoring protected obligations.

8. No Fixed 75/10/10/5 Economic Split

The historical configuration:

75% PrizePool
10% Reserve
10% Stake
 5% Maintenance

is NOT a canonical V3 economic rule.

It MUST NOT be presented as the current protocol allocation, required initial configuration, V3 default, invariant or governing economic parameter.

It may remain in historical material solely as evidence of an earlier design.

The V3 economy is liability-first and state-derived. It does not define distributable Treasury value by applying a fixed percentage split to gross revenue or residual surplus.

Any future allocation policy MUST be introduced through an explicit normative decision and MUST NOT silently modify the frozen economic model.

9. PrizePool Funding

Treasury funds sent to the PrizePool MUST be sent to the configured PrizePool script.

Funding MUST preserve the distinction between obligated capital, protected capital and free residual surplus.

A Treasury-to-PrizePool transfer is valid only if the resulting protocol state remains inside the applicable solvency and viability conditions.

10. Jackpot Interaction

The Jackpot is a distinct protected economic component.

Locked Jackpot liquidity MUST be treated as committed capital and included in protected capital before any residual-surplus operation.

Jackpot funding is permitted only from legitimate residual surplus:

NewJackpot <= RawSurplus

and the resulting state MUST satisfy the applicable Economic Gate / viability conditions.

There is no canonical fixed Jackpot funding percentage.

11. Reserve Protection

Reserve is a protocol safety category. It is not personal capital and is not a discretionary accumulation pool.

Required Reserve protection MUST be included before residual surplus is calculated.

12. Mandatory Future Costs

Mandatory future costs are protected obligations where recognized by the canonical economic model.

They MUST be included before residual surplus is calculated.

An arbitrary OPEX number MUST NOT be treated as a permanent economic constant unless explicitly adopted as a normative parameter.

13. Relayer Execution Reward

A relayer is an execution facilitator.

A relayer reward MAY exist only if explicitly defined by the applicable protocol rules. It MUST be deterministic, bounded, visible in the transaction, payable only from legitimately available value and incapable of changing the economic result.

The relayer MUST NOT control winner selection, payout, class selection, activation, contraction, Jackpot level, Reserve protection or solvency conditions.

14. Distribution Trigger

There is no automatic right to distribute Treasury value merely because a wallet contains funds.

A distribution trigger MUST be derived from verified economic state. Any operational threshold is only a trigger/optimization and MUST NOT bypass the canonical economic gate.

VerifiedEconomicState
        ↓
ProtectedCapital
        ↓
RawSurplus
        ↓
applicable Economic Gate
        ↓
permitted transition

15. Deterministic Arithmetic

All Treasury calculations MUST use deterministic integer arithmetic.

The protocol MUST define atomic units, asset precision, conversion precision, rounding direction, minimum output constraints and remainder handling.

Rounding MUST NOT create hidden negative allocations, underfund liabilities, reduce safety capital, release protected capital or create value from nothing.

16. Multi-Asset Treasury

Multi-asset holdings are compatible with the canonical model only when their economic value can be deterministically established.

Quantity_A
    ↓
validated price_A/USDM
    ↓
USDM-equivalent value_A

The valuation mechanism MUST specify asset identity, oracle source, timestamp validity, price selection, conversion direction, arithmetic and rounding.

17. Atomicity

Treasury operations affecting economic state MUST be atomic with the corresponding state update.

A valid transition MUST NOT permit Treasury value to decrease without the corresponding economic state update, or the economic state to claim a transfer that did not occur.

18. Economic Gate

Treasury operations consuming economically protected value MUST pass the applicable Economic Gate.

Where required by the canonical rule, the gate MUST be evaluated against the post-state:

current state
      ↓
candidate transition
      ↓
post-state
      ↓
economic gate
      ↓
accept / reject

19. Governance Boundary

Governance may determine only parameters and policies explicitly left governable by the Constitution and economic specification.

Governance MUST NOT override a validator, authorize an otherwise invalid payout, bypass protected capital, rewrite unresolved exposure or release locked Jackpot value without satisfying the relevant rules.

A governance change affecting frozen economic semantics is a new protocol-economic decision and MUST be versioned accordingly.

20. Historical Parameters and Legacy Code

Historical Treasury percentage fields or implementations may remain temporarily during migration.

Their presence MUST NOT be interpreted as evidence that they are canonical V3 economics.

In particular, legacy fields corresponding to:

tdPrizePct
tdStakePct
tdReservePct
tdMaintenancePct

are migration debt when they encode the retired percentage-allocation model.

Migration must converge on the V3 economic state rather than preserve obsolete allocation semantics merely for compatibility.

21. Conformance Requirements

Treasury conformance is established only when all relevant layers agree:

Normative economic rule
        ↓
Plutus datum / redeemer types
        ↓
Validator / policy enforcement
        ↓
Off-chain transaction construction
        ↓
Positive tests
        ↓
Negative / adversarial tests
        ↓
Reproducible evidence

A documentation statement alone is insufficient.

A legacy implementation marked IMPLEMENTED in an older checklist is not proof of V3 conformance.

22. Required V3 Treasury Invariants

T1 — Liability priority: required liabilities are protected before residual surplus is available.

T2 — Unresolved exposure: all unresolved tickets contribute their canonical class-aware exposure.

T3 — Safety protection: Safety Capital and Reserve Protection cannot be silently distributed.

T4 — Jackpot protection: locked Jackpot value is protected and cannot be double-counted as free surplus.

T5 — Non-negative surplus:

RawSurplus >= 0

T6 — No fixed legacy split: the retired 75/10/10/5 model is not a V3 invariant.

T7 — Deterministic valuation: required multi-asset valuation is verified and deterministic.

T8 — Atomicity: Treasury value movement and economic state transition occur atomically.

T9 — No privileged beneficiary: no operator, founder or team wallet has discretionary economic allocation rights.

T10 — Post-state safety: the resulting state must satisfy the applicable Economic Gate.

T11 — Relayer neutrality: relayer execution cannot determine the economic result.

T12 — Governance boundary: governance cannot override protocol safety invariants.

23. Migration Rule

During migration from the legacy Treasury implementation:

identify all legacy percentage fields and percentage-based transitions;

identify all code paths depending on them;

replace their economic role with the V3 state-derived model;

preserve historical information only where useful for auditability;

add positive and negative conformance tests;

remove obsolete economic semantics only after the replacement is verified.

Migration MUST NOT be performed by merely changing percentage constants. It requires a state-model migration.

24. Current Status

The V3 economic model is semantically consolidated.

The Treasury implementation is not yet considered V3-conformant solely because legacy Treasury code exists or because an older checklist marked Treasury functionality as implemented.

The remaining implementation work is therefore a conformance problem, not an invitation to redesign the frozen economic model.

The canonical sequence is:

V3 economic specification
        ↓
V3 economic state
        ↓
economic helpers
        ↓
class-aware exposure
        ↓
SALE / lifecycle enforcement
        ↓
Treasury migration
        ↓
Jackpot migration
        ↓
adversarial conformance tests
        ↓
open-source reference freeze

Until those implementation gates are satisfied, PRE-RICH MUST continue to distinguish:

economic model = consolidated
implementation = under conformance migration

This distinction is normative and MUST be preserved in public project documentation.
