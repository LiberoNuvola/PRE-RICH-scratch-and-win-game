# IMMORTAL / PRE-RICH — Operational Runbook

**Status:** OPERATIONAL / NON-NORMATIVE  
**Authority:** subordinate to the canonical IMMORTAL and PRE-RICH specifications.  
**Repository reference:** `b1-hardening` / `9d0b8c6`  
**Scope:** operational checks, failure handling, liveness and conformance observation.  
**This document does not define economic policy.**

## 1. Authority and reading rule

This runbook must be read together with:

1. `docs/IMMORTAL/CONSTITUTION.md`
2. `docs/IMMORTAL/ECONOMIC-KERNEL.md`
3. `docs/IMMORTAL/ECONOMIC-ALGORITHM.md`
4. `docs/IMMORTAL/ARCHITECTURE.md`
5. `docs/IMMORTAL/CONFORMANCE.md`
6. `docs/CARDANO/ADAPTER-SPECIFICATION.md`
7. `docs/PRE-RICH/CONSTITUTION.md`
8. `docs/PRE-RICH/APPLICATION-SPECIFICATION.md`
9. `docs/PRE-RICH/GAME-ECONOMY.md`
10. `docs/PRE-RICH/ECONOMIC-ALGORITHM.md`
11. `docs/PRE-RICH/CONFORMANCE.md`

Operational observations do not override those sources.

## 2. Status separation

`CLOSED` at semantic/normative level does not mean implementation or evidence is complete.

In particular:

- Hysteresis is semantically and structurally **CLOSED**; numerical derivation/parametrization and implementation/conformance evidence remain **CLOSING/OPEN**.
- `KA=8`, `KC=4`, `KD=4` are the current canonical baseline and their semantic roles are **CLOSED**; quantitative robustness, implementation and evidence remain **CLOSING/OPEN**.
- An implementation GAP/FAIL is not an OPEN DECISION.

## 3. Before enabling or resuming sales

Verify, against the canonical specifications:

- canonical USDM economic denomination and class state;
- PRE Treasury bootstrap condition;
- liability-first / ProtectedCapital accounting;
- `RawSurplus = max(0, EEV - ProtectedCapital)`;
- post-sale Economic Gate;
- atomic payment + reservation + issuance;
- valid settlement conversion where a non-USDM asset is used;
- Jackpot isolation;
- current active-class enforcement and suspension state.

Do not infer a successful conformance state merely because an off-chain or UI calculation succeeds.

## 4. During operation

### Expiry

Expiry is final.

After expiry:

- no claim may be created;
- no new liability may be created;
- no expired right may be resurrected;
- a late reveal must not create claimability;
- the expired payment commitment dissolves according to the canonical accounting transition.

The exact ticket lifetime is a separate OPEN policy decision. This runbook does not invent a duration.

### Jackpot

Keep `LockedJackpotLiquidity` isolated from ordinary obligations and operating liquidity.

Enforce the canonical boundaries:

- `NewJackpot <= RawSurplus`;
- Jackpot payout cannot exceed `LockedJackpotLiquidity`;
- Jackpot accounting remains separate from normal ticket liabilities;
- crystallized Jackpot outcomes are immutable;
- selection/reset/liability transitions follow the canonical state machine.

The unresolved Jackpot payout mode is not chosen by this runbook.

### Settlement

Alternative settlement assets are acceptable only when the verified conversion preserves the frozen USDM economic value and validates:

- asset identity;
- price validity;
- freshness;
- decimals;
- deterministic rounding;
- min-UTxO treatment;
- rejection of stale/malformed data.

### Liability-first

Operational distribution must never consume protected capital merely because a balance is visible.

Existing liabilities, unresolved exposure, required protection and locked Jackpot liquidity take precedence over discretionary surplus.

## 5. Relayer / keeper / operator boundary

The relayer/backend/keeper is an executor or observer, **not economic authority**.

No automatic personal reward or entitlement is implied.

An execution reward may exist only if it is:

1. explicitly authorized by the applicable normative specification;
2. explicitly represented in the governed state/configuration;
3. bounded and auditable;
4. subordinate to existing liabilities and protected capital;
5. unable to change ticket outcomes, payout values, truth, or solvency gates.

Operational effort or an off-chain cost does not by itself create a protocol liability.

Hypothetical, optional or externally incurred costs must not be promoted to protocol liabilities without an explicit normative basis.

## 6. Incident classification

When observed behavior differs from a canonical rule, classify the issue before changing anything:

- **SEMANTIC:** possible contradiction in authoritative specifications.
- **MODEL:** formula/structure mismatch.
- **PROOF/VALIDATION:** insufficient mathematical/computational evidence.
- **IMPLEMENTATION GAP/FAIL:** code does not enforce a decided rule.
- **EVIDENCE GAP:** behavior may be correct but reproducible evidence is missing.
- **OPEN DECISION:** only when a genuine normative choice remains unresolved.

A GAP/FAIL does not reopen a CLOSED semantic decision.

## 7. Safe operational principle

If an external actor, relayer, keeper or backend fails, the system must not gain a new economic authority because of that failure.

The preferred architecture is event-driven and permissionless where applicable. Liveness mechanisms are subordinate to economic truth and cannot bypass economic gates.

## 8. Historical material

Historical audits, B1/B3 research, old architectures and superseded economic models may be consulted as evidence or regression references. They are not current normative authority.

The historical `75/10/10/5` allocation is non-canonical and must never be used as the current economic rule.

## 9. Operational closure rule

When an operational issue is resolved:

1. identify the canonical requirement;
2. record the implementation/evidence gap;
3. update the owning conformance artifact;
4. do not create a duplicate economic policy in this runbook.

**Operational document status: NON-NORMATIVE.**
