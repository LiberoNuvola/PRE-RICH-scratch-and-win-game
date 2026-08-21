export const PRE_RICH_TICKET_SCHEMA = {
  ticket: 'pre-rich-ticket-v1',
  reveal: 'pre-rich-reveal-v1',
  receipt: 'pre-rich-receipt-v1',
  claimWitness: 'pre-rich-claim-witness-v1',
} as const

export type TicketResult = {
  matchType: string
  prizeTier: number
  payoutMultiplier: number
  isWinner: boolean
}

export type TicketCommitment = {
  schemaVersion: typeof PRE_RICH_TICKET_SCHEMA.ticket
  ticketId: string
  purchaseTxHash: string
  walletAddress: string
  gameVersion: string
  salt: string
  seed: string
  commitmentHash: string
  createdAt: string
  status: 'committed'
}

export type TicketReveal = {
  schemaVersion: typeof PRE_RICH_TICKET_SCHEMA.reveal
  ticketId: string
  purchaseTxHash: string
  gameVersion: string
  seed: string
  salt: string
  symbolVector: string[]
  result: TicketResult
  commitmentHash: string
  revealHash: string
  revealedAt: string
}

export type TicketReceipt = {
  schemaVersion: typeof PRE_RICH_TICKET_SCHEMA.receipt
  receiptId: string
  ticketId: string
  purchaseTxHash: string
  commitmentHash: string
  revealHash: string
  symbolVector: string[]
  result: TicketResult
  gameVersion: string
  timestamp: string
  batchRoot: string
  proofDigest: string
}

export type TicketClaimWitness = {
  schemaVersion: typeof PRE_RICH_TICKET_SCHEMA.claimWitness
  ticketId: string
  receiptId: string
  purchaseTxHash: string
  commitmentHash: string
  revealHash: string
  symbolVector: string[]
  result: TicketResult
  gameVersion: string
  receiptProof: {
    batchRoot: string
    proofDigest: string
  }
  claimantAddress: string
  claimedAt: string
}

function normalizeInput(value: string) {
  return value.trim()
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeInput(input))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildCommitmentHash(
  ticketId: string,
  seed: string,
  salt: string,
  gameVersion: string,
): Promise<string> {
  return sha256Hex(`${ticketId}|${seed}|${salt}|${gameVersion}`)
}

export async function buildRevealHash(
  ticketId: string,
  seed: string,
  salt: string,
  gameVersion: string,
  symbolVector: string[],
  result: TicketResult,
): Promise<string> {
  const payload = JSON.stringify({
    ticketId,
    seed,
    salt,
    gameVersion,
    symbolVector,
    result,
  })
  return sha256Hex(payload)
}

export async function createTicketCommitment(input: {
  ticketId: string
  purchaseTxHash: string
  walletAddress: string
  gameVersion: string
  salt: string
  seed: string
  createdAt?: string
}): Promise<TicketCommitment> {
  const commitmentHash = await buildCommitmentHash(
    input.ticketId,
    input.seed,
    input.salt,
    input.gameVersion,
  )

  return {
    schemaVersion: PRE_RICH_TICKET_SCHEMA.ticket,
    ticketId: input.ticketId,
    purchaseTxHash: input.purchaseTxHash,
    walletAddress: input.walletAddress,
    gameVersion: input.gameVersion,
    salt: input.salt,
    seed: input.seed,
    commitmentHash,
    createdAt: input.createdAt ?? new Date().toISOString(),
    status: 'committed',
  }
}

export async function createRevealPayload(input: {
  ticketId: string
  purchaseTxHash: string
  gameVersion: string
  seed: string
  salt: string
  symbolVector: string[]
  result: TicketResult
  commitmentHash: string
  revealedAt?: string
}): Promise<TicketReveal> {
  const revealHash = await buildRevealHash(
    input.ticketId,
    input.seed,
    input.salt,
    input.gameVersion,
    input.symbolVector,
    input.result,
  )

  return {
    schemaVersion: PRE_RICH_TICKET_SCHEMA.reveal,
    ticketId: input.ticketId,
    purchaseTxHash: input.purchaseTxHash,
    gameVersion: input.gameVersion,
    seed: input.seed,
    salt: input.salt,
    symbolVector: input.symbolVector,
    result: input.result,
    commitmentHash: input.commitmentHash,
    revealHash,
    revealedAt: input.revealedAt ?? new Date().toISOString(),
  }
}

export async function createClaimWitness(input: {
  ticketId: string
  receiptId: string
  purchaseTxHash: string
  commitmentHash: string
  revealHash: string
  symbolVector: string[]
  result: TicketResult
  gameVersion: string
  receiptProof: {
    batchRoot: string
    proofDigest: string
  }
  claimantAddress: string
  claimedAt?: string
}): Promise<TicketClaimWitness> {
  return {
    schemaVersion: PRE_RICH_TICKET_SCHEMA.claimWitness,
    ticketId: input.ticketId,
    receiptId: input.receiptId,
    purchaseTxHash: input.purchaseTxHash,
    commitmentHash: input.commitmentHash,
    revealHash: input.revealHash,
    symbolVector: input.symbolVector,
    result: input.result,
    gameVersion: input.gameVersion,
    receiptProof: input.receiptProof,
    claimantAddress: input.claimantAddress,
    claimedAt: input.claimedAt ?? new Date().toISOString(),
  }
}

export async function validateRevealAgainstCommitment(
  reveal: TicketReveal,
  expectedCommitmentHash: string,
): Promise<boolean> {
  if (reveal.commitmentHash !== expectedCommitmentHash) return false

  const recomputedCommitmentHash = await buildCommitmentHash(
    reveal.ticketId,
    reveal.seed,
    reveal.salt,
    reveal.gameVersion,
  )

  if (recomputedCommitmentHash !== expectedCommitmentHash) return false

  const recomputedRevealHash = await buildRevealHash(
    reveal.ticketId,
    reveal.seed,
    reveal.salt,
    reveal.gameVersion,
    reveal.symbolVector,
    reveal.result,
  )

  return reveal.revealHash === recomputedRevealHash
}

export default {
  PRE_RICH_TICKET_SCHEMA,
  buildCommitmentHash,
  buildRevealHash,
  createTicketCommitment,
  createRevealPayload,
  createClaimWitness,
  validateRevealAgainstCommitment,
}
