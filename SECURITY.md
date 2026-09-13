# Security Policy

## Current status

PRE-RICH is an active research and development project.

**The current repository is not mainnet-ready.** Publication of the repository does not constitute a security guarantee, production deployment approval, or independent audit certification.

The project distinguishes:

- documented protocol rules;
- implementation;
- computational/reference-model validation;
- validator/on-chain evidence;
- adversarial and integration evidence.

These categories must not be conflated.

## Reporting a vulnerability

Please do **not** report suspected vulnerabilities through a public GitHub issue, discussion, or pull request.

Use GitHub's private vulnerability reporting / Security Advisories facility when it is enabled for the repository.

If private reporting is not available, contact the repository maintainers privately through GitHub and provide enough information to reproduce the issue without publicly disclosing exploit details.

## What to include

Where possible, include:

- affected component or file;
- affected commit, branch, or release;
- concise description of the vulnerability;
- reproduction steps or proof of concept;
- expected versus observed behavior;
- potential impact;
- any proposed mitigation.

Avoid including private keys, seed phrases, credentials, personal data, or funds.

## Scope

Security reports may concern, among other things:

- Plutus validators and on-chain state transitions;
- authorization and trust boundaries;
- commit-reveal and randomness handling;
- economic invariants and solvency protection;
- claim, expiry, and double-claim behavior;
- multi-asset settlement and conversion;
- treasury and Jackpot accounting;
- minting policies;
- off-chain transaction construction;
- relayer and adapter trust assumptions;
- dependency or build/reproducibility issues.

## Disclosure

The maintainers will assess reports in good faith and may request additional information. Public disclosure should be coordinated after a fix or mitigation is available where practical.

Because the project is not mainnet-ready, researchers should clearly distinguish vulnerabilities in experimental code from vulnerabilities affecting a deployed production system.
