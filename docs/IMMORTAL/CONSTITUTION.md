# IMMORTAL Constitution

**Scope:** general-purpose economic protocol  
**Status:** normative constitutional specification  
**Chain dependence:** none  
**Application dependence:** none

## 1. Purpose

IMMORTAL defines a general economic protocol whose validity derives from canonical state, verified evidence, obligations, executable/protected liquidity and admissible transitions rather than discretionary personal authority.

IMMORTAL is independent of any particular blockchain, asset, application, frontend, backend, relayer or operator.

## 2. Normative hierarchy

```text
IMMORTAL CONSTITUTION
        ↓
IMMORTAL NORMATIVE SPECIFICATIONS
        ↓
IMPLEMENTATION / ADAPTER
        ↓
TESTS / EVIDENCE
```

A lower layer cannot authorize a violation of a higher layer.

## 3. Economic sovereignty

No founder, developer, administrator, operator, relayer, publisher, adapter or frontend acquires discretionary economic authority merely by operating infrastructure.

Infrastructure may observe, index, construct, transport, submit, execute and produce evidence. It must not unilaterally determine economic truth where the protocol requires an objectively verifiable predicate.

## 4. Canonical state and truth

Economic rights and obligations derive from canonical state and verified inputs. A value is not authoritative merely because it is displayed, stored off-chain, submitted first, signed by an operator, or produced by an adapter.

The protocol must define the predicate that makes a state or evidence object authoritative.

## 5. Obligations

Accepted obligations must be represented and included in economic safety evaluation. Unresolved uncertainty that can create economic exposure must be represented by a defined reserve/exposure mechanism.

A statistical risk model does not become a deterministic guarantee merely because it is conservative.

## 6. Protected capital and surplus

Amounts required to satisfy obligations or preserve protocol viability cannot be treated as discretionary surplus.

The generic surplus boundary is:

```text
RawSurplus = max(0, EEV − ProtectedCapital)
```

The applicable specification defines EEV and ProtectedCapital.

## 7. Viability

Safety is evaluated on the resulting state of a proposed transition:

```text
S --a--> S'

accept(a) only if S' satisfies the applicable safety predicate
```

A viability kernel may be expressed as:

```text
K_Ω = { S | ∃ admissible policy : ∀ω ∈ Ω, T(S,a,ω) ∈ K_Ω }
```

A bounded computational result must not be represented as an infinite-horizon proof.

## 8. Hysteresis and historical state

Where a protocol uses operating regimes, hysteresis may separate activation and suspension thresholds to prevent oscillation. Concrete parameters belong to the scope that defines the regime.

Current operating state may contract. A monotonic historical value, once defined, must not decrease merely because current conditions deteriorate.

## 9. Atomicity

Economically coupled changes must be atomic:

```text
PRECONDITION
→ VALIDATE
→ COMPUTE DELTA
→ CHECK POST-STATE
→ COMMIT ATOMICALLY
→ POSTCONDITION
```

No partial economic state that falsely represents obligations is conforming.

## 10. Deterministic derivation

Protocol-defined derivations must be deterministic, domain-separated, versioned, reproducible and independently verifiable.

Participants may provide required witnesses/secrets. They may not choose an authoritative outcome merely by submitting that outcome as data.

## 11. Expiry

Where an economic right expires, expiry is final:

- no claimability after expiry;
- no new liability after expiry;
- no resurrection;
- a late reveal cannot recreate the economic right;
- an associated payment commitment defined to dissolve at expiry dissolves.

Exact application-specific duration is not an IMMORTAL constant unless separately made normative at protocol scope.

## 12. Governance

Governance operates only within authority granted by the applicable normative specification. It cannot assign individual economic outcomes, rewrite crystallized rights, bypass mandatory safety predicates, or create personal entitlement from protocol-controlled economic resources.

## 13. Liveness boundary

```text
Liveness mechanism ⊆ admissible execution paths
Liveness mechanism ≠ economic authority
```

A relayer, watcher, scheduler or adapter facilitates execution; it does not thereby become the economic authority.

## 14. Conformance

Conformance is determined against normative predicates and invariants. Evidence demonstrates conformance; evidence itself does not create authority.

## 15. Status model

**Semantic:** CLOSED / OPEN / HISTORICAL / NON-CANONICAL / AMBIGUOUS  
**Implementation:** IMPLEMENTED / PARTIAL / GAP / TARGET / UNKNOWN  
**Evidence:** VERIFIED / PARTIAL / MISSING / NOT YET PRODUCED

These dimensions are independent. An implementation GAP or missing evidence does not reopen a semantically CLOSED rule.
