export type RewardClaim = { accepted: false; reason: string };

export const RewardAPI = {
  async claim(): Promise<RewardClaim> {
    return { accepted: false, reason: "Rewards are not connected. Client claims are untrusted." };
  },
} as const;
