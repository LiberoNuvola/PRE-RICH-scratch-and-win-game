/**
 * Minimal JSON-RPC client for Substrate / Materios.
 * Untrusted transport only — never a source of canonicality.
 */

export type JsonRpcId = number | string;

export class MateriosRpc {
  private id = 0;
  constructor(private readonly endpoint: string) {}

  async call<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    const id = ++this.id;
    const body = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    // HTTP endpoint preferred for PoC scripts.
    // If you only have WSS, use a local http proxy or @polkadot/api later.
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`RPC HTTP ${res.status} for ${method}`);
    }

    const json = (await res.json()) as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (json.error) {
      throw new Error(`RPC ${method}: ${json.error.code} ${json.error.message}`);
    }
    if (json.result === undefined) {
      throw new Error(`RPC ${method}: empty result`);
    }
    return json.result;
  }

  getFinalizedHead(): Promise<string> {
    return this.call<string>("chain_getFinalizedHead", []);
  }

  getHeader(hash: string): Promise<SubstrateHeader> {
    return this.call<SubstrateHeader>("chain_getHeader", [hash]);
  }

  getRuntimeVersion(hash?: string): Promise<RuntimeVersion> {
    return this.call<RuntimeVersion>(
      "state_getRuntimeVersion",
      hash ? [hash] : []
    );
  }

  /**
   * Runtime API via state_call at a specific block.
   * data: hex-encoded SCALE input (empty call => "0x")
   */
  stateCall(method: string, data: string, at: string): Promise<string> {
    return this.call<string>("state_call", [method, data, at]);
  }
}

export type SubstrateHeader = {
  parentHash: string;
  number: string; // hex compact in some nodes; often "0x..."
  stateRoot: string;
  extrinsicsRoot: string;
  digest: { logs: string[] };
};

export type RuntimeVersion = {
  specName: string;
  implName: string;
  authoringVersion: number;
  specVersion: number;
  implVersion: number;
  apis: [string, number][];
  transactionVersion?: number;
  stateVersion?: number;
};