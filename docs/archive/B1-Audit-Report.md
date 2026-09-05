PRE-RICH B1 Audit Report

Status

B1 PREDEPLOY STATUS: PASS

This report records the B1 hardening validation performed on branch b1-hardening before integration into the stable line.

Scope

The audited scope is the B1 architecture of PRE-RICH, with particular attention to:

atomic ticket sale and reservation (C-02);

B1PrizePool accounting and solvency;

deterministic reserve/release rules;

Genesis economic baseline;

jackpot accounting;

ticket lifecycle and expiry;

NFT retention after claim;

Oracle-backed multi-asset valuation and settlement (C-03);

BeaconRegistry / authorized relayer boundary;

TypeScript ↔ Plutus wiring;

generated script artifact synchronization.

B1 is not presented as B3. Pure trustless external-data verification is not enabled in this scope.

Validation Evidence

B1 invariant suite

Test file:

src/__tests__/b1-invariants.test.ts

Result:

151 tests

151 passed

0 failed

0 cancelled

0 skipped

35 suites

The suite covers Genesis pricing, payout tables, symbol generation, tier classification, EffectivePool, jackpot activation/accounting, suspended classes, TicketIssued/Revealed/Claimed/Expired transitions, solvency, deterministic reserves, expiry reserves, NFT retention, PrizeValidator/B1PrizePool cross-validation, C-02 atomic-sale invariants, and C-03 Oracle / multi-asset / settlement invariants.

C-02 Atomic Ticket Sale

The B1 implementation requires the ticket sale to bind the economic reservation to the ticket issuance path.

The validated architecture includes:

five MintPolicy configuration hashes:

CounterValidator;

PrizeValidator;

BeaconRegistry;

Treasury;

B1PrizePool;

atomic Treasury payment enforcement;

atomic B1PrizePool reservation enforcement;

exactly one ticket NFT mint;

PrizeDatum binding to the configured B1PrizePool;

B1PrizePool TicketIssued accounting;

unresolved ticket count increment;

unresolved reserve increment by the ticket economic price.

The test suite explicitly validates that an issued ticket must be economically reserved.

Genesis Economic Baseline

Canonical Genesis price:

1 USDM = 100 USDM sub-units

Current Preprod settlement baseline:

1 ADA = 1,000,000 lovelace

The tests explicitly reject the obsolete 2-USDM Genesis baseline.

B1PrizePool and Solvency

The B1PrizePool implementation includes:

singleton Pool authority-token validation;

unresolved-ticket reserve;

unresolved-ticket count;

pending liabilities;

locked jackpot liquidity;

EffectivePool calculation;

solvency enforcement;

deterministic reserve release;

ticket-mint binding for TicketIssued;

expiry handling.

The invariant suite verifies that crystallised payouts cannot exceed the EffectivePool available at reveal time.

Jackpot

Jackpot activation is based on EffectivePool and the on-chain jackpot threshold.

Locked jackpot liquidity is excluded from EffectivePool for solvency / threshold calculations.

Jackpot activation is therefore not an operator-side activation decision.

Ticket Lifecycle

Validated lifecycle:

UNREVEALED → REVEALED LOSS/WIN → CLAIMABLE → CLAIMED

Expiry is an explicit economic transition.

The tests verify that expiry releases the exact ticket reserve and does not modify pending liabilities.

The ticket NFT is retained after claim. B1 does not require automatic NFT burning.

Oracle / C-03

The C-03 mirror tests validate:

oracle precision;

minimum UTxO exclusion;

fresh-oracle requirements;

stale/future oracle rejection;

authorized publisher checks;

asset identity checks;

multi-asset Pool valuation;

USDM + ADA accounting;

settlement in ADA or USDM;

rounding that prevents underpayment;

physical-value support for declared accounting liquidity.

The tests explicitly reject missing, stale, unauthorized, or mismatched oracle data.

BeaconRegistry / B1 Trust Boundary

B1 uses the authorized relayer / BeaconRegistry publication path for external observation data.

The predeploy gate records this as a warning rather than an error.

The implementation is not claimed to provide B3-level pure trustless external-data verification.

TypeScript ↔ Plutus Compatibility

The predeploy gate verifies:

B1PrizePool factory loading;

B1PrizePool construction;

five-parameter MintPolicy wiring;

B1PrizePool hash binding;

atomic Treasury / Pool sale flow references;

player commitment and ticket commitment;

SyncBeacon / Reveal / Claim flow presence;

Genesis and Preprod settlement constants.

TypeScript typechecking passes.

Script Artifacts

The following B1 script artifacts are generated and synchronized:

plutus/out/b1PrizePoolFactory.plutus.json

src/plutusScripts/b1PrizePoolFactory.plutus.json

Their generated CBOR content is synchronized.

The other generated Plutus V2 artifacts are also synchronized with their frontend copies.

The obsolete plutus/out/prizePool.plutus.json artifact is removed in favor of the B1PrizePool factory artifact.

Final Predeploy Gate

The B1 predeploy gate result was:

WARNINGS: 2
ERRORS: 0

Final result:

B1 PREDEPLOY_CHECK: PASS

The two warnings are scope statements:

B1 external-data observation remains bounded by the authorized relayer / BeaconRegistry publication path.

B3 pure trustless external-data verification is not enabled and is not claimed.

These warnings do not represent deployment-blocking failures for B1.

Conclusion

The B1 hardening candidate has passed the defined invariant suite and deployment gate.

At this stage the repository has:

151/151 B1 invariant tests passing;

B1 PREDEPLOY_CHECK passing with 0 errors;

successful Plutus build;

successful script export;

successful TypeScript typecheck;

synchronized B1 script artifacts;

explicit separation between B1 and B3 scope.

This report records the state of the B1 hardening candidate at the time of validation.

Audit basis: repository source, generated Plutus artifacts, B1 invariant test output, and B1 predeploy gate output from the b1-hardening validation run.