export type GameSlug =
  | "runner"
  | "pet-matching"
  | "plant-defense"
  | "idle-pet-mining"
  | "blockscape-3d"
  | "node-tactics";

export type GameDefinition = {
  slug: GameSlug;
  title: string;
  version: string;
  status: "playable" | "experimental";
  persistence: "local" | "server";
};

export const games: readonly GameDefinition[] = [
  { slug: "runner", title: "Auto-Shooting Runner", version: "0.7", status: "playable", persistence: "local" },
  { slug: "pet-matching", title: "Pet Matching", version: "0.1", status: "playable", persistence: "local" },
  { slug: "plant-defense", title: "Plant Defense", version: "0.3", status: "playable", persistence: "local" },
  { slug: "idle-pet-mining", title: "Idle Pet & Mining", version: "0.1", status: "playable", persistence: "local" },
  { slug: "blockscape-3d", title: "BLOCKSCAPE 3D", version: "0.1", status: "playable", persistence: "local" },
  { slug: "node-tactics", title: "NODE TACTICS", version: "0.2", status: "playable", persistence: "local" },
] as const;
