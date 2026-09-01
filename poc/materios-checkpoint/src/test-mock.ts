/**
 * Mock RPC server for testing PoC-0 without a real Materios node.
 *
 * Simulates realistic GRANDPA authority and state responses.
 */

import { createServer } from "node:http";

// Mock finalized head
const FINALIZED_HASH =
  "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

// Mock header
const HEADER = {
  parentHash:
    "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  number: "0x123", // 291 in decimal
  stateRoot:
    "0xf5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4",
  extrinsicsRoot:
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  digest: {
    logs: [
      "0x06aec4070ce10c55dd87e3c25c91b69f66048f1bfc47d43a08959d9f1eacb4af3f",
      "0x04302814080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    ],
  },
};

// Mock runtime version
const RUNTIME_VERSION = {
  specName: "materios",
  implName: "materios",
  authoringVersion: 10,
  specVersion: 235,
  implVersion: 0,
  apis: [
    ["0xdf68eadb33fccc93e02ead7e", 2],
    ["0xbc9d89904f5b923f803c630", 3],
    ["0x37c8bb1350a9a2a8", 2],
    ["0xaf2c0297a23e6d3dc0302d0d", 3],
    ["0xd2bc9897eed08f15", 3],
    ["0xce2135c6", 3],
  ],
};

// Mock GRANDPA authorities (compact encoded + authority pairs)
// Vec<(AccountId32, u64)> = [
//   (0x1111...1111, weight=1),
//   (0x2222...2222, weight=1),
// ]
// Compact encoding: 0x08 = count(2 << 2), then 32 bytes for each authority, then 8 bytes weight

function createAuthorityListHex(): string {
  const buf = Buffer.alloc(1 + 32 + 8 + 32 + 8);
  let offset = 0;

  // Compact count = 2
  buf[offset++] = 0x08;

  // Authority 1: public key (32 bytes)
  for (let i = 0; i < 32; i++) {
    buf[offset++] = 0x11;
  }

  // Authority 1: weight (u64 LE = 1)
  buf.writeBigUInt64LE(BigInt(1), offset);
  offset += 8;

  // Authority 2: public key (32 bytes)
  for (let i = 0; i < 32; i++) {
    buf[offset++] = 0x22;
  }

  // Authority 2: weight (u64 LE = 1)
  buf.writeBigUInt64LE(BigInt(1), offset);
  offset += 8;

  return "0x" + buf.toString("hex");
}

// Mock set_id (u64 LE = 0)
function createSetIdHex(): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(0), 0);
  return "0x" + buf.toString("hex");
}

export function startMockRpc(port: number): Promise<() => void> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405, { "content-type": "text/plain" });
        res.end("Method Not Allowed");
        return;
      }

      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        let jsonRequest: Record<string, unknown>;

        try {
          jsonRequest = JSON.parse(body) as Record<string, unknown>;
        } catch {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32700, message: "Parse error" },
              id: null,
            })
          );
          return;
        }

        const { id, method, params } = jsonRequest;

        let result: unknown;

        switch (method) {
          case "chain_getFinalizedHead":
            result = FINALIZED_HASH;
            break;

          case "chain_getHeader": {
            const hash = Array.isArray(params)
              ? params[0]
              : "unknown";
            if (hash === FINALIZED_HASH) {
              result = HEADER;
            } else {
              res.writeHead(200, { "content-type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: { code: -32000, message: "No header for hash" },
                  id,
                })
              );
              return;
            }
            break;
          }

          case "state_getRuntimeVersion": {
            result = RUNTIME_VERSION;
            break;
          }

          case "state_call": {
            const [methodName, dataHex, blockHash] = Array.isArray(params)
              ? params
              : [null, null, null];

            if (blockHash !== FINALIZED_HASH) {
              res.writeHead(200, { "content-type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: { code: -32000, message: "Block not found" },
                  id,
                })
              );
              return;
            }

            if (methodName === "GrandpaApi_grandpa_authorities") {
              result = createAuthorityListHex();
            } else if (methodName === "GrandpaApi_current_set_id") {
              result = createSetIdHex();
            } else {
              res.writeHead(200, { "content-type": "application/json" });
              res.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: {
                    code: -32000,
                    message: `Unknown state_call method: ${methodName}`,
                  },
                  id,
                })
              );
              return;
            }
            break;
          }

          default:
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: {
                  code: -32601,
                  message: `Method not found: ${method}`,
                },
                id,
              })
            );
            return;
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            result,
            id,
          })
        );
      });
    });

    server.listen(port, () => {
      resolve(() => server.close());
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.MOCK_PORT || "9955", 10);
  startMockRpc(port).then((close) => {
    console.log(`Mock RPC server listening on http://localhost:${port}`);
    console.log('Press Ctrl+C to stop');

    process.on("SIGINT", () => {
      close();
      process.exit(0);
    });
  });
}
