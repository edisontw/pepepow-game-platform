import type { ChainProvider } from "../types";

type HeightResponse = { height?: number };

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export class LightApiProvider implements ChainProvider {
  readonly name = "light-api" as const;

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(joinUrl(this.baseUrl, path), {
      headers: this.apiKey ? { "x-api-key": this.apiKey } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`PEPEPOW Light API returned ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async getHeight() {
    const result = await this.request<HeightResponse>("/v1/chain/height");
    if (!Number.isInteger(result.height)) {
      throw new Error("PEPEPOW Light API returned an invalid chain height");
    }
    return result.height as number;
  }

  getTransaction(txid: string) {
    return this.request<unknown>(`/v1/tx/${encodeURIComponent(txid)}`);
  }

  getAddressBalance(address: string) {
    return this.request<unknown>(`/v1/addr/${encodeURIComponent(address)}/balance`);
  }
}
