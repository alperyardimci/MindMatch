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
}

export type RoomState = 'lobby' | 'picking' | 'reveal' | 'finished';
export type GameMode = 'classic' | 'duo';

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
  fortune: string;
  fortuneKey: string; // i18n key for client
}

export interface RoomInfo {
  code: string;
  hostId: string;
  targetScore: number;
  state: RoomState;
  players: Player[];
  currentRound: number;
  gameMode: GameMode;
}

// Client -> Server events
export interface ClientEvents {
  'random-play': (data: { playerName: string }) => void;
  'create-room': (data: { playerName: string; targetScore: number }) => void;
  'join-room': (data: { playerName: string; roomCode: string }) => void;
  'start-game': (data: { roomCode: string }) => void;
  'pick-emoji': (data: { roomCode: string; emoji: string }) => void;
  'leave-room': (data: { roomCode: string }) => void;
}

// Server -> Client events
export interface ServerEvents {
  'room-created': (data: { roomCode: string; players: Player[]; targetScore: number; gameMode: GameMode }) => void;
  'player-joined': (data: { players: Player[] }) => void;
  'player-left': (data: { players: Player[]; leftPlayerName: string }) => void;
  'game-started': (data: { targetScore: number; playerCount: number; gameMode: GameMode; totalRounds?: number }) => void;
  'round-start': (data: { roundNumber: number; emojis: string[]; timeLimit: number; totalRounds?: number }) => void;
  'pick-confirmed': (data: { emoji: string }) => void;
  'picks-update': (data: { pickedCount: number; totalPlayers: number }) => void;
  'round-result': (data: RoundResult & { roundNumber: number; duoConnected?: boolean }) => void;
  'game-over': (data: { winners: { id: string; name: string; score: number }[]; finalScores: { id: string; name: string; score: number }[]; duoResult?: DuoFinalResult }) => void;
  'error': (data: { message: string; code: string }) => void;
}
