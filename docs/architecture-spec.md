# PRE-RICH Architecture Specification

**Status:** Normative architecture specification
**Constitution:** `docs/CONSTITUTION.md`
**Primary trust model:** `docs/beacon-trust-model.md`
**B3 canonicality specification:** `docs/beacon-canonicality-spec.md`

---

# 1. Purpose

PRE-RICH is a Cardano-based scratch-and-win protocol designed to provide:

* deterministic on-chain game logic;
* cryptographically bound player commitments;
* unpredictable results before reveal;
* permissionless claims;
* deterministic prize calculation;
* automatic treasury operation;
* transferable ticket NFTs;
* public verifiability;
* progressive elimination of trusted intermediaries.

The architecture MUST preserve the four fundamental protocol properties:

```text
TRUSTLESS
+
ON-CHAIN
+
SECURE
+
AUTOMATIC
```

These properties are inseparable.

A component that is automatic but trusted is not fully trustless.

A component that is on-chain but permits an operator to choose the economic result is not secure.

A component that is cryptographically secure but requires an administrator to execute ordinary user rights is not fully automatic.

---

# 2. Architectural Authority

The architecture MUST distinguish between:

1. Cardano-enforced state;
2. external observations;
3. cryptographic evidence;
4. derived game values;
5. user interface data.

Only Cardano-enforced state and values deterministically derived from verified inputs may constitute trustless economic inputs.

The following hierarchy applies:

```text
External observation
        ↓
Evidence
        ↓
Cryptographic verification
        ↓
Canonical on-chain state
        ↓
Game input
        ↓
Deterministic derivation
        ↓
Economic settlement
```

An off-chain component MUST NOT bypass a verification layer merely because the required data is available.

---

# 3. Core Architectural Principle

The system MUST operate under the following principle:

> **The publisher may submit evidence. The publisher must not choose truth.**

For external adapters:

> **The adapter may observe and prove. The adapter must not decide.**

For relayers:

> **The relayer may facilitate execution. The relayer must not determine economic truth.**

For the frontend:

> **The frontend may display and reproduce calculations. The frontend must not determine authoritative results.**

---

# 4. System Model

The high-level system is:

```text
                         ┌─────────────────────┐
                         │       USER          │
                         │                     │
                         │ wallet + secret     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     FRONTEND        │
                         │                     │
                         │ UX / tx builder     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     CARDANO L1      │
                         │                     │
                         │ Mint / Prize /      │
                         │ Beacon / Treasury   │
                         └──────────┬──────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
                      ▼                           ▼
              ┌───────────────┐          ┌────────────────┐
              │  GAME LOGIC   │          │ CANONICAL      │
              │               │          │ BEACON PATH   │
              │ commit/reveal │          │                │
              │ symbols       │          │ Materios       │
              │ tier          │          │ ↓              │
              │ payout        │          │ evidence       │
              └───────────────┘          │ ↓              │
                                         │ proof          │
                                         │ ↓              │
                                         │ Cardano        │
                                         │ verifier      │
                                         └────────────────┘
```

Off-chain components may facilitate the system but MUST NOT become hidden authorities.

---

# 5. Trust Boundaries

Every component MUST have an explicit trust classification.

## 5.1 Cardano validators and policies

These are the primary economic enforcement mechanisms.

They determine:

* valid state transitions;
* ticket identity;
* commitment validity;
* reveal validity;
* Beacon validity according to the active trust model;
* deterministic game result;
* payout validity;
* claim validity;
* treasury transitions.

---

## 5.2 Frontend

The frontend is untrusted.

It may:

* connect wallets;
* generate player secrets;
* construct transactions;
* reproduce deterministic calculations;
* display ticket state;
* display estimated values;
* initiate reveal;
* initiate claim.

It MUST NOT be trusted for:

* winner;
* symbols;
* tier;
* payout;
* Beacon;
* canonical external state;
* claim validity.

The frontend may reproduce the protocol's calculations for display, but Cardano remains authoritative.

---

## 5.3 Backend / proxy

The backend is an untrusted read/convenience layer.

It may provide:

* Cardano queries;
* UTxO discovery;
* indexing;
* transaction discovery;
* rate limiting;
* API-key protection;
* caching;
* UX support.

It MUST NOT be required for:

* correctness of ticket commitments;
* Beacon authenticity;
* result derivation;
* prize calculation;
* claim authorization;
* treasury correctness.

A malicious backend MUST at most mislead or inconvenience the frontend.

It MUST NOT be able to make invalid economic state valid.

---

## 5.4 Relayer

The relayer is an untrusted automated facilitator.

It may:

* monitor Cardano;
* monitor Treasury state;
* submit transactions;
* publish external evidence;
* submit proofs;
* facilitate operational actions;
* receive a configured execution reward.

It MUST NOT:

* choose ticket results;
* choose symbols;
* choose prize tiers;
* choose payouts;
* modify commitments;
* bypass Beacon verification;
* select a canonical root merely by being first;
* override on-chain state transitions.

A malicious relayer MUST be unable to change economic truth.

---

## 5.5 External adapter

The PRE-RICH Materios adapter is untrusted.

Its purpose is to transform external protocol information into reproducible evidence and eventually proofs.

It may:

* query Materios RPC;
* retrieve headers;
* retrieve state roots;
* retrieve runtime information;
* retrieve GRANDPA authority information;
* retrieve finality evidence;
* decode SCALE data;
* retrieve state/storage evidence;
* construct proof artifacts.

It MUST NOT itself establish canonicality.

A compromised adapter must be able to produce invalid evidence, but Cardano MUST reject that evidence when it does not satisfy the required verification predicate.

---

# 6. On-Chain Components

## 6.1 Ticket Mint Policy / Counter

Responsible for:

* ticket serial generation;
* uniqueness;
* ticket NFT minting;
* controlled minting;
* controlled burning where permitted;
* exact token-name derivation.

Primary implementation:

```text
plutus/MintPolicy.hs
plutus/CounterValidator.hs
```

The counter UTxO and mint policy MUST preserve ticket identity and uniqueness.

---

# 7. Prize Validator

Primary implementation:

```text
plutus/PrizeValidator.hs
```

The PrizeValidator is responsible for the authoritative game state machine.

It MUST verify:

* ticket identity;
* current ticket state;
* player commitment;
* reveal;
* canonical Beacon according to the active trust model;
* deterministic ticket seed;
* deterministic symbol generation;
* tier calculation;
* payout calculation;
* current ticket ownership when required;
* payout validity;
* legal state transitions;
* claim state.

The PrizeValidator MUST NOT accept user-supplied symbols, tier or payout as authoritative values.

The result MUST be derivable from validated inputs.

---

# 8. Ticket State Machine

The canonical lifecycle is:

```text
                 ┌─────────────┐
                 │ UNREVEALED  │
                 └──────┬──────┘
                        │
                      reveal
                        │
                        ▼
                 ┌─────────────┐
                 │  REVEALED  │
                 └──────┬──────┘
                        │
                    claim
                        │
                        ▼
                 ┌─────────────┐
                 │   CLAIMED   │
                 └─────────────┘
```

A revealed ticket may represent:

```text
WIN
```

or:

```text
LOSS
```

A loss remains a valid historical ticket state.

A winning ticket's payout is frozen at reveal.

After claim, the ticket MAY remain on-chain as an NFT/collectible according to the protocol rules.

Claim and burn are therefore distinct operations.

---

# 9. Ticket Ownership

The current owner of the ticket is the relevant owner for permissionless operations where ownership is required.

The protocol MUST NOT assume that the original purchaser remains the owner.

A ticket may therefore follow:

```text
Alice
  ↓
Bob
  ↓
Charlie
  ↓
Reveal
  ↓
Claim
```

without changing the deterministic result.

Transfer MUST NOT modify:

* ticket identity;
* commitment;
* canonical Beacon;
* result;
* payout.

---

# 10. Commit-Reveal

The protocol uses a commit-reveal model.

The canonical sequence is:

```text
Player secret
      ↓
Commitment
      ↓
On-chain binding
      ↓
Reveal
      ↓
Verified secret
      ↓
Deterministic result
```

The commitment MUST bind the player secret to the appropriate game context.

At minimum the commitment must be bound to the relevant:

* game;
* round;
* ticket;
* protocol/game version;
* nonce or equivalent identity;
* secret.

The exact encoding is defined by the commit-reveal specification.

The backend MUST NOT be the authoritative storage location for the commitment.

The Cardano state is authoritative.

---

# 11. Domain Separation

Every cryptographic derivation MUST use explicit domain separation.

The domain must be:

* explicit;
* versioned;
* deterministic;
* documented;
* identical between on-chain and off-chain implementations.

Any change to a cryptographic domain is a protocol change and requires updated golden vectors.

---

# 12. Beacon Architecture

The Beacon is a critical game input.

It MUST NOT be treated merely as arbitrary metadata.

The architecture recognizes three trust levels.

---

# 13. B1 — Authorized Publisher

B1 is the current interim operational model.

Conceptually:

```text
Materios / external evidence
            ↓
RegistryPublish
            ↓
authorized publisher
            ↓
BeaconRegistry
            ↓
Beacon
            ↓
PrizeValidator
```

The current path uses an authorized publisher/relayer.

Therefore B1 contains a trust assumption:

> PRE-RICH trusts the configured publisher not to choose an incorrect external value.

B1 is operationally useful but is NOT fully trustless.

B1 MUST NOT be described as B3.

---

# 14. B2 — Committee Attestation

B2 replaces a single publisher with an attestation set.

Conceptually:

```text
external state
      ↓
N-of-M attestation
      ↓
Beacon anchor
      ↓
Cardano
```

The trust assumption becomes the committee threshold.

B2 reduces dependence on a single publisher.

However, B2 does not automatically prove that the attested value is objectively canonical in the underlying external protocol.

Therefore:

> **B2 remains an attestation-based trust model.**

---

# 15. B3 — Canonical-State Proof

B3 is the target trustless architecture.

B3 is a property, not a particular implementation.

The core predicate is:

```text
Canonical(ref, root)
```

where `root` is the objectively canonical value associated with checkpoint `ref`.

The verifier must establish:

```text
VerifyProof(ref, root, proof) = true
        ⇒
Canonical(ref, root)
```

Acceptance MUST NOT depend on:

* publisher identity;
* publisher signature;
* first submission;
* relayer identity;
* backend identity.

The same valid evidence and proof submitted by different parties must have the same validity.

---

# 16. B3 Implementation Classes

B3 may be implemented through different technical architectures.

Examples include:

### 16.1 Authenticated L1 anchor

```text
External protocol
      ↓
authenticated bridge/anchor
      ↓
Cardano L1 object
      ↓
Cardano validator/policy
      ↓
BeaconRegistry
```

The Cardano anchor is acceptable only when its own validator/policy enforces the relevant external relationship.

---

### 16.2 Cryptographic proof adapter

```text
External protocol
      ↓
untrusted adapter
      ↓
finality proof
      ↓
state/storage proof
      ↓
succinct proof
      ↓
Cardano verifier
      ↓
canonical anchor
      ↓
BeaconRegistry
```

The proof generator remains untrusted.

The Cardano verifier determines acceptance.

These implementations are equivalent at the architectural level only if they satisfy the B3 properties.

---

# 17. Canonical Checkpoint

The external state used by PRE-RICH MUST be bound to a deterministic checkpoint.

A checkpoint SHOULD include at minimum:

```text
chain identity
runtime version
block number
block hash
state root
GRANDPA set ID
authority commitment
```

The exact representation MUST be deterministic and versioned.

A checkpoint is evidence.

It is not automatically a proof of canonicality.

---

# 18. PoC-0

PoC-0 establishes that the required Materios information can be extracted from a real Materios node without modifying Materios.

The conceptual flow is:

```text
Materios node
      ↓
JSON-RPC
      ↓
finalized head
      ↓
header
      ↓
block hash / state root
      ↓
runtime information
      ↓
GRANDPA Runtime API
      ↓
authority list / set ID
      ↓
CanonicalCheckpoint
```

PoC-0 proves evidence extraction.

It does NOT prove:

* cryptographic finality;
* ancestry;
* storage inclusion;
* canonical external state;
* B3.

The adapter remains untrusted.

---

# 19. GRANDPA Verification Path

The B3 path requires independent verification of the external consensus evidence.

The Materios investigation establishes that the relevant runtime exposes:

```text
GrandpaApi::grandpa_authorities()
GrandpaApi::current_set_id()
```

The adapter SHOULD use the public Runtime API rather than infer authority information from arbitrary internal pallet storage.

The verification path must ultimately establish:

* correct chain;
* correct checkpoint;
* correct authority set;
* correct set ID;
* valid authority signatures;
* valid authority weights;
* sufficient quorum;
* correct target;
* required ancestry;
* authority-set transitions where applicable.

The exact proof stages are defined by the PoC specifications.

---

# 20. GRANDPA Cryptography

The cryptographic algorithm used by the verifier MUST correspond to the actual Materios runtime.

The current investigation identifies the relevant GRANDPA authority/signature path as Ed25519.

The implementation MUST NOT substitute another signature scheme based on assumption.

The relationship must remain consistent:

```text
Materios runtime
      ↕
RPC / SCALE representation
      ↕
PRE-RICH adapter
      ↕
independent verifier
      ↕
future Cardano verifier
```

---

# 21. Authority State

The architecture distinguishes:

```text
Observed authority state
```

from:

```text
Trusted authority state
```

and:

```text
Cryptographically proven authority state
```

A trusted authority set may be used during an intermediate PoC.

It MUST NOT be presented as B3.

The final B3 architecture must establish the authority state required for verification without relying on an arbitrary off-chain authority declaration.

---

# 22. Ancestry

A valid signature and sufficient quorum do not automatically prove all properties required for finality.

Where ancestry is necessary, the verifier MUST verify it.

If required ancestry evidence is missing:

```text
REJECT
```

The verifier MUST NOT silently assume ancestry to be correct.

---

# 23. State / Storage Proof

Finality alone does not prove that the required application state existed in the finalized state.

The complete B3 path therefore requires a binding between:

```text
checkpoint
+
state root
+
deterministic key
+
expected value
+
proof
```

The proof must establish inclusion of the expected value in the canonical state represented by the verified state root.

A storage proof MUST NOT be accepted merely because a publisher supplies the expected value.

---

# 24. Canonical Beacon Anchor

Once external canonicality has been proven, PRE-RICH needs a Cardano representation of that result.

Conceptually:

```text
CanonicalCheckpoint
        +
FinalityProof
        +
StateProof
        ↓
B3 verifier
        ↓
Canonical Beacon Anchor
        ↓
BeaconRegistry
        ↓
PrizeValidator
```

The anchor must bind:

* round;
* checkpoint reference;
* root;
* context;
* proof or proof commitment;
* canonicalization state.

---

# 25. Anchor Uniqueness

For a fixed round:

```text
| { x | ValidAnchor(x, roundId) } | <= 1
```

must hold.

However:

```text
one-shot anchor
≠
canonicality
```

A one-shot Registry prevents multiple finalized anchors.

It does not prove that the first submitted root was objectively correct.

B3 requires both:

```text
uniqueness
+
publisher-independent canonicality
```

---

# 26. Conflicting Roots

If:

```text
root_A != root_B
```

for the same canonical checkpoint, the system must not select one merely because:

* it arrived first;
* it was submitted by the configured relayer;
* it has a valid publisher signature;
* it was written to Cardano first.

The reason one root is accepted and another rejected must be an objective verification rule.

---

# 27. Beacon Derivation

Once the canonical external state is established, the Beacon MUST be derived deterministically.

Conceptually:

```text
canonical root
+
canonical context
+
target
+
protocol version
        ↓
Beacon
```

The Beacon must not be independently supplied by the frontend, backend or relayer.

The game must consume the Beacon associated with the canonical round.

---

# 28. Randomness Pipeline

The result pipeline is:

```text
Canonical Beacon
       +
Player secret
       +
Ticket identity / nonce
       +
Game version
       ↓
deriveTicketSeed
       ↓
deriveSymbolsSeed
       ↓
generateSymbols
       ↓
classifyTier
       ↓
prizeAmountForTier
```

Every step must be deterministic.

The player MUST NOT be able to supply:

* symbols;
* tier;
* payout;

as authoritative reveal data.

The frontend may reproduce the same computation for display.

---

# 29. Randomness Security

The randomness architecture MUST prevent:

* post-commit result selection;
* relayer-controlled results;
* backend-controlled results;
* frontend-controlled results;
* cross-ticket substitution;
* cross-round substitution;
* replay;
* modulo bias where applicable;
* ambiguous encoding;
* domain collision.

Where rejection sampling is required, it must be deterministic and consistently implemented on-chain and off-chain.

---

# 30. Symbol Generation

The symbol vector is a derived value.

The current game defines five ordinary symbols:

```text
1 2 3 4 5
```

The vector MUST be generated from the canonical randomness path.

A user-provided vector must never override the validator's derivation.

---

# 31. Tier Calculation

The prize tier is derived from the symbol vector.

The tier is not an independently supplied input.

The authoritative path is:

```text
verified inputs
      ↓
symbols
      ↓
tier
```

not:

```text
user input
      ↓
tier
```

---

# 32. Prize Calculation

The prize amount is derived from the authoritative tier and the economic state defined by the current game rules.

At reveal, the payout must become fixed.

Conceptually:

```text
Reveal
  ↓
Symbols
  ↓
Tier
  ↓
Payout
  ↓
Payout frozen
```

Future changes to the prize pool must not modify a payout already crystallized for a revealed ticket.

---

# 33. PrizePool

The PrizePool is an economic/funding mechanism.

It is NOT inherently a randomness source.

The architecture therefore distinguishes:

```text
Beacon
=
game randomness input
```

from:

```text
PrizePool
=
funding / prize liquidity
```

If a future game design uses the PrizePool as part of random prize allocation, that relationship must be explicitly specified and there must remain exactly one authoritative randomness path.

The legacy PrizePool implementation must not be interpreted as an independent randomness oracle.

---

# 34. Effective Pool

The future economic model must distinguish:

```text
total treasury assets
```

from:

```text
effective available liquidity
```

Pending liabilities and already crystallized winning payouts must not be counted as freely available liquidity.

The exact `effectivePool` implementation is a protocol requirement and must be verified on-chain before being treated as complete.

---

# 35. Jackpot

The jackpot is an economic protocol rule, not an administrator decision.

Its activation must eventually depend on verifiable on-chain conditions.

Conceptually:

```text
effectivePool
      ↓
jackpot threshold
      ↓
jackpot active
```

The jackpot winner must be selected from canonical randomness.

No backend, relayer or administrator may select the jackpot winner.

Until the complete mechanism is implemented and verified, jackpot behavior remains a target property rather than a completed implementation.

---

# 36. Treasury

The Treasury is responsible for:

* receiving protocol revenue;
* threshold logic;
* configured distribution;
* reserve management;
* prize funding;
* configured relayer reward.

The Treasury does not determine:

* ticket result;
* Beacon;
* symbols;
* tier.

Treasury logic must remain independent from game-result derivation.

---

# 37. Treasury Distribution

Distribution must be deterministic according to the configured protocol parameters.

The current operational model includes configurable categories such as:

```text
Prize
Stake
Reserve
Relayer reward
```

The exact percentages are configuration parameters.

They do not grant discretionary ownership to the relayer, team or administrator.

---

# 38. Claim

Claim must be permissionless within the protocol's rules.

A valid claim requires:

* valid ticket;
* valid ownership where required;
* revealed state;
* valid payout state;
* unclaimed state;
* valid transaction conditions.

The payout is the amount frozen during reveal.

The protocol must reject a second claim.

---

# 39. Claim and Burn Separation

Claim and burn are distinct operations.

The protocol MUST NOT require destruction of the ticket merely to prove that a claim occurred.

A winning ticket may remain on-chain after claim as a historical collectible.

If the owner voluntarily burns the ticket, that burn does not itself create a new economic right.

---

# 40. Expiry

The ticket lifecycle includes an expiry parameter.

The initial intended validity period is at least:

```text
365 days
```

The expiry should be determined from issuance:

```text
expiresAt =
issuedAt + minimum validity
```

It must not be silently extended by reveal timing.

The exact expiry implementation must be enforced by the validator.

---

# 41. Historical Reveal

Where permitted by the game rules, an expired ticket may still be revealed for historical purposes.

Conceptually:

```text
expired ticket
      ↓
historical reveal
      ↓
WIN / LOSS
```

A historical reveal after economic expiry must not automatically recreate an expired economic claim.

---

# 42. Orynq

Orynq is an evidence and audit layer.

It may provide:

* receipt information;
* transaction references;
* commitment/reveal hashes;
* Materios batch roots;
* proof digests;
* audit bundles;
* dispute-resolution evidence.

Orynq is NOT the final economic authority.

The economic decision remains subject to the Cardano protocol rules.

---

# 43. Receipt Verification

External receipts may be used as evidence.

They must be bound to the relevant ticket and context.

Relevant fields may include:

* ticket ID;
* purchase transaction;
* commitment;
* reveal;
* game version;
* result;
* external root;
* context;
* proof digest.

A receipt MUST NOT be accepted as an authority merely because it is signed or published.

Its relevant claims must be supported by the verification path required by the protocol.

---

# 44. Data Encoding

All cryptographically relevant data must have deterministic encoding.

The specification must define:

* field ordering;
* integer encoding;
* byte ordering;
* byte lengths;
* domain separation;
* versioning;
* empty-value representation.

TypeScript and Plutus implementations must agree.

Golden vectors are mandatory for critical cryptographic derivations.

---

# 45. TypeScript / Plutus Parity

The following implementations must remain semantically aligned:

```text
TypeScript
    ↕
Plutus
    ↕
Datum
    ↕
Redeemer
    ↕
Tests
```

A frontend calculation is useful only if it reproduces the canonical on-chain result.

A discrepancy must be treated as a protocol defect.

---

# 46. Fail-Closed Security

If a required verification condition cannot be established:

```text
REJECT
```

must be the default.

Examples:

```text
invalid proof
    → reject

missing finality evidence
    → reject

missing ancestry
    → reject

wrong checkpoint
    → reject

wrong round
    → reject

stale proof
    → reject

conflicting canonical root
    → reject

invalid Beacon
    → reject
```

The system MUST NOT fall back silently to a trusted value.

---

# 47. No Trusted Fallback

The following patterns are prohibited:

```text
proof verification failed
        ↓
use relayer value
```

```text
canonical anchor missing
        ↓
use backend Beacon
```

```text
storage proof missing
        ↓
trust supplied root
```

```text
oracle unavailable
        ↓
use browser calculation
```

A failed proof path must not silently become a trusted path.

---

# 48. Replay Protection

All protocol evidence and actions must be context-bound.

Protection must exist against:

* reveal replay;
* claim replay;
* proof replay;
* Beacon replay;
* cross-round substitution;
* cross-game substitution;
* stale checkpoints;
* duplicate canonicalization;
* duplicate payouts.

---

# 49. Reference Inputs

Reference inputs may be used to expose canonical Beacon state to the PrizeValidator.

The validator must verify that the reference input:

* corresponds to the correct round;
* contains the expected canonical state;
* satisfies the active Beacon trust model;
* has the correct identity;
* is not stale;
* cannot be substituted with an arbitrary datum.

A reference input is not automatically trustworthy merely because it is present in the transaction.

---

# 50. Registry

The BeaconRegistry is intentionally small.

Its role is to expose the canonical Beacon associated with a round.

It is not itself the external oracle.

The Registry MUST NOT silently substitute a backend-provided Beacon if the required canonical anchor is absent.

The Registry is therefore an adapter between:

```text
verified canonical state
```

and:

```text
game state
```

---

# 51. Registry State Machine

The intended Registry lifecycle is:

```text
Pending
   ↓
Ready / Canonical
```

The transition to canonical state must satisfy the active trust model.

Under B1:

```text
authorized publisher
```

is part of the trust boundary.

Under B3:

```text
proof / authenticated L1 mechanism
```

must determine acceptance independently of publisher identity.

---

# 52. B3 Canonicality Requirements

A B3 implementation MUST satisfy at least:

1. deterministic checkpoint;
2. fixed round/checkpoint binding;
3. verified finality;
4. correct authority state;
5. authority transition handling where required;
6. ancestry verification where required;
7. state/storage proof;
8. proof binding to state root;
9. proof binding to deterministic key;
10. on-chain verifiability;
11. publisher independence;
12. conflicting-root rejection;
13. stale-proof rejection;
14. replay protection;
15. one-shot canonicalization;
16. Beacon derivation exclusively from canonical state.

B3 MUST NOT be declared complete merely because an anchor UTxO exists.

---

# 53. B3 Proof Pipeline

The target external-proof architecture is:

```text
                   MATERIOS
                      │
                      ▼
             PRE-RICH ADAPTER
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
     checkpoint              external evidence
          │                       │
          └───────────┬───────────┘
                      ▼
              finality verifier
                      │
                      ▼
                state root
                      │
                      ▼
              storage verifier
                      │
                      ▼
              canonical proof
                      │
                      ▼
              Cardano verifier
                      │
                      ▼
             Canonical Anchor
                      │
                      ▼
                 Beacon
                      │
                      ▼
              PrizeValidator
```

The adapter/prover remains untrusted throughout the pipeline.

---

# 54. Proof System Selection

The exact proof system is an implementation decision.

The architecture MUST NOT make the Constitution dependent on a specific proving technology.

Possible implementations may include:

* direct cryptographic verification;
* specialized Cardano verifier;
* succinct proof;
* recursive proof;
* Halo2-based verifier;
* another formally suitable proof system.

The chosen system must satisfy the B3 predicate and Cardano execution constraints.

Technology choice must not weaken the trust model.

---

# 55. Security Model for External Proofs

A proof generator may be malicious.

The protocol must remain secure under:

```text
malicious adapter
malicious proof generator
malicious relayer
malicious backend
malicious frontend
```

provided the cryptographic assumptions of the verifier hold.

The expected failure mode is:

```text
invalid proof
     ↓
Cardano rejection
```

not:

```text
invalid proof
     ↓
trusted fallback
```

---

# 56. Deployment States

PRE-RICH must explicitly identify the trust state of each deployment.

## B1 operational deployment

```text
publisher-authorized Beacon
```

Trust assumption:

```text
configured publisher
```

## B2 deployment

```text
committee-attested Beacon
```

Trust assumption:

```text
committee threshold
```

## B3 deployment

```text
publisher-independent canonical state
```

Trust assumption:

```text
cryptographic / Cardano verification
```

A deployment must never be described as B3 while operating under B1 assumptions.

---

# 57. Development Roadmap

The architecture evolves through progressively stronger verification.

```text
PoC-0
Materios evidence extraction
        ↓
PoC-1A
GRANDPA cryptographic verification
        ↓
PoC-1B
ancestry / complete justification
        ↓
PoC-1C
authority-state transition verification
        ↓
PoC-2
state / storage proof
        ↓
PoC-3
complete canonicality proof
        ↓
PoC-4
Cardano-compatible succinct verification
        ↓
B3
canonical external state enforced by Cardano
```

A later stage must not be assumed merely because an earlier stage succeeds.

---

# 58. Preprod Gate

Before preprod, the following must be reviewed:

### Game

* ticket minting;
* ticket uniqueness;
* commitment;
* reveal;
* deterministic symbol generation;
* tier calculation;
* payout;
* claim;
* double-claim protection;
* ownership;
* transfer;
* expiry.

### Beacon

* active trust model;
* Registry identity;
* round binding;
* target binding;
* reference-input selection;
* stale rejection;
* conflicting-root rejection;
* adversarial Beacon tests.

### Materios

* runtime identity;
* GRANDPA algorithm;
* authority representation;
* set ID;
* finality evidence;
* ancestry requirements;
* authority transitions;
* storage-proof requirements.

### B3

* canonical checkpoint;
* proof statement;
* proof binding;
* publisher independence;
* Cardano verification;
* one-shot canonicalization;
* replay protection;
* stale-proof rejection.

### Treasury

* threshold;
* distribution percentages;
* reserve;
* prize funding;
* relayer reward;
* solvency.

### Implementation

* Plutus review;
* TypeScript review;
* golden vectors;
* datum/redeemer parity;
* frontend secret handling;
* backend non-authority;
* relayer non-authority.

---

# 59. Failure Philosophy

The protocol is designed around:

> **Security before convenience.**

When an input cannot be established as valid, the protocol must reject it.

The architecture therefore prefers:

```text
temporary unavailable
```

over:

```text
incorrectly accepted
```

and:

```text
claim delayed
```

over:

```text
invalid payout
```

and:

```text
proof rejected
```

over:

```text
unverified external state accepted
```

---

# 60. Architectural Invariants

The following invariants apply to the complete system.

## I1 — No trusted result authority

No off-chain component may choose the ticket result.

## I2 — On-chain economic enforcement

Economic validity must be enforceable by Cardano.

## I3 — Commitment before reveal

The player must commit before the result can become known.

## I4 — Deterministic result

The same canonical inputs produce the same result.

## I5 — Canonical Beacon

The Beacon must derive from the active Beacon trust model.

## I6 — Publisher independence at B3

Canonicality must not depend on publisher identity.

## I7 — Single canonical anchor

A round must not have multiple finalized canonical roots.

## I8 — No conflicting-root choice by operator

The first publisher cannot determine truth.

## I9 — Proof over authority

Where B3 is required, proof must replace trust.

## I10 — Fail closed

Missing or invalid proof results in rejection.

## I11 — Single claim

A payout can be claimed at most once.

## I12 — Frozen payout

Reveal determines the payout; later pool changes do not rewrite it.

## I13 — Ticket transferability

Transfer must not alter the ticket's cryptographic identity or result.

## I14 — Backend non-authority

Backend failure cannot create or invalidate economic truth.

## I15 — Relayer non-authority

Relayer failure cannot create or alter economic truth.

## I16 — Adapter non-authority

Adapter output is evidence until verified.

## I17 — Treasury separation

Treasury operations cannot determine game outcomes.

## I18 — Cryptographic parity

Off-chain reproductions must match the on-chain derivation.

---

# 61. Architecture Rule

When two implementation choices are available, the preferred choice is the one that:

1. reduces trust assumptions;
2. increases on-chain verifiability;
3. fails closed;
4. preserves determinism;
5. removes operator discretion;
6. remains permissionless;
7. preserves previously verified invariants.

Convenience alone is not a sufficient reason to introduce a trusted component.

---

# 62. Final Architecture

The intended final PRE-RICH architecture is:

```text
                         USER
                           │
                           ▼
                       WALLET
                           │
                           ▼
                     FRONTEND
                           │
                           │
                           ▼
                    ┌─────────────┐
                    │  CARDANO    │
                    │    L1       │
                    └──────┬──────┘
                           │
             ┌─────────────┼──────────────┐
             │             │              │
             ▼             ▼              ▼
          TICKET        BEACON         TREASURY
          STATE         ANCHOR          STATE
             │             │
             │             ▼
             │       CANONICAL B3
             │         VERIFIER
             │             ▲
             │             │
             │       PROOF ADAPTER
             │             ▲
             │             │
             │         MATERIOS
             │
             ▼
       COMMIT / REVEAL
             │
             ▼
       TICKET SEED
             │
             ▼
          SYMBOLS
             │
             ▼
           TIER
             │
             ▼
          PAYOUT
             │
             ▼
           CLAIM
```

The architectural authority flows toward Cardano.

External systems may provide evidence.

Off-chain services may facilitate execution.

But the final economic truth must be determined by verifiable protocol rules.

---

# 63. Final Principle

PRE-RICH is not designed around the assumption that its operators are honest.

It is designed so that operator honesty becomes progressively less relevant.

The final architecture therefore follows:

```text
Observe
   ↓
Prove
   ↓
Verify
   ↓
Anchor
   ↓
Derive
   ↓
Settle
```

and never:

```text
Observe
   ↓
Trust
   ↓
Settle
```

The long-term objective is:

> **People may operate the infrastructure, but people must not control the truth.**
