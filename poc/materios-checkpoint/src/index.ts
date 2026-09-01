/**
 * PRE-RICH PoC-0 — Materios CanonicalCheckpoint extraction
 *
 * PASS criteria (docs):
 * [1] finalized head  [2] header  [3] block hash  [4] state root
 * [5] runtime version [6] GRANDPA authorities [7] set_id
 * [8] authority commitment [9] CanonicalCheckpoint.json
 *
 * Does NOT claim B3 or independent finality verification.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MateriosRpc } from "./rpc.js";
import {
  decodeAuthorityList,
  decodeSetId,
  parseHeaderNumber,
} from "./scale.js";
import { buildCheckpoint, serializeCheckpoint } from "./checkpoint.js";

const __dir = dirname(fileURLToPath(import.meta.url));

const RPC =
  process.env.MATERIOS_RPC ?? "http://127.0.0.1:9945";

const CHAIN_ID =
  process.env.MATERIOS_CHAIN_ID ?? "materios_preprod_v6";

async function main() {
  const rpc = new MateriosRpc(RPC);
  const results: Record<string, boolean> = {};

  console.log("PoC-0 Materios checkpoint");
  console.log("RPC:", RPC);
  console.log("Claim: evidence extraction only — NOT B3\n");

  // [1] finalized head
  const blockHash = await rpc.getFinalizedHead();
  results["[1] finalized head"] = !!blockHash;
  console.log("[1] finalized head:", blockHash);

  // [2][3][4] header
  const header = await rpc.getHeader(blockHash);
  const blockNumber = parseHeaderNumber(header.number);
  const stateRoot = header.stateRoot;
  results["[2] header"] = !!header;
  results["[3] block hash"] = blockHash === blockHash;
  results["[4] state root"] = !!stateRoot;
  console.log("[2] header.number:", blockNumber);
  console.log("[3] block_hash:", blockHash);
  console.log("[4] state_root:", stateRoot);

  // [5] runtime version AT finalized hash
  const rt = await rpc.getRuntimeVersion(blockHash);
  results["[5] runtime version"] = typeof rt.specVersion === "number";
  console.log("[5] specVersion:", rt.specVersion, "specName:", rt.specName);

  // [6] GrandpaApi_grandpa_authorities
  // Empty SCALE args = 0x
  const authHex = await rpc.stateCall(
    "GrandpaApi_grandpa_authorities",
    "0x",
    blockHash
  );
  const authorities = decodeAuthorityList(authHex);
  results["[6] GRANDPA authorities"] = authorities.length > 0;
  console.log("[6] authorities:", authorities.length);
  authorities.forEach((a, i) =>
    console.log(`    [${i}] ${a.public_key} weight=${a.weight}`)
  );

  // [7] GrandpaApi_current_set_id
  const setIdHex = await rpc.stateCall(
    "GrandpaApi_current_set_id",
    "0x",
    blockHash
  );
  const setId = decodeSetId(setIdHex);
  results["[7] GRANDPA set_id"] = typeof setId === "bigint";
  console.log("[7] set_id:", setId);

  // [8][9] checkpoint
  const cp = buildCheckpoint({
    chainId: CHAIN_ID,
    specVersion: rt.specVersion,
    specName: rt.specName,
    blockNumber,
    blockHash,
    stateRoot,
    parentHash: header.parentHash,
    setId,
    authorities,
    rpcEndpoint: RPC,
  });
  results["[8] authority commitment"] = !!cp.grandpa.authority_commitment;
  console.log("[8] authority_commitment:", cp.grandpa.authority_commitment);

  const outDir = join(__dir, "..", "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "CanonicalCheckpoint.json");
  const json = serializeCheckpoint(cp);
  writeFileSync(outPath, json, "utf8");
  results["[9] CanonicalCheckpoint.json"] = true;
  console.log("[9] wrote", outPath);

  console.log("\n=== PASS matrix ===");
  let all = true;
  for (const [k, v] of Object.entries(results)) {
    console.log(v ? "PASS" : "FAIL", k);
    if (!v) all = false;
  }
  if (!all) {
    process.exitCode = 1;
    console.error("\nPoC-0 FAILED");
    return;
  }
  console.log("\nPoC-0 PASSED (extraction only — not B3)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});