type RpcResponse<T> = {
  result: T | null;
  error: { code: number; message: string } | null;
};

export class WalletRpcClient {
  private requestId = 0;

  constructor(
    private readonly url: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  private async rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    const authorization = Buffer.from(`${this.username}:${this.password}`).toString("base64");
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        authorization: `Basic ${authorization}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "1.0",
        id: ++this.requestId,
        method,
        params,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`PEPEPOW wallet RPC returned ${response.status}`);
    }

    const payload = (await response.json()) as RpcResponse<T>;
    if (payload.error) {
      throw new Error(`PEPEPOW wallet RPC error ${payload.error.code}: ${payload.error.message}`);
    }
    return payload.result as T;
  }

  getHeight() {
    return this.rpc<number>("getblockcount");
  }

  getTransaction(txid: string) {
    return this.rpc<unknown>("getrawtransaction", [txid, true]);
  }

  getAddressBalance(address: string) {
    return this.rpc<unknown>("getaddressbalance", [{ addresses: [address] }]);
  }
}
