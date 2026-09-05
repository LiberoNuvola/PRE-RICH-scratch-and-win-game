PRE-RICH B1 Audit Report — Post-Audit Economic Addendum

Applies to: docs/B1-Audit-Report.md
Baseline: B1 hardening validation on b1-hardening
Purpose: distinguish the validated B1 implementation from the subsequent Constitution V3 deterministic-economy design.

1. Historical Status

The original B1 Audit Report remains a historical record of the validation performed for commit 4ad9bcdb491b65af5bbb32a18756186a1ff0ecb5.

Its statement:

B1 PREDEPLOY STATUS: PASS

continues to describe that validation run.

This addendum does not invalidate the historical result.

2. Constitutional Economic Baseline After the B1 Audit

The protocol economics were subsequently formalized as Constitution V3 — Deterministic Economy.

The normative baseline is now:

Genesis                 = 1 USDM
Ticket classes          = 1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
Normal max payout       = 500 × ticket price
USDM                    = canonical economic denomination
ADA / other assets      = settlement instruments via verified conversion

The previous 2-USDM Genesis baseline is obsolete.

3. Important Scope Distinction

Passing the historical B1 test suite does not mean that the Constitution V3 economic state machine is fully implemented.

In particular, the following remain implementation work unless separately proven:

deterministic worst-case exposure limits;

per-class unresolved exposure accounting;

automatic CurrentActiveClass;

activation/suspension hysteresis;

monotonic HighestClassEverActivated;

deterministic Jackpot ladder state;

surplus-only Jackpot funding;

Jackpot trigger/selection/payout/reset;

complete purchase-side oracle settlement;

canonical claim-path consolidation.

The current B1 audit therefore must not be cited as proof that these V3 requirements are already implemented.

4. Statistical Reserve vs Deterministic Exposure

B1 includes the unresolved-ticket reserve model.

Constitution V3 additionally defines:

WorstCaseExposure(P, N) = 500 × P × N

These are different concepts.

The statistical reserve is a risk-management estimate.

Worst-case exposure is the deterministic economic bound required for safe class activation.

A statistical reserve must never be presented as a mathematical guarantee that every possible unresolved payout is immediately fundable.

5. Ticket-Class Availability

B1 contains suspended-class state and solvency checks, but Constitution V3 requires the complete economic decision to be deterministic from verified protocol state.

The desired model is:

verified economic state
        ↓
effective solvency / safety constraints
        ↓
class eligibility
        ↓
CurrentActiveClass

A frontend, backend or relayer must not choose a class that the on-chain economic state does not permit.

6. Jackpot

The B1 audit validates the existence of Jackpot accounting and threshold-based activation.

Constitution V3 expands this into a deterministic ladder tied to:

M = 500 × HighestClassEverActivated

with proposed levels:

10M
20M
50M
100M
250M

The ladder, funding, trigger, payout and reset semantics must be treated as future implementation requirements until the corresponding on-chain and off-chain proof exists.

7. Audit Interpretation Rule

Future audit reports must distinguish between:

Historical B1 evidence — what was actually tested;

Constitutional requirements — what the protocol must guarantee;

Implementation status — what the current source code actually enforces.

These categories must never be collapsed into a single “PASS” statement.

A future release may claim the V3 economic system as implemented only after the relevant Gap Matrix rows reach DONE under its definition of done.