export type ChainProviderName = "light-api";

export interface ChainProvider {
  readonly name: ChainProviderName;
  getHeight(): Promise<number>;
  getTransaction(txid: string): Promise<unknown>;
  getAddressBalance(address: string): Promise<unknown>;
  checkPayment(address: string, amount: string): Promise<unknown>;
}
