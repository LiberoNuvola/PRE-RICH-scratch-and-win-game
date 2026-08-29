Commit-reveal and result secrecy design
1. Core rule

No ticket result may be known or chosen by the player before the reveal step.

The system MUST use a commit-reveal pattern in which:

the player commits to a secret before reveal;
the Beacon used for the round is fixed according to the configured Beacon trust model;
the player later reveals the secret;
the validator deterministically derives the ticket seed;
the validator deterministically generates the symbols;
the validator derives the prize tier and payout.

The player does not submit the symbol vector as authoritative game input.

2. Security model

The result is a function of:

Beacon
+
playerSecret
+
ticket identity
+
ticket nonce
+
game version
+
other committed game parameters


Conceptually:

validated Beacon
       +
playerSecret
       +
ticket parameters
       ↓
ticketSeed
       ↓
symbolsSeed
       ↓
symbols
       ↓
tier
       ↓
payout


The frontend may reproduce this computation, but the validator is authoritative.

3. Required sequence
3.1 Ticket purchase

The player:

receives or purchases a unique ticket NFT;
generates a player secret;
computes the player commitment;
submits the commitment before revealing the secret.

The commitment binds the secret to the exact ticket and game parameters.

3.2 Commitment registration

The commitment is stored in the ticket state/datum.

The commitment MUST be sufficient for the validator to establish that the revealed player secret is the same secret committed before reveal.

The system MUST NOT rely on a backend database as the authoritative commitment store.

3.3 Beacon finalization

Before the ticket can be revealed, the applicable Beacon for the target round must be available.

The Beacon is validated according to one of:

B1: authorized publisher;
B2: proof-verified anchor;
B3: existing authenticated L1 anchor.

B3 is the preferred long-term architecture.

The important distinction is:

BeaconRegistry


does not automatically authenticate an external value.

It only provides a game-facing view of a Beacon whose provenance must already be defined by the selected trust model.

4. Reveal

The player reveals:

playerSecret


The validator then:

verifies the player commitment;
reads the correct Beacon reference input;
derives the ticket seed;
derives the symbols seed;
generates the symbol vector;
classifies the generated vector;
derives the payout amount;
stores the resulting state.

The player does NOT submit:

symbols
tier
payout


as authoritative values.

Those values are derived by the validator.

5. Deterministic result derivation

The result pipeline is:

Beacon
  │
  ├── round / target binding
  │
  ▼
deriveTicketSeed(...)
  │
  ▼
deriveSymbolsSeed(...)
  │
  ▼
generateSymbols(...)
  │
  ▼
classifyTier(...)
  │
  ▼
prizeAmountForTier(...)


The TypeScript frontend may reproduce this exact pipeline for UX and verification.

The Plutus implementation remains the security authority.

6. Why the player cannot choose the symbols

A reveal transaction contains the player secret, not the final symbol vector.

Therefore a player cannot submit:

[5,5,5,5,5,5]


or another preferred vector and ask the validator to accept it.

The validator independently calculates:

expectedSymbols = generateSymbols(symbolsSeed)


and derives the tier from expectedSymbols.

This property is mandatory for fairness.

7. Beacon timing and grinding

Beacon timing is part of the fairness model.

The system must ensure that the Beacon used for a ticket is associated with a deterministic target/round.

The Beacon source may still have its own trust or grinding assumptions.

In particular:

B1 does not eliminate publisher bias;
B2 does not eliminate bias unless the proof system constrains the source;
B3 does not eliminate bias merely because the value is stored on Cardano.

B3 is trustless only when the L1 anchor itself enforces the relevant external fact.

Block-production or source-selection grinding is a separate property and is not automatically eliminated by B1, B2 or B3.

8. Materios and Orynq

Materios and Orynq may provide:

receipts;
observations;
attestations;
process traces;
batch roots;
audit evidence.

They are not automatically payout authorities.

If an external observation is required for Beacon generation, the observation must be bound to Cardano through a verifiable L1 anchor before it is treated as a trustless game input.

The architecture therefore distinguishes:

External observation
        ≠
L1-authenticated fact

9. B3 L1-anchor model

The target B3 model is:

Materios / Partner Chain / external source
                 │
                 ▼
          authenticated fact
                 │
                 ▼
        Cardano L1 anchor UTxO
                 │
       validator / policy
       enforces its validity
                 │
                 ▼
          BeaconRegistry
                 │
                 ▼
          PrizeValidator


Examples of potentially valid anchors include:

a bridge/state UTxO whose datum contains the relevant reference and hash and whose validator enforces its update rules;
a Beacon NFT whose minting policy constrains the encoded round and value;
a proof-verified state anchor.

A normal metadata field saying:

mcHash = X


is not sufficient by itself.

10. Claim

The claim is accepted only after the on-chain ticket state has reached a valid revealed state.

The claim validator verifies:

the ticket is in the correct state;
the current ticket owner authorizes the claim;
the ticket NFT is burned;
the payout asset and amount satisfy the on-chain prize state;
the script state is closed correctly.

The claim does not trust a browser-provided prize value.

11. Receipt layer

A receipt may contain:

ticketId
commitmentHash
playerSecret / reveal reference
gameVersion
Beacon reference
Beacon value
derived symbols
derived tier
derived payout
revealHash
receiptId


However, the receipt is an audit artifact unless it is itself anchored by an L1 object whose validity rules are enforced on-chain.

The receipt must never be treated as authoritative merely because it was produced by a backend.

12. Acceptance criteria

The design is accepted when:

the player cannot choose the symbol vector;
the player cannot alter the committed secret;
the Beacon is fixed according to an explicit trust model;
the Beacon cannot be substituted by an arbitrary backend value;
symbols are deterministically derived on-chain;
tier is deterministically derived on-chain;
payout is deterministically derived on-chain;
claim depends on the validated on-chain revealed state;
frontend/backend infrastructure cannot authorize an invalid payout.

For B3 specifically, acceptance additionally requires:

a real L1 anchor has been identified;
the anchor's validator/policy has been reviewed;
the anchor proves the fact PRE-RICH actually needs;
the BeaconRegistry consumes the canonical anchor rather than arbitrary publisher input.
13. Trust-model status
B1

Status: immediate/shippable interim architecture.

Trust assumption:

authorized publisher

B2

Status: optional future architecture.

Trust assumption:

correct cryptographic proof verification

B3

Status: target architecture.

Trust assumption:

correct L1 anchor validator/policy


B3 does not remove the trust model. It moves the trust boundary into the L1 anchor.

That distinction must remain explicit in all PRE-RICH documentation.