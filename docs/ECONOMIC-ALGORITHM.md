# PRE-RICH Economic Algorithm

**Version:** 0.3.1 — Release Candidate
**Status:** Final algorithmic execution baseline — implementation conformance OPEN
**Protocol:** PRE-RICH Scratch & Win  
**Aligned document set:** White Paper v0.6.1 · Conformance Matrix v0.1.1  
**Authority:** Constitution → Game Economy → Game Economy Specification → this Algorithm → implementation/tests

> This document defines the ordered execution logic of the PRE-RICH economic model. It does not introduce economic policy absent from the Constitution or normative economic specifications.

## 1. Purpose

The Economic Algorithm converts the normative economic model into an
explicit, deterministic sequence of state evaluation and transitions.

It is designed to make clear:

-   what state is read;
-   what must be validated;
-   what is calculated;
-   in what order checks occur;
-   when economic exposure is created;
-   when liabilities are released or crystallised;
-   when a transition must fail;
-   which values become immutable.
## 2. Canonical Inputs

The algorithm operates on verified protocol inputs including:

-   protocol/game version;
-   canonical economic unit (USDM);
-   ticket class and price;
-   ticket identity;
-   current PrizePool state;
-   Treasury state where relevant;
-   unresolved exposure;
-   pending winning liabilities;
-   locked Jackpot liquidity;
-   safety parameters;
-   validated oracle data where another asset is used;
-   commitment;
-   validated Beacon according to the active trust model;
-   player secret at reveal;
-   validity interval / expiry state.
## 3. Economic State Vector

At minimum the economic state must represent, directly or through an
equivalent deterministic construction:

``` text
TotalLiquidity
PendingWinningLiabilities
UnresolvedTicketReserve
ClassAwareUnresolvedExposure
LockedJackpotLiquidity
CurrentActiveClass
HighestClassEverActivated
SafetyParameters
JackpotState
```

> **Note:** This vector is the minimum B1-facing economic state. If the normative Game Economy later adopts additional explicit protected-capital components, those components must be added here by normative decision. Such components must not be invented by the implementation.

## 4. Canonical Unit and Price

USDM is the canonical economic unit.

A ticket price is valid only when it exactly equals a member of:

``` text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
```

Genesis is 1 USDM.

No floating-point arithmetic is permitted in economic validation.
## 5. Sale Algorithm

A sale is valid only if all checks succeed in order:

``` text
validate ticket class
→ validate exact USDM price
→ validate payment / conversion
→ read current economic state
→ compute post-sale unresolved exposure
→ compute post-sale protected obligations
→ evaluate deterministic exposure budget
→ evaluate statistical reserve requirement
→ evaluate safety floor
→ evaluate locked Jackpot protection
→ evaluate CurrentActiveClass
→ mint ticket
→ record payment
→ reserve unresolved exposure
```

Ticket issuance, payment and unresolved reservation must be economically
atomic.

If any mandatory condition fails, the economic transition fails as a
whole.
## 5.1. Universal Transition Contract

Every economic transition is evaluated against an explicit pre-state and post-state. A transition is valid only if all mandatory predicates pass.

```text
function transition(state, input):
    require ValidVersion(input.version)
    require AuthoritativeState(state)
    require ValidInputBinding(input, state)

    candidate = DeterministicDelta(state, input)

    require NoForbiddenAuthority(input)
    require SolvencyInvariant(candidate)
    require ExposureInvariant(candidate)
    require LiabilityInvariant(candidate)
    require JackpotInvariant(candidate)
    require StateMachineInvariant(candidate)

    return CommitAtomically(candidate)
```

The function is conceptual pseudocode: concrete validator/redeemer interfaces remain implementation-specific. The invariant is that **no partial economic transition is accepted**.
## 5.2. Sale — Preconditions and Postconditions

### Preconditions

A sale requires, at minimum:

1. the ticket class is valid and currently saleable;
2. the declared price exactly matches the canonical class price;
3. payment is sufficient in USDM or a verified equivalent;
4. oracle data is valid and fresh when conversion is required;
5. the post-sale unresolved exposure remains within the approved deterministic budget;
6. statistical reserve requirements are satisfied where applicable;
7. safety-floor, liability and locked-Jackpot constraints remain satisfied;
8. ticket/payment/reservation binding can be committed atomically.

### Postconditions

If the sale succeeds:

- a unique ticket exists;
- the required payment is protocol-controlled;
- unresolved exposure is recorded exactly once;
- the resulting PrizePool state satisfies all mandatory invariants;
- no external operator decision is required to make the sale economically valid.

If any precondition fails, the sale is rejected and none of the economic effects may be treated as committed.
## 6. Solvency

The conceptual invariant is:

``` text
EffectivePool =
    TotalLiquidity
  - PendingWinningLiabilities
  - UnresolvedTicketReserve
  - LockedJackpotLiquidity
```

and:

``` text
PendingWinningLiabilities
+ UnresolvedTicketReserve
+ LockedJackpotLiquidity
<= TotalLiquidity
```

Deterministic unresolved exposure for class price `P` and unresolved
count `N` is:

``` text
WorstCaseExposure(P, N) = 500 × P × N
```

The implementation must use class-aware exposure or an equivalent
deterministic mechanism.
## 7. Statistical Reserve

The reference model is:

``` text
UnresolvedReserve(N) = N × μ + Z × σ × √N
```

This is a risk model and does not replace the deterministic worst-case
protection.

### Reserve versus deterministic exposure

The statistical reserve and deterministic exposure are **not interchangeable**.

```text
Statistical Reserve
    = risk model / capital model

Deterministic Exposure
    = worst-case protocol protection
```

Where the current B1 implementation uses a class-aware unresolved reserve or equivalent deterministic state, that implementation requirement must remain traceable to the normative economic specification. A statistical reference model must not silently become the sole on-chain solvency guarantee.

In short:

- **Deterministic exposure** constrains how much worst-case risk may be opened.
- **On-chain unresolved reservation** must follow the adopted specification, including any class-aware B1 representation.
- **Statistical reserve** remains a risk/capital model unless and until a normative rule explicitly binds a specific formula to enforcement.

## 8. Active Class

The protocol determines:

``` text
CurrentActiveClass =
    highest class whose verified post-sale state remains safe
```

The ladder is:

``` text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100
```

Contraction is:

``` text
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT
```

`HighestClassEverActivated` is monotonic and is distinct from
`CurrentActiveClass`.

Activation and suspension use separate thresholds to prevent
oscillation. Exact numerical hysteresis remains a policy/conformance
item until explicitly frozen.
## 9. Commit

Commit establishes the ticket-bound commitment before the result can be
known.

The commitment must bind the required game/ticket context and secret
according to the cryptographic specification.
## 10. Reveal

Reveal proceeds:

``` text
validate expiry boundary
→ validate commitment
→ validate Beacon
→ derive deterministic seed
→ derive symbols / Jackpot result
→ determine payout
→ verify economic capacity
→ release unresolved exposure
→ create crystallised liability if winning
→ freeze result and payout
```

A late reveal after expiry must not create claimability or revive a
dissolved economic right.
## 10.1. Reveal — Preconditions and Postconditions

### Preconditions

- ticket identity and commitment are valid;
- reveal satisfies the applicable validity/expiry boundary;
- Beacon/randomness input is valid under the active trust model;
- the derived result is deterministic for the authenticated inputs;
- the resulting economic transition satisfies capacity and solvency constraints.

### Postconditions

For a valid reveal:

- result and tier are determined;
- unresolved exposure is released exactly once;
- if winning and economically valid, the payout becomes a crystallised liability;
- the payout is frozen and cannot be recalculated from later mutable state.

For an expired ticket, a late reveal may preserve historical information where permitted, but **must not create a new claim or revive a dissolved economic right**.
## 11. Crystallisation

Once crystallised, the payout is immutable.

Later changes to:

-   liquidity;
-   Treasury;
-   PRE valuation;
-   active class;
-   Jackpot state;
-   governance parameters;

must not recalculate an already crystallised payout.
## 12. Claim

Claim validates an already-established right.

It must:

-   verify current ownership where required;
-   verify ticket identity and revealed state;
-   use the frozen payout;
-   settle the exact economic value;
-   reduce the corresponding pending liability exactly once;
-   prevent a second claim;
-   not require NFT burning.

`CLAIM ≠ BURN`.
## 12.1. Claim — Preconditions and Postconditions

### Preconditions

- claimant is the current rightful owner under the protocol rules;
- ticket is in a claimable revealed state;
- the frozen payout exists and is valid;
- the claim has not already been consumed;
- settlement data is valid for the selected asset.

### Postconditions

- the frozen economic value is settled exactly;
- the corresponding pending liability is reduced exactly once;
- the ticket becomes non-claimable;
- NFT retention remains possible;
- no payout is recomputed from current pool conditions.

`CLAIM ≠ BURN`.
## 13. Expiry

After `expiresAt`:

-   no claim may be created;
-   no new liability may be created;
-   unresolved reserve is released exactly once;
-   an expired winning right is dissolved exactly once;
-   historical information may remain auditable;
-   a late reveal must be economically inert with respect to new
    claimability and liability.
## 13.1. Expiry — Terminal Economic Boundary

Expiry is a one-way economic boundary. After `expiresAt`, the algorithm must ensure:

```text
newClaimability = false
newLiability = false
lateRevealEconomicEffect = none
```

The unresolved reserve must be released at most once, and an expired winning right must not be reconstructed by a later transaction. Exact ticket lifetime remains an explicitly open policy parameter until adopted normatively.
## 14. Multi-Asset Settlement

USDM remains the economic reference.

For ADA or another approved asset:

``` text
verified asset identity
→ valid/fresh oracle
→ deterministic conversion
→ conservative rounding
→ exact USDM-equivalent settlement
```

A USDM obligation must never be interpreted as an identical integer
quantity of lovelace or another asset.
## 15. Jackpot

The Jackpot is separate from normal symbol probabilities.

Reference maturity:

``` text
M = 500 × HighestClassEverActivated
```

Reference ladder:

``` text
J1 = 10 × M
J2 = 20 × M
J3 = 50 × M
J4 = 100 × M
J5 = 250 × M
```

Funding occurs only from genuine residual surplus after mandatory
obligations and protected capital.

No fixed Jackpot allocation rate is normative until separately adopted.

Payout must satisfy:

``` text
JackpotPayout <= LockedJackpotLiquidity
```

The threshold-vs-full-balance payout choice remains explicitly open
until adopted.
## 16. Treasury

Treasury accounting is liability/protection-first.

Historical fixed splits are non-canonical.

No team, founder, developer or administrator receives an automatic
personal economic entitlement.
## 17. Failure Semantics

Invalid transitions fail closed.

Examples include:

-   invalid class;
-   non-canonical price;
-   insufficient verified payment;
-   unsafe post-sale state;
-   excessive exposure;
-   stale or invalid oracle;
-   invalid commitment;
-   invalid Beacon;
-   expired claim;
-   double claim;
-   malformed Jackpot transition.
## 17.1. Fail-Closed Matrix

| Failure condition | Required behaviour |
|---|---|
| Invalid class | Reject sale |
| Non-canonical price | Reject sale |
| Insufficient verified payment | Reject sale |
| Stale/malformed oracle | Reject affected transition |
| Unsafe post-sale state | Reject sale |
| Exposure limit exceeded | Reject sale |
| Invalid commitment | Reject reveal |
| Invalid Beacon | Reject reveal |
| Expired claim | Reject claim |
| Double claim | Reject claim |
| Late reveal attempting liability | Reject economic effect |
| Jackpot payout above locked liquidity | Reject Jackpot transition |
| Conflicting canonical state | Reject transition |
| Malformed datum/redeemer | Reject transition |

Fail-closed means the invalid transition produces no accepted economic state change.
## 18. Conservation and Invariants

The implementation must preserve, as applicable:

-   no privileged beneficiary;
-   protocol-controlled custody;
-   liability-first accounting;
-   deterministic payout;
-   payout crystallisation;
-   automatic class control;
-   worst-case safety;
-   Jackpot separation;
-   Jackpot non-discretion;
-   ticket transferability;
-   single claim;
-   no forced burn;
-   expiry finality;
-   multi-asset value preservation;
-   governance limitation;
-   activity-proportional operations.
## 18.1. What Must Be Proven

The algorithm is not itself proof. Each critical property requires evidence at the appropriate layer:

| Property | Minimum evidence target |
|---|---|
| Deterministic calculations | Reference model + unit/property tests |
| State-machine correctness | Transition tests + validator-level tests |
| Exposure/solvency | Adversarial + invariant tests + on-chain enforcement |
| Commit-reveal binding | Cryptographic tests + validator enforcement |
| Claim single-use | Validator/integration tests |
| Expiry finality | Boundary and late-reveal adversarial tests |
| Multi-asset value preservation | Oracle/rounding vectors + settlement tests |
| Jackpot protection | State-transition + adversarial tests |
| Cross-layer parity | Plutus/TypeScript golden vectors |
| Release reproducibility | Reproducible build/test artifacts |

A passing TypeScript mirror is evidence of model behaviour, not proof of Plutus enforcement.
## 19. Proof Obligations

The algorithm requires evidence at multiple layers:

1.  reference-model validation;
2.  unit/property tests;
3.  adversarial tests;
4.  Plutus validator enforcement;
5.  off-chain builder parity;
6.  generated-artifact parity;
7.  integration tests;
8.  reproducible release evidence.

A passing TypeScript mirror is not by itself proof of Plutus
enforcement.
## 20. Conformance Status

The algorithm is the formal execution baseline, not a declaration that
the current implementation already conforms.

Current conformance work is tracked by:

- [Economic Algorithm Conformance Matrix](docs/ECONOMIC-ALGORITHM-CONFORMANCE-MATRIX.md) — algorithm area → required implementation property → evidence status;
- [Constitution Gap Matrix](docs/CONSTITUTION-GAP-MATRIX.md) — broader constitutional and protocol conformance.

The Algorithm defines the execution baseline. It does **not** claim that the
current repository already conforms to that baseline.

A conformance item becomes release-complete only when the normative rule,
implementation, and required evidence agree on the same repository commit.

Mainnet readiness requires closure of the applicable critical gaps,
adversarial evidence, release reproducibility and independent security
review.
## 20.1. What the Algorithm Does Not Decide

The algorithm does not create policy. In particular, it does not independently decide:

- new ticket classes or prices;
- a Jackpot allocation rate;
- threshold-versus-full-balance Jackpot payout where that policy remains open;
- exact expiry duration while unfrozen;
- exact numerical hysteresis values while unfrozen;
- governance powers beyond the constitutional boundary;
- B3 canonicality while the B3 proof path is not implemented.

If a required policy value is missing, the correct behaviour is to stop at the policy boundary rather than invent a value.

The Algorithm does not independently create new economic policy. Where a parameter, threshold, ladder, allocation rule, or maturity scale is marked OPEN, reference, candidate, or otherwise not normatively adopted, its appearance in this document does not make it protocol law.

## 21. Authority

If this algorithm conflicts with a higher-level normative document, the
higher-level document prevails:

``` text
CONSTITUTION
    ↓
GAME ECONOMY
    ↓
GAME ECONOMY SPECIFICATION
    ↓
ECONOMIC ALGORITHM
    ↓
IMPLEMENTATION
    ↓
TESTS / PROOFS
```

The algorithm must be updated when normative economic policy changes;
implementation gaps must not be used to silently change the normative
model.
