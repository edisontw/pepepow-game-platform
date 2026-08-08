import type { GameApiContract, ScoreSubmission } from "./types";

export const GameAPI: GameApiContract = {
  async getPlayer() {
    return { id: "local-player", kind: "anonymous" };
  },
  async submitScore(_input: ScoreSubmission) {
    return {
      accepted: false,
      trust: "untrusted-client",
      reason: "Client scores require server-side verification before acceptance.",
    };
  },
  async getLeaderboard() {
    return [];
  },
};
