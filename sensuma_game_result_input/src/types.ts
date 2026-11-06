import { BracketSide } from './constants/smashData';

export type WinnerSide = 'P1' | 'P2' | null;

export interface GameResult {
  gameNumber: number;
  p1Fighter: string;
  p2Fighter: string;
  stage: string;
  winner: WinnerSide;
}

export interface MatchPayload {
  timestamp: string;
  bracketSide: BracketSide;
  round: string;
  player1: string;
  player2: string;
  p1Score: number;
  p2Score: number;
  matchWinner: 'P1' | 'P2' | 'DRAW';
  games: GameResult[];
}

