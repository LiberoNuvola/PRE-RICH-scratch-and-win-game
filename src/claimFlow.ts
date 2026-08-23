// Off-chain claim flow helpers using Lucid
// - Finds the prize UTxO at the script address that actually matches this ticket
// - Finds a ticket UTxO in the connected wallet
// - Builds a tx that consumes the prize UTxO, burns the ticket, and pays the
//   prize to the claimant -- attaching the real Plutus validators so the tx
//   passes phase-2 validation on a real Cardano node
// - Signs and submits the tx

import { prizeValidator, mintPolicyScript } from './loadValidator'

export async function findPrizeUtxo(lucid: any, scriptAddress: string, ticketPolicyId: string, ticketAssetName: string) {
  const utxos = await lucid.utxosAt(scriptAddress);
  if (!utxos || utxos.length === 0) return null;

  // Match the prize UTxO whose datum actually references this ticket's
  // policy/name, instead of blindly grabbing the first UTxO at the script
  // address (which was wrong as soon as more than one prize UTxO exists).
  // PrizeDatum field order (see plutus/PrizeValidator.hs):
  //   [ pdPrizeAmount, pdTicketPolicy, pdTicketName, pdPaymentPolicy, pdPaymentName, pdClaimantPkh ]
  for (const u of utxos) {
    try {
      const datumCbor = u.datum ?? (u.datumHash ? await lucid.datumOf(u) : null)
      if (!datumCbor) continue
      const parsed = lucid.Data.from(typeof datumCbor === 'string' ? datumCbor : lucid.Data.to(datumCbor))
      const fields = parsed?.fields
      if (!fields || fields.length < 3) continue
      const datumTicketPolicyHex = fields[1]
      const datumTicketNameHex = fields[2]
      if (datumTicketPolicyHex === ticketPolicyId && datumTicketNameHex === ticketAssetName) {
        return u
      }
    } catch (e) {
      // datum didn't parse as expected -- skip this UTxO rather than guessing
      continue
    }
  }

  return null;
}

export async function findTicketUtxoInWallet(lucid: any, ticketPolicyId: string, ticketAssetName: string) {
  const myUtxos = await lucid.wallet.getUtxos();
  const assetIdHex = ticketPolicyId + ticketAssetName;
  for (const u of myUtxos) {
    try {
      const value = u.assets || u.value || {};
      // value may be an object mapping assetId->amount or a Lucid Value
      if (typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.includes(assetIdHex)) return u;
      }
    } catch (e) {
      // ignore and continue
    }
  }
  return null;
}

export async function claimPrizeAuto(lucid: any, scriptAddress: string, ticketPolicyId: string, ticketAssetName: string) {
  const claimantAddr = await lucid.wallet.address();
  const prizeUtxo = await findPrizeUtxo(lucid, scriptAddress, ticketPolicyId, ticketAssetName);
  if (!prizeUtxo) throw new Error('No prize UTxO found matching this ticket');

  const ticketUtxo = await findTicketUtxoInWallet(lucid, ticketPolicyId, ticketAssetName);
  if (!ticketUtxo) throw new Error('No ticket UTxO found in connected wallet');

  // Derive a value object to pay back to claimant. Prefer tokens in prize UTxO if present, otherwise ADA.
  let payValue: any = {};
  if (prizeUtxo.assets && Object.keys(prizeUtxo.assets).length > 0) {
    payValue = prizeUtxo.assets;
  } else if (prizeUtxo.value && prizeUtxo.value.lovelace) {
    payValue = { lovelace: prizeUtxo.value.lovelace };
  } else if (prizeUtxo.value) {
    payValue = prizeUtxo.value;
  } else {
    payValue = { lovelace: 1000000 };
  }

  const burnAssetId = ticketPolicyId + ticketAssetName;

  // Build tx:
  //  - consume prize UTxO (script) -> requires PrizeValidator attached
  //  - burn the ticket token (mint amount -1) -> requires MintPolicy attached
  //    as a minting policy; PrizeValidator.hs checks this burn happened in
  //    the same tx (ticketBurned), and MintPolicy.hs's isPureBurn allows a
  //    burn-only mint without requiring the full serial-mint conditions.
  //  - consume the ticket UTxO from the wallet (plain pubkey UTxO, no script needed there)
  //  - pay prize to claimant
  const tx = await lucid.newTx()
    .collectFrom([prizeUtxo], lucid.Data.void())
    .attachSpendingValidator(prizeValidator)
    .collectFrom([ticketUtxo])
    .mintAssets({ [burnAssetId]: -1n }, lucid.Data.void())
    .attachMintingPolicy(mintPolicyScript)
    .payToAddress(claimantAddr, payValue)
    .addSigner(claimantAddr)
    .complete();

  const signed = await lucid.signTx(tx);
  const txHash = await lucid.submitTx(signed);
  return txHash;
}

export async function tryClaimAndNotify(lucid: any, scriptAddress: string, ticketPolicyId: string, ticketAssetName: string, onProgress?: (msg: string)=>void) {
  try {
    onProgress?.('Searching prize UTxO...');
    const prizeUtxo = await findPrizeUtxo(lucid, scriptAddress, ticketPolicyId, ticketAssetName);
    if (!prizeUtxo) throw new Error('No prize available for this ticket');
    onProgress?.('Found prize, locating ticket in wallet...');
    const ticketUtxo = await findTicketUtxoInWallet(lucid, ticketPolicyId, ticketAssetName);
    if (!ticketUtxo) throw new Error('Ticket not found in wallet');
    onProgress?.('Building transaction...');
    const txHash = await claimPrizeAuto(lucid, scriptAddress, ticketPolicyId, ticketAssetName);
    onProgress?.(`Submitted tx: ${txHash}`);
    return txHash;
  } catch (err: any) {
    onProgress?.(`Error: ${err.message || err}`);
    throw err;
  }
}
