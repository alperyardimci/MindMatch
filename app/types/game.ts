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
}

export type GameScreenState = 'idle' | 'lobby' | 'picking' | 'reveal' | 'finished';

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
}
