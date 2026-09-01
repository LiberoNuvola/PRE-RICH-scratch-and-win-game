# Materios GRANDPA PoC-1A

Strict GRANDPA finality verifier for Materios.

## Scope

PoC-1A verifies a GRANDPA justification against an
already trusted GRANDPA authority set.

The relayer does NOT provide:

- authority set
- authority weights
- set_id

Those values come from `TrustedAuthorityState`.

## Trust model

```text
trusted genesis configuration
        |
        v
TrustedAuthorityState
        |
        +---- set_id
        +---- authorities
        +---- weights
        |
        v
GrandpaJustification
        |
        v
signature verification
        |
        v
quorum
        |
        v
checkpoint
