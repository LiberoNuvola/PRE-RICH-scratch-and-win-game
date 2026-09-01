/**

Minimal JSON-RPC client for Substrate / Materios.
The RPC endpoint is explicitly untrusted.
RPC responses are evidence supplied by a node; they are not themselves
a source of canonicality or independently verified finality.
*/

export type JsonRpcId = number | string;

type JsonRpcError = {
code: number;
message: string;
data?: unknown;
};

type JsonRpcResponse<T> = {
jsonrpc?: unknown;
id?: unknown;
result?: T;
error?: JsonRpcError;
};

export class MateriosRpc {
private id = 0;

constructor(private readonly endpoint: string) {
if (!endpoint) {
throw new Error("RPC endpoint is empty");
}
}

async call<T = unknown>(
method: string,
params: unknown[] = []
): Promise<T> {
if (!method) {
throw new Error("RPC method is empty");
}

const id = ++this.id;

const body = {
  jsonrpc: "2.0",
  id,
  method,
  params,
};

let res: Response;

try {
  res = await fetch(this.endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  throw new Error(
    `RPC transport failure for ${method}: ${message}`
  );
}

if (!res.ok) {
  throw new Error(
    `RPC HTTP ${res.status} ${res.statusText} for ${method}`
  );
}

let json: JsonRpcResponse<T>;

try {
  json = (await res.json()) as JsonRpcResponse<T>;
} catch (error) {
  const message =
    error instanceof Error ? error.message : String(error);

  throw new Error(
    `RPC ${method}: invalid JSON response: ${message}`
  );
}

if (json.jsonrpc !== undefined && json.jsonrpc !== "2.0") {
  throw new Error(
    `RPC ${method}: unexpected jsonrpc version ${String(
      json.jsonrpc
    )}`
  );
}

if (json.error !== undefined) {
  throw new Error(
    `RPC ${method}: ${json.error.code} ${json.error.message}`
  );
}

if (!Object.prototype.hasOwnProperty.call(json, "result")) {
  throw new Error(`RPC ${method}: missing result`);
}

if (json.result === undefined) {
  throw new Error(`RPC ${method}: result is undefined`);
}

return json.result;


}

async getFinalizedHead(): Promise<string> {
const value = await this.call<unknown>(
"chain_getFinalizedHead",
[]
);

return requireHash(value, "chain_getFinalizedHead");


}

async getHeader(hash: string): Promise<SubstrateHeader> {
const value = await this.call<unknown>(
"chain_getHeader",
[hash]
);

if (value === null) {
  throw new Error(`chain_getHeader: no header for ${hash}`);
}

return validateHeader(value);


}

async getRuntimeVersion(
hash?: string
): Promise<RuntimeVersion> {
const value = await this.call<unknown>(
"state_getRuntimeVersion",
hash ? [hash] : []
);

return validateRuntimeVersion(value);


}

/**

Runtime API via state_call at a specific block.
data is SCALE input encoded as hex.
*/
async stateCall(
method: string,
data: string,
at: string
): Promise<string> {
if (!method) {
throw new Error("state_call: empty method");
}
if (!/^0x[0-9a-fA-F]*$/.test(data)) {
  throw new Error(`state_call: invalid data hex ${data}`);
}

const hash = requireHash(at, "state_call block hash");

const value = await this.call<unknown>(
  "state_call",
  [method, data, hash]
);

return requireHex(value, `state_call(${method})`);


}
}

export type SubstrateHeader = {
parentHash: string;
number: string;
stateRoot: string;
extrinsicsRoot: string;
digest: {
logs: string[];
};
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

function requireHex(
value: unknown,
field: string
): string {
if (
typeof value !== "string" ||
!/^0x[0-9a-fA-F]*$/.test(value)
) {
throw new Error(`${field}: expected hex string`);
}

return value;
}

function requireHash(
value: unknown,
field: string
): string {
if (typeof value !== "string") {
throw new Error(`${field}: expected string, got ${typeof value}`);
}

if (!/^0x[0-9a-fA-F]{64}$/.test(value)) {
throw new Error(
  `${field}: expected 32-byte hash (0x + 64 hex), got "${value}" (length ${value.length})`
);
}

return value;
}

function validateHeader(
value: unknown
): SubstrateHeader {
if (
typeof value !== "object" ||
value === null
) {
throw new Error("chain_getHeader: invalid header object");
}

const header = value as Record<string, unknown>;

const parentHash = requireHash(
header.parentHash,
"header.parentHash"
);

const stateRoot = requireHash(
header.stateRoot,
"header.stateRoot"
);

const extrinsicsRoot = requireHash(
header.extrinsicsRoot,
"header.extrinsicsRoot"
);

if (
typeof header.number !== "string" ||
!/^0x[0-9a-fA-F]+$/.test(header.number)
) {
throw new Error("header.number: invalid hex string");
}

if (
typeof header.digest !== "object" ||
header.digest === null
) {
throw new Error("header.digest: invalid object");
}

const digest = header.digest as Record<string, unknown>;

if (
!Array.isArray(digest.logs) ||
!digest.logs.every(
(x) =>
typeof x === "string" &&
/^0x[0-9a-fA-F]*$/.test(x)
)
) {
throw new Error("header.digest.logs: invalid value");
}

return {
parentHash,
number: header.number,
stateRoot,
extrinsicsRoot,
digest: {
logs: digest.logs,
},
};
}

function validateRuntimeVersion(
value: unknown
): RuntimeVersion {
if (
typeof value !== "object" ||
value === null
) {
throw new Error(
"state_getRuntimeVersion: invalid object"
);
}

const v = value as Record<string, unknown>;

if (typeof v.specName !== "string") {
throw new Error(
"state_getRuntimeVersion: invalid specName"
);
}

if (typeof v.implName !== "string") {
throw new Error(
"state_getRuntimeVersion: invalid implName"
);
}

requireSafeInteger(
v.authoringVersion,
"authoringVersion"
);

requireSafeInteger(
v.specVersion,
"specVersion"
);

requireSafeInteger(
v.implVersion,
"implVersion"
);

if (!Array.isArray(v.apis)) {
throw new Error(
"state_getRuntimeVersion: invalid apis"
);
}

const apis: [string, number][] = [];

for (const api of v.apis) {
if (
!Array.isArray(api) ||
api.length !== 2 ||
typeof api[0] !== "string"
) {
throw new Error(
"state_getRuntimeVersion: invalid API entry"
);
}

requireSafeInteger(
  api[1],
  `runtime API version for ${api[0]}`
);

apis.push([api[0], api[1] as number]);


}

const result: RuntimeVersion = {
specName: v.specName,
implName: v.implName,
authoringVersion: v.authoringVersion as number,
specVersion: v.specVersion as number,
implVersion: v.implVersion as number,
apis,
};

if (v.transactionVersion !== undefined) {
requireSafeInteger(
v.transactionVersion,
"transactionVersion"
);

result.transactionVersion =
  v.transactionVersion as number;


}

if (v.stateVersion !== undefined) {
requireSafeInteger(
v.stateVersion,
"stateVersion"
);

result.stateVersion =
  v.stateVersion as number;


}

return result;
}

function requireSafeInteger(
value: unknown,
field: string
): asserts value is number {
if (
typeof value !== "number" ||
!Number.isSafeInteger(value) ||
value < 0
) {
throw new Error(`${field}: expected safe non-negative integer`);
}
}