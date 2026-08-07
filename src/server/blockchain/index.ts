import type { ChainProvider } from "./types";
import { LightApiProvider } from "./providers/light-api";

export function createChainProvider(): ChainProvider {
  return new LightApiProvider(
    process.env.PEPEPOW_LIGHT_API_URL ?? "https://light.pepepow.net",
  );
}
