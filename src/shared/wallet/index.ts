export type WalletBalance = { available: false; amount: null; unit: "PEPEW" };

export const WalletAPI = {
  async getAddress(): Promise<null> { return null; },
  async getBalance(): Promise<WalletBalance> { return { available: false, amount: null, unit: "PEPEW" }; },
} as const;
