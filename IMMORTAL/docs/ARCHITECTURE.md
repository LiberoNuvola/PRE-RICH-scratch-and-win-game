# IMMORTAL Architecture

## 1. Layers

```text
IMMORTAL PROTOCOL
        ↓
ADAPTER / IMPLEMENTATION
        ↓
APPLICATION
```

Liveness infrastructure and evidence producers are subordinate execution/evidence layers.

## 2. Protocol

Defines state semantics, economic invariants, admissible transitions, authority boundaries, deterministic derivations, expiry and conformance.

It does not require a particular ledger.

## 3. Implementation

Realizes protocol predicates in a concrete execution environment. Data structures, serialization, cryptographic libraries and transaction formats are implementation concerns.

## 4. Adapter

Maps protocol concepts to a concrete environment. It may translate state, convert assets, transport evidence, construct transactions and provide environment-specific proofs. It does not silently add economic authority.

## 5. Application

Specializes generic primitives with application-specific assets, lifecycle, classes, payout rules, treasury flow or other policies.

An application is an instance of IMMORTAL, not its parent.

## 6. Liveness

Relayers, watchers, indexers, backends and schedulers facilitate execution. Their convenience role does not make them economic authority.

## 7. Evidence boundary

```text
observation → evidence → verification → canonical input/state → economic derivation
```

The evidence producer is not the verifier merely because it generated the evidence.

## 8. Portability

An adapter should map its environment to canonical state, verified evidence, obligations, executable liquidity, admissible transitions and atomic commitment without importing application semantics into the protocol core.
