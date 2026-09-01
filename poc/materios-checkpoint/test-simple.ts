import { MateriosRpc } from "./src/rpc.js";

const rpc = new MateriosRpc("http://127.0.0.1:9955");

async function main() {
  console.log("Testing mock RPC...");
  
  const blockHash = await rpc.getFinalizedHead();
  console.log("Finalized head:", blockHash);
  console.log("Length:", blockHash.length);
  console.log("Matches regex:", /^0x[0-9a-fA-F]{64}$/.test(blockHash));
}

main().catch(console.error);
