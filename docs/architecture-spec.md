PreRich architecture specification
1. Goal

Build a Cardano app where:

users connect a wallet;
buy or mint a ticket serial NFT;
commit the player secret before reveal;
reveal the ticket outcome deterministically on-chain;
derive symbols and prize tier from cryptographically bound inputs;
claim prizes from on-chain validation;
fees accumulate in a treasury and are redistributed automatically;
external systems such as Materios/Orynq may provide audit data, but critical game logic does not depend on a backend database.

The architecture must keep secret material out of the browser and keep critical game and payout logic on-chain wherever possible.

The system must distinguish between:

L1-verifiable facts — facts represented by Cardano UTxOs, datums, native assets, policies or other objects whose validity is enforced by Cardano scripts;
external observations — information observed or produced by Materios, Orynq or another off-chain system;
derived game values — values deterministically computed by the on-chain validators from committed inputs.

Only category (1), together with deterministic derivation in category (3), may be treated as trustless game inputs.

2. Core components
2.1 Frontend

The frontend is responsible for:

wallet connection;
ticket selection and purchase UX;
generating and protecting player secret material;
building and signing user transactions;
synchronizing ticket state;
reproducing the on-chain symbol derivation for display;
claim flow UI;
balance display and notifications.

The frontend is not an authority for:

ticket result;
symbol vector;
prize tier;
prize amount;
Beacon value;
L1 anchor authenticity.

The frontend may reproduce deterministic computations for display, but the on-chain validator remains authoritative.

2.2 Proxy / backend read layer

The proxy is a read-only convenience layer.

It may provide:

Cardano chain queries;
transaction/UTxO discovery;
rate limiting;
API-key protection;
indexing assistance.

The proxy MUST NOT be required for the correctness or security of:

ticket commitments;
Beacon authenticity;
symbol generation;
prize calculation;
claim authorization.

A malicious or unavailable proxy must at most prevent the frontend from discovering data; it must not allow an invalid result to pass on-chain validation.

3. On-chain components
3.1 Mint policy / counter

Responsible for:

serial NFT generation;
uniqueness enforcement via the counter UTxO;
exact token-name derivation;
controlled ticket minting and burning.

Files:

plutus/MintPolicy.hs
plutus/CounterValidator.hs
3.2 Prize validator

Responsible for:

ticket state transitions;
player commitment verification;
Beacon reference validation;
deterministic ticket-seed derivation;
deterministic symbol generation;
prize-tier calculation;
prize-amount calculation;
ticket ownership verification;
ticket burn during claim;
payout validation.

File:

plutus/PrizeValidator.hs

The PrizeValidator MUST NOT accept user-supplied symbols or prize tiers as authoritative inputs.

The result MUST be derived from committed and validated inputs.

3.3 Beacon Registry

The BeaconRegistry is a deliberately small verification layer.

Its purpose is to expose the Beacon value associated with a game round through a Cardano UTxO that can be supplied as a reference input to the PrizeValidator.

The Registry MUST NOT be described as an independent oracle.

There are three possible trust models:

B1 — authorized publisher

A configured publisher or N-of-M authority is allowed to create/update the Beacon Registry.

Security depends on the configured authority.

B2 — proof-verified anchor

The Beacon anchor is accepted only when the Registry update contains a cryptographic proof that is verified by the on-chain script.

Security depends on the proof system and the correctness of the verification script.

B3 — L1 anchor

The preferred long-term architecture is for the BeaconRegistry to read an existing Cardano L1 object whose validity is already enforced by another Cardano script/policy.

Examples include:

a Partner Chain / bridge UTxO containing {ref, mcHash, ...};
a datum created by a known bridge or state-transition validator;
an NFT minted by a policy that cryptographically constrains the associated Beacon data;
an existing L1 anchor whose update rules are consensus-grade or proof-based.

In B3 the BeaconRegistry does not independently prove the external fact.

Instead:

External system / source
        ↓
L1 Anchor
        ↓
Cardano validator / policy proves anchor validity
        ↓
BeaconRegistry reads reference input
        ↓
PrizeValidator reads Beacon


The Registry therefore becomes a deterministic adapter between an already-authenticated L1 object and the game state.

4. Beacon trust model

The following distinction is mandatory.

A value such as:

mcHash
mainchainRef
materiosContext


being present in a Cardano datum does NOT by itself prove that the value is authentic.

Cardano validators can observe:

transaction inputs;
transaction outputs;
reference inputs;
datums;
minting/burning;
signatories;
validity interval.

They do not automatically observe arbitrary historical chain state or external protocol state.

Therefore:

"mcHash is present in a datum"


is not equivalent to:

"mcHash is proven to be the correct external value"


The second statement requires an on-chain rule that makes the first statement unavoidable.

5. B3 target architecture

The target architecture is:

             External / Partner Chain state
                         │
                         │
                 authenticated anchor
                         │
                         ▼
              ┌─────────────────────┐
              │     Cardano L1      │
              │     Anchor UTxO     │
              │                     │
              │ ref / mcHash / ...  │
              └──────────┬──────────┘
                         │
                  reference input
                         │
                         ▼
              ┌─────────────────────┐
              │   BeaconRegistry    │
              │                     │
              │ read + validate     │
              │ required fields     │
              └──────────┬──────────┘
                         │
                    beaconValue
                         │
                         ▼
              ┌─────────────────────┐
              │   PrizeValidator    │
              │                     │
              │ ticket seed         │
              │ symbols             │
              │ tier                │
              │ payout              │
              └─────────────────────┘


The BeaconRegistry MUST NOT silently substitute a backend-provided value when the L1 anchor is absent.

6. Anchor requirements

A future B3 anchor SHOULD have:

deterministic identity;
deterministic round/reference;
explicit Beacon or source fields;
a unique NFT or equivalent identity where practical;
an on-chain update rule;
a validator or minting policy that constrains the relationship between the external reference and the stored value;
replay protection;
stale-round protection;
a clearly defined authority or proof mechanism.

The anchor MUST make clear:

what fact it represents
who/what is authorized to create it
how updates are authorized
how the round is identified
how the Beacon is derived

7. Materios / Orynq integration

Materios and Orynq are not automatically trust anchors.

They may provide:

observations;
receipts;
attestations;
process traces;
audit records;
batch roots;
external metadata.

Such information becomes trustless for PRE-RICH only when a Cardano L1 object binds the relevant fact under an enforceable on-chain rule.

An ordinary metadata entry such as:

mcHash = X


is therefore treated as an observation, not as a cryptographic proof of X.

Likewise, an L1 bridge anchor is not automatically trustless merely because it exists on Cardano. Its own validator/policy must enforce the relevant fact.

8. Randomness and fairness

The game result is derived from:

Beacon
+
playerSecret
+
ticket identity / nonce
+
game version


The result pipeline is:

validated Beacon
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


The player MUST NOT be able to provide the symbol vector, tier or payout as authoritative reveal data.

The frontend may reproduce the derivation for display only.

9. Prize pool

The legacy PrizePool component MUST NOT be treated as an independent source of ticket randomness unless explicitly required by the current game design.

The preferred v1.01+ model is:

Beacon = game randomness input
PrizePool = funding / prize liquidity mechanism


If PrizePool remains responsible for random prize allocation in a future version, its relationship with the Beacon must be specified explicitly and there must be one authoritative randomness path.

10. Treasury

The Treasury is responsible for:

collecting ticket fees;
enforcing configured threshold logic;
distributing funds;
preserving configured allocation percentages;
rewarding the distribution relayer where applicable.

The Treasury does not determine ticket outcomes.

11. Relayer

The relayer is an automated facilitator.

It may:

discover eligible transactions;
construct transactions;
submit transactions;
monitor treasury state;
publish operationally required data.

It MUST NOT have authority to:

choose ticket symbols;
choose prize tiers;
modify player commitments;
override Beacon validation;
modify payout amounts;
bypass the on-chain state machine.
12. Security principles

The system MUST enforce:

no secret material in server-side admin infrastructure unless operationally required;
no admin keys in browser code;
no backend authority over game results;
player commitment before reveal;
deterministic on-chain symbol generation;
deterministic on-chain prize calculation;
current NFT owner verification at claim;
ticket burn on successful claim;
exact continuing-state transitions;
Beacon validation through an explicit trust model;
no assumption that arbitrary metadata constitutes cryptographic proof.
13. Deployment roadmap
v1.01

Current implementation:

player commitment;
deterministic Beacon-derived game seed;
deterministic symbol generation;
deterministic prize calculation;
Beacon Registry;
reference-input based Beacon consumption.
v1.02 — immediate hardening

Implement/define:

B1 authorized Registry publishing;
canonical Registry identity;
exact round/target matching;
exact reference-input selection;
stale Beacon rejection.

B1 is an interim operational solution, not the final trustless architecture.

B3 — target architecture

In parallel:

identify the real L1 object currently produced by Materios / Orynq / Flux;
determine exactly what fact it proves;
verify the validator/policy that makes that fact enforceable;
define the canonical anchor UTxO;
modify BeaconRegistry to consume only that anchor.

B3 MUST NOT be claimed as trustless until the anchor's own validation rules have been independently verified.

14. Preprod gate

Before preprod:

 ticket minting reviewed;
 PrizeValidator reviewed;
 deterministic symbol generation tested;
 payout derivation tested;
 B1 Registry authorization defined;
 canonical Registry identity defined;
 L1 anchor discovery completed;
 B3 trust assumptions documented;
 Materios/Orynq role documented;
 TS ↔ Plutus golden vectors implemented;
 treasury reviewed;
 relayer reviewed;
 operational runbook updated;
 adversarial Beacon tests completed.

B3 MUST NOT be marked complete merely because an anchor UTxO exists. The anchor's creation/update rules must also be verified.