import type { ChainProvider } from "../types";

type StatusResponse = {
  ok?: boolean;
  electrumx?: { height?: number };
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export class LightApiProvider implements ChainProvider {
  readonly name = "light-api" as const;

  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(joinUrl(this.baseUrl, path), {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`PEPEPOW Light API returned ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async getHeight() {
    const result = await this.request<StatusResponse>("/api/status");
    const height = result.electrumx?.height;
    if (!result.ok || !Number.isInteger(height)) {
      throw new Error("PEPEPOW Light API returned an invalid chain height");
    }
    return height as number;
  }

  getTransaction(txid: string) {
    return this.request<unknown>(`/api/tx/${encodeURIComponent(txid)}`);
  }

  getAddressBalance(address: string) {
    return this.request<unknown>(`/api/address/${encodeURIComponent(address)}`);
  }

  checkPayment(address: string, amount: string) {
    const query = new URLSearchParams({ address, amount });
    return this.request<unknown>(`/api/payment/check?${query.toString()}`);
  }
}
