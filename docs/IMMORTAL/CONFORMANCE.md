# IMMORTAL Conformance

## 1. Purpose

Defines protocol-level requirements for an implementation claiming conformance to IMMORTAL.

## 2. Requirements

| ID | Requirement |
|---|---|
| C1 | Required economic state is represented or derivable. |
| C2 | Untrusted infrastructure cannot acquire forbidden economic authority. |
| C3 | Accepted obligations are represented and included in safety evaluation. |
| C4 | Protected amounts are not treated as discretionary liquidity. |
| C5 | Exposure-creating actions are checked against post-state safety. |
| C6 | Economically coupled transitions are atomic. |
| C7 | Protocol-defined derivations are deterministic and reproducible. |
| C8 | Expired rights cannot be resurrected or create new liability. |
| C9 | Settlement preserves the applicable economic value. |
| C10 | Liveness infrastructure remains subordinate to economic validity. |
| C11 | Canonical state/evidence authority is determined by the defined verification predicate, not by submission order or operator discretion. |
| C12 | Current operating state and monotonic historical state remain distinct where both are defined. |
| C13 | Crystallized economic rights are not silently recomputed by unrelated later state changes. |

## 3. Evidence

Evidence may include reference-model tests, property-based tests, adversarial tests, formal proofs, model checking, implementation traces, reproducible artifacts and independent review. Evidence must identify exactly which requirement it supports.

## 4. Status model

**Semantic:** CLOSED / OPEN / HISTORICAL / NON-CANONICAL / AMBIGUOUS  
**Implementation:** IMPLEMENTED / PARTIAL / GAP / TARGET / UNKNOWN  
**Evidence:** VERIFIED / PARTIAL / MISSING / NOT YET PRODUCED

These dimensions are independent. An implementation GAP or missing evidence does not reopen a semantically CLOSED rule.

## 5. Adapter/application profiles

Ledger-specific and application-specific requirements belong to their own conformance profiles. They do not become generic IMMORTAL requirements merely because one implementation uses them.
