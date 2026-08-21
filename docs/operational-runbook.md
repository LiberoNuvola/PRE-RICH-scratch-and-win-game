# Operational runbook

## Roles

### Developer
- writes smart contracts
- maintains frontend and relayer code
- validates build and review gate
- prepares deployment manifests

### Admin
- deploys scripts on-chain
- initializes pool and treasury UTxOs
- configures threshold / distribution params
- monitors relayer activity
- keeps sensitive keys offline

### Relayer
- polls treasury state
- triggers `distribute` tx when threshold is reached
- receives relayer reward
- performs swap or rebalance tasks as configured

## Responsibilities

### Wallet actions
User actions:
- connect wallet
- sign transaction
- approve ticket purchase / claim / mint

### Automated actions
- serial counter progression on-chain
- treasury accumulation
- distribution trigger via relayer
- reward payout to relayer

## Required checks before production
- verify no API key is embedded in browser bundle
- verify treasury distribution addresses are configured
- verify admin keys are not present in repo or frontend
- verify relayer reward is included in total distribution calculation
- verify threshold and percentage configuration in datum

## Failure handling
- if treasury threshold not reached: no distribution tx should be sent
- if relayer fails to submit: retry with backoff and audit logs
- if swap fails: keep native asset distribution or fallback to reserve path
- if governance params are wrong: stop relayer and require admin intervention

## Preprod gate
Before preprod launch, all review items must be complete and the code must pass the project review gate.

## Admin governance checklist
- validate treasury threshold and percentage split in the deployed datum
- set prize, stake, reserve, relayer, and admin addresses in the deployment config
- confirm the relayer wallet is separate from the admin wallet and has no extra privileges
- run `npm run admin:treasury` to print the canonical on-chain policy summary
- review the policy before any preprod submission
