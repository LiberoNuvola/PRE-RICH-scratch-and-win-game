# PRE-RICH Project Constitution

**Scope:** PRE-RICH open-source project and Scratch & Win application

## 1. Constitutional boundary

PRE-RICH is an application of IMMORTAL. This is the constitution of the project/application, not a competing economic constitution for IMMORTAL.

```text
IMMORTAL CONSTITUTION
        ↓
IMMORTAL SPECIFICATIONS
        ↓
PRE-RICH APPLICATION
```

PRE-RICH may implement and specialize IMMORTAL but cannot unilaterally redefine IMMORTAL semantics while claiming conformance.

## 2. Frozen application baseline

```text
KA = 8
KC = 4
KD = 4

1 / 2 / 3 / 5 / 10 / 25 / 50 / 100 USDM
Genesis = 1 USDM
verified PRE Treasury >= 4000 USDM
MaximumNormalPayout(P) = 500 × P
WorstCaseExposure(P,N) = 500 × P × N
RawSurplus = max(0, EEV − ProtectedCapital)
```

## 3. Class state

`CurrentActiveClass` may contract.

`HighestClassEverActivated` is monotonic.

Application contraction ladder:

```text
100 → 50 → 25 → 10 → 5 → 3 → 2 → 1 → HALT
```

## 4. Jackpot

```text
NewJackpot <= RawSurplus
JackpotPayout <= LockedJackpotLiquidity
```

The approved payout-mode policy remains open.

## 5. Expiry

Expiry is final: no claim, no new liability, no resurrection, late reveal cannot create claimability, and the expired payment commitment dissolves. Exact duration remains open.

## 6. Treasury

There is no automatic personal entitlement for founder, team, developer, administrator or operator.

The former `75 / 10 / 10 / 5` split is HISTORICAL / NON-CANONICAL.

## 7. Governance

Project governance controls project and application matters within its authority. It cannot override an IMMORTAL invariant unilaterally.
