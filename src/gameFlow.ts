/**
 * Ticket lifecycle off-chain aligned with PrizeValidator:
 *   SyncBeacon (ref registry) → Reveal(playerSecret) → Claim
 * Symbols are never sent: derived on-chain and mirrored here for UX only.
 */

import {
  playerCommitment,
  deriveTicketSeed,
  deriveSymbolsSeed,
  ticketCommitment,
  encodeBeaconTarget,
  randomPlayerSecret,
  toHex,
  type BeaconTarget,
  sha256,
  field,
} from './beacon'
import {
  generateSymbols,
  classifyTier,
  prizeAmountForTier,
  defaultPrizeTable,
  type PrizeTable,
} from './gameRules'
import { prizeValidator, mintPolicyScript } from './loadValidator'

export type TicketSecrets = {
  playerSecret: Uint8Array
  ticketNonce: number
  roundId: number
  gameVersion: Uint8Array
  priceUsdm: number
  target: BeaconTarget
}

export async function createPlayerTicketMaterial(t: TicketSecrets, ticketId: Uint8Array) {
  const pCommit = await playerCommitment(t.roundId, t.ticketNonce, t.playerSecret)
  const targetEnc = encodeBeaconTarget(t.target)
  const commit = await ticketCommitment(
    ticketId,
    pCommit,
    t.gameVersion,
    t.ticketNonce,
    t.priceUsdm,
    targetEnc
  )
  return {
    playerSecret: t.playerSecret,
    playerSecretHex: toHex(t.playerSecret),
    playerCommitment: pCommit,
    playerCommitmentHex: toHex(pCommit),
    ticketCommitment: commit,
    ticketCommitmentHex: toHex(commit),
  }
}

export function newWalletSecret(): Uint8Array {
  return randomPlayerSecret(32)
}

/** Preview outcome after beacon is known (UX only; chain re-derives). */
export async function previewOutcome(
  roundId: number,
  ticketNonce: number,
  playerSecret: Uint8Array,
  beacon: Uint8Array,
  gameVersion: Uint8Array,
  priceUsdm: number,
  table: PrizeTable = defaultPrizeTable
) {
  const finalSeed = await deriveTicketSeed(
    roundId,
    ticketNonce,
    playerSecret,
    beacon,
    gameVersion
  )
  const symbolsSeed = await deriveSymbolsSeed(finalSeed)
  const symbols = await generateSymbols(symbolsSeed)
  const tier = classifyTier(symbols)
  const amount = prizeAmountForTier(table, tier, priceUsdm)
  const digest = await sha256(symbolsSeed)
  const result = await sha256(
    // resultBinding on-chain: field(digest)||field(symbols)
    (() => {
      const a = field(digest)
      const b = field(symbols)
      const o = new Uint8Array(a.length + b.length)
      o.set(a, 0)
      o.set(b, a.length)
      return o
    })()
  )
  return { symbols, tier, amount, resultHex: toHex(result) }
}

export type SyncParams = {
  lucid: any
  prizeScriptAddress: string
  prizeUtxo: any
  registryUtxo: any // reference input
  /** Redeemer for SyncBeacon (e.g. Constr index) */
  syncRedeemer: any
  buildSyncedDatum: (prev: any, registry: any) => any
}

export async function syncTicketBeacon(p: SyncParams): Promise<string> {
  const tx = await p.lucid
    .newTx()
    .collectFrom([p.prizeUtxo], p.syncRedeemer)
    .attachSpendingValidator(prizeValidator)
    .readFrom([p.registryUtxo])
    .payToContract(
      p.prizeScriptAddress,
      { inline: p.buildSyncedDatum(p.prizeUtxo.datum, p.registryUtxo.datum) },
      p.prizeUtxo.assets
    )
    .complete()

  const signed = await p.lucid.signTx(tx)
  return p.lucid.submitTx(signed)
}

export type RevealParams = {
  lucid: any
  prizeScriptAddress: string
  prizeUtxo: any
  playerSecret: Uint8Array
  revealRedeemer: (secret: Uint8Array) => any
  buildRevealedDatum: (prev: any, outcome: { result: Uint8Array; tier: number; amount: number }) => any
  // for local preview / datum build
  roundId: number
  ticketNonce: number
  beacon: Uint8Array
  gameVersion: Uint8Array
  priceUsdm: number
  table?: PrizeTable
}

export async function revealTicket(p: RevealParams): Promise<string> {
  const table = p.table ?? defaultPrizeTable
  const preview = await previewOutcome(
    p.roundId,
    p.ticketNonce,
    p.playerSecret,
    p.beacon,
    p.gameVersion,
    p.priceUsdm,
    table
  )

  const tx = await p.lucid
    .newTx()
    .collectFrom([p.prizeUtxo], p.revealRedeemer(p.playerSecret))
    .attachSpendingValidator(prizeValidator)
    .payToContract(
      p.prizeScriptAddress,
      {
        inline: p.buildRevealedDatum(p.prizeUtxo.datum, {
          result: await (async () => {
            const finalSeed = await deriveTicketSeed(
              p.roundId,
              p.ticketNonce,
              p.playerSecret,
              p.beacon,
              p.gameVersion
            )
            const symbolsSeed = await deriveSymbolsSeed(finalSeed)
            const symbols = await generateSymbols(symbolsSeed)
            const digest = await sha256(symbolsSeed)
            const a = field(digest)
            const b = field(symbols)
            const o = new Uint8Array(a.length + b.length)
            o.set(a, 0)
            o.set(b, a.length)
            return sha256(o)
          })(),
          tier: preview.tier,
          amount: preview.amount,
        }),
      },
      p.prizeUtxo.assets
    )
    .complete()

  const signed = await p.lucid.signTx(tx)
  return p.lucid.submitTx(signed)
}

export type ClaimParams = {
  lucid: any
  prizeUtxo: any
  ticketPolicyId: string
  ticketAssetNameHex: string
  claimRedeemer: any
}

export async function claimPrize(p: ClaimParams): Promise<string> {
  const claimantAddr = await p.lucid.wallet.address()
  const assetId = p.ticketPolicyId + p.ticketAssetNameHex
  const myUtxos = await p.lucid.wallet.getUtxos()
  const ticketUtxo = myUtxos.find((u: any) => u.assets && u.assets[assetId])
  if (!ticketUtxo) throw new Error('Ticket not in wallet')

  const payValue =
    p.prizeUtxo.assets && Object.keys(p.prizeUtxo.assets).length > 0
      ? p.prizeUtxo.assets
      : { lovelace: p.prizeUtxo.assets?.lovelace ?? 1_000_000n }

  const tx = await p.lucid
    .newTx()
    .collectFrom([p.prizeUtxo], p.claimRedeemer)
    .attachSpendingValidator(prizeValidator)
    .collectFrom([ticketUtxo])
    .mintAssets({ [assetId]: -1n }, p.lucid.Data.void())
    .attachMintingPolicy(mintPolicyScript)
    .payToAddress(claimantAddr, payValue)
    .addSigner(claimantAddr)
    .complete()

  const signed = await p.lucid.signTx(tx)
  return p.lucid.submitTx(signed)
}