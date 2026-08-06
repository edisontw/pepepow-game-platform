export type ChainProviderName = "light-api" | "wallet-rpc";

export interface ChainProvider {
  readonly name: ChainProviderName;
  getHeight(): Promise<number>;
  getTransaction(txid: string): Promise<unknown>;
  getAddressBalance(address: string): Promise<unknown>;
}
