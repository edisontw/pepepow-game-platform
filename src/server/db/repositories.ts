import type { GameSlug } from "@/platform/games";

export type ScoreRecord = {
  id: string;
  game: GameSlug;
  playerId: string | null;
  score: number;
  createdAt: Date;
};

export type PaymentStatus = "pending" | "confirmed" | "expired" | "rejected";

export type PaymentRecord = {
  id: string;
  playerId: string | null;
  address: string;
  expectedAmount: string;
  txid: string | null;
  confirmations: number;
  status: PaymentStatus;
  createdAt: Date;
};

export interface ScoreRepository {
  create(score: Omit<ScoreRecord, "id" | "createdAt">): Promise<ScoreRecord>;
  listTop(game: GameSlug, limit: number): Promise<ScoreRecord[]>;
}

export interface PaymentRepository {
  create(payment: Omit<PaymentRecord, "id" | "createdAt">): Promise<PaymentRecord>;
  findById(id: string): Promise<PaymentRecord | null>;
  update(payment: PaymentRecord): Promise<void>;
}
