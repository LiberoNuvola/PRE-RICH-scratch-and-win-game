# IMMORTAL Economic Algorithm

## Canonical sequence

Truth
↓
Canonical State
↓
Obligations
↓
Executable Liquidity
↓
Ω
↓
Viability Kernel
↓
Safe Actions
↓
Policy
↓
Atomic Transition
↓
State History


## 1. Transition procedure

For an action `a` in state `S`:

1. identify canonical state;
2. validate authoritative inputs;
3. derive candidate transition;
4. compute `S'`;
5. evaluate mandatory invariants on `S'`;
6. accept only if `S'` is admissible;
7. commit coupled economic changes atomically;
8. record resulting state/history.

Invalid transitions fail closed.

## 2. Exposure creation

Any action that creates future economic obligation must account for it before acceptance.

## 3. Commit/reveal

Where used:

secret → commitment → canonical binding → reveal → verification → deterministic derivation

A witness may prove a result; it must not simply assert the desired result.

## 4. Crystallization

Once an economic amount is crystallized under the applicable specification, later unrelated state changes do not silently recompute it.

## 5. Claim

Claim settles an already established right once:


verify right → settle once → reduce liability once


Claim does not intrinsically require destruction of a representation of the right.

## 6. Expiry

After expiry:


newClaimability = false
newLiability = false
lateRevealEconomicEffect = none


## 7. Multi-asset value

Where an application settles in a different asset, conversion must be verified, deterministic, appropriately fresh and value-preserving. Asset choice belongs to the application/adapter profile.

## 8. Liveness

Liveness mechanism ⊆ admissible execution paths
Liveness mechanism ≠ economic authority


## 9. Status

This algorithm is normative protocol logic, not proof of implementation conformance.
