# Cardano Adapter Specification

## 1. Boundary

Cardano is an adapter/implementation environment for IMMORTAL, not a dependency of IMMORTAL's abstract protocol semantics.

```text
IMMORTAL
    ↓
Cardano Adapter
    ↓
Cardano execution environment
```

## 2. Responsibilities

The adapter maps generic concepts to Cardano mechanisms, including where applicable:

- UTxO state;
- transaction inputs/outputs;
- datum/redeemer representation;
- validators and minting policies;
- Cardano-native assets;
- validity intervals;
- reference inputs;
- transaction construction/submission;
- Cardano-specific evidence transport.

## 3. Authority boundary

The adapter may observe, convert, construct, transport, submit and produce evidence. It must not decide an economic result that the IMMORTAL predicate requires to be verified.

## 4. External evidence

Cardano cannot be assumed to know arbitrary external state. An adapter may transport evidence; the Cardano verification path determines whether that evidence satisfies the active application trust model.

## 5. PRE-RICH integration

For the current PRE-RICH integration, B1 is an authorized-publisher trust model and B3 is a stronger publisher-independent canonicality target. Neither is an IMMORTAL constitutional dependency.

## 6. Conformance

Cardano adapter conformance requires preservation of IMMORTAL predicates plus the requirements of the relevant application profile. This document does not declare the current implementation conforming.
