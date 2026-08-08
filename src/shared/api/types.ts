import type { GameSlug } from "@/platform/games";

export type Player = { id: string; kind: "anonymous" | "authenticated" };
export type ScoreSubmission = { game: GameSlug; score: number; metadata?: Record<string, unknown> };
export type ScoreSubmissionResult = { accepted: false; trust: "untrusted-client"; reason: string };
export type LeaderboardEntry = { playerId: string; score: number; rank: number };

export interface GameApiContract {
  getPlayer(): Promise<Player>;
  submitScore(input: ScoreSubmission): Promise<ScoreSubmissionResult>;
  getLeaderboard(game: GameSlug): Promise<readonly LeaderboardEntry[]>;
}
