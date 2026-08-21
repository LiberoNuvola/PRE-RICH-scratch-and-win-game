// Minimal off-chain claim flow helpers using Lucid
// - Finds prize UTxO at the script address
// - Finds a ticket UTxO in the connected wallet
// - Builds a tx that consumes the prize UTxO and the ticket UTxO and pays the prize to the claimant
// - Signs and submits the tx

export async function findPrizeUtxo(lucid: any, scriptAddress: string) {
  const utxos = await lucid.utxosAt(scriptAddress);
  if (!utxos || utxos.length === 0) return null;
  // Heuristic: pick the first UTxO — you can extend this to inspect datum or amount
  return utxos[0];
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
  const prizeUtxo = await findPrizeUtxo(lucid, scriptAddress);
  if (!prizeUtxo) throw new Error('No prize UTxO found at script address');

  const ticketUtxo = await findTicketUtxoInWallet(lucid, ticketPolicyId, ticketAssetName);
  if (!ticketUtxo) throw new Error('No ticket UTxO found in connected wallet');

  // Derive a value object to pay back to claimant. Prefer tokens in prize UTxO if present, otherwise ADA.
  let payValue: any = {};
  if (prizeUtxo.assets && Object.keys(prizeUtxo.assets).length > 0) {
    // Use the assets object directly when available
    payValue = prizeUtxo.assets;
  } else if (prizeUtxo.value && prizeUtxo.value.lovelace) {
    payValue = { lovelace: prizeUtxo.value.lovelace };
  } else if (prizeUtxo.value) {
    payValue = prizeUtxo.value;
  } else {
    // Fallback: minimal ADA
    payValue = { lovelace: 1000000 };
  }

  // Build tx: consume prize UTxO (script) and ticket UTxO (from wallet), pay prize to claimant
  const tx = await lucid.newTx()
    .collectFrom([prizeUtxo], lucid.Data.void())
    .collectFrom([ticketUtxo], lucid.Data.void())
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
    const prizeUtxo = await findPrizeUtxo(lucid, scriptAddress);
    if (!prizeUtxo) throw new Error('No prize available');
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
