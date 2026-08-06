import type { ChainProvider, ChainProviderName } from "./types";
import { LightApiProvider } from "./providers/light-api";
import { WalletRpcProvider } from "./providers/wallet-rpc";

function providerName(): ChainProviderName {
  return process.env.PEPEPOW_CHAIN_PROVIDER === "wallet-rpc" ? "wallet-rpc" : "light-api";
}

export function createChainProvider(): ChainProvider {
  if (providerName() === "wallet-rpc") {
    const username = process.env.PEPEPOW_RPC_USER;
    const password = process.env.PEPEPOW_RPC_PASSWORD;
    if (!username || !password) {
      throw new Error("PEPEPOW_RPC_USER and PEPEPOW_RPC_PASSWORD are required for wallet-rpc");
    }
    return new WalletRpcProvider(
      process.env.PEPEPOW_RPC_URL ?? "http://127.0.0.1:8093",
      username,
      password,
    );
  }

  return new LightApiProvider(
    process.env.PEPEPOW_LIGHT_API_URL ?? "https://light.pepepow.net",
    process.env.PEPEPOW_LIGHT_API_KEY,
  );
}
