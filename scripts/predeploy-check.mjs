import assert from 'node:assert/strict'
import {
  createTicketCommitment,
  createRevealPayload,
  validateRevealAgainstCommitment,
} from '../src/ticketSchema.ts'

const commitment = await createTicketCommitment({
  ticketId: 'ticket-42',
  purchaseTxHash: 'tx-hash-01',
  walletAddress: 'addr_test1qqq',
  gameVersion: 'v1',
  salt: 'salt-250',
  seed: 'seed-128',
})

const reveal = await createRevealPayload({
  ticketId: 'ticket-42',
  purchaseTxHash: 'tx-hash-01',
  gameVersion: 'v1',
  seed: 'seed-128',
  salt: 'salt-250',
  symbolVector: ['A', 'B', 'C', 'D', 'E'],
  result: {
    matchType: 'exact',
    prizeTier: 3,
    payoutMultiplier: 2,
    isWinner: true,
  },
  commitmentHash: commitment.commitmentHash,
})

assert.equal(
  await validateRevealAgainstCommitment(reveal, commitment.commitmentHash),
  true,
  'valid reveal should pass',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, revealHash: 'deadbeef' }, commitment.commitmentHash),
  false,
  'tampered revealHash should fail',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, seed: 'seed-999' }, commitment.commitmentHash),
  false,
  'seed mismatch should fail',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, salt: 'salt-999' }, commitment.commitmentHash),
  false,
  'salt mismatch should fail',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, symbolVector: ['A', 'B', 'X', 'D', 'E'] }, commitment.commitmentHash),
  false,
  'symbol vector tamper should fail',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, result: { ...reveal.result, prizeTier: 99 } }, commitment.commitmentHash),
  false,
  'result tamper should fail',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, commitmentHash: 'wrong-hash' }, commitment.commitmentHash),
  false,
  'wrong commitment hash should fail',
)

assert.equal(
  await validateRevealAgainstCommitment({ ...reveal, ticketId: 'ticket-99' }, commitment.commitmentHash),
  false,
  'ticketId mismatch should fail',
)

console.log('PREDEPLOY_CRITICAL_CHECKS: PASS')
