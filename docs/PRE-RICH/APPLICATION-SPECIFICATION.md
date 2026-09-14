# PRE-RICH Application Specification

## 1. Scope

Defines the concrete PRE-RICH Scratch & Win specialization of IMMORTAL.

## 2. Application semantics

PRE-RICH defines the application denomination, ticket lifecycle, class ladder, result model, Treasury, PrizePool, Jackpot and application settlement policy.

## 3. Ticket classes

```text
1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
```

Genesis is `1 USDM`; Genesis bootstrap requires verified PRE Treasury value `>= 4000 USDM`.

## 4. Result authority

The player must not supply authoritative:

- symbols;
- tier;
- payout;
- winner status.

These are derived from validated ticket context, commitment/secret and the active result/evidence mechanism.

In serialized lifecycle payloads, `symbolVector`, `prizeTier`, payout and winner status are **DERIVED RESULT** data. Their presence in a payload does not make them an authority-bearing input.

## 5. Lifecycle and expiry

```text
purchase/commit
→ reveal
→ deterministic result
→ crystallization where winning
→ claim
```

Claim is a single-use settlement of an already established right.

```text
CLAIM ≠ BURN
```

Expiry is final. After expiry there is no claim, no new liability and no resurrection; a late reveal cannot create claimability and the expired payment commitment dissolves. The exact ticket duration is OPEN-02.

## 6. Ticket identity and transfer

Tickets are transferable. Transfer preserves ticket identity, commitment, round, game configuration and future result. The economic right follows the ticket and cannot be duplicated by transfer.

A claimed ticket may remain as a historical collectible. Voluntary burn provides no refund, bonus or additional economic right.

## 7. Economic transitions

A sale couples:

```text
ticket mint + Treasury payment + unresolved-ticket reservation
```

The transition must be economically atomic or equivalent.

Reveal derives the result and, if winning, crystallizes an immutable payout. Claim settles the crystallized amount once.

## 8. Settlement

PRE-RICH denominates prizes in USDM. Supported alternative settlement assets require validated conversion preserving the frozen USDM economic value. Asset support is application policy; Cardano-specific mechanics belong to the Cardano Adapter.

## 9. Jackpot

The Jackpot is separate, protected and locked.

```text
NewJackpot <= RawSurplus
JackpotPayout <= LockedJackpotLiquidity
```

Jackpot selection is cryptographically verifiable and non-discretionary. Payout mode is OPEN-01. Future allocation policy is OPEN-03 only if actually required.

## 10. Beacon trust model

B1 is the current authorized-publisher application trust model. B3 is a stronger publisher-independent canonicality target. B3 must not be claimed as implemented without its required verification evidence.

## 11. Governance boundary

PRE-RICH governance cannot override IMMORTAL invariants, assign individual economic outcomes, alter crystallized payouts or create privileged personal economic entitlement.
