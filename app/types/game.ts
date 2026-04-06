export interface Player {
  id: string;
  name: string;
  score: number;
  isBot: boolean;
  isConnected: boolean;
}

export interface PlayerRoundResult {
  playerId: string;
  name: string;
  emoji: string;
  scoredPoint: boolean;
}

export interface RoundResult {
  results: PlayerRoundResult[];
  scores: { id: string; name: string; score: number }[];
  roundNumber: number;
  duoConnected?: boolean;
}

export interface DuoRoundHistory {
  round: number;
  connected: boolean;
  emoji1: string;
  emoji2: string;
}

export interface DuoFinalResult {
  percentage: number;
  matches: number;
  totalRounds: number;
  longestStreak: number;
  roundHistory: DuoRoundHistory[];
  fortuneKey: string;
}

export type GameScreenState = 'idle' | 'lobby' | 'picking' | 'reveal' | 'finished';
export type GameMode = 'classic' | 'duo';

export interface GameState {
  roomCode: string | null;
  players: Player[];
  state: GameScreenState;
  roundNumber: number;
  emojis: string[];
  myPick: string | null;
  pickedCount: number;
  roundResult: RoundResult | null;
  winners: { id: string; name: string; score: number }[] | null;
  targetScore: number;
  timeRemaining: number;
  isHost: boolean;
  gameMode: GameMode;
  totalRounds: number | null;
  duoConnected: boolean | null;
  duoResult: DuoFinalResult | null;
}
