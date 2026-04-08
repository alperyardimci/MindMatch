import { Server } from 'socket.io';
import { Player, RoomState, RoundResult, PlayerRoundResult, GameMode, DuoRoundHistory, DuoFinalResult } from '../types/game';
import { getRandomEmojis } from './emoji-pool';
import { scheduleBotPick } from './bot';

const ROUND_TIME_LIMIT = 15;
const DUO_TOTAL_ROUNDS = 10;
const DUO_EMOJIS_PER_ROUND = 5;

// Fortune keys based on percentage ranges
function getDuoFortuneKey(pct: number): string {
  if (pct >= 90) return 'fortune_soulmates';
  if (pct >= 75) return 'fortune_strong';
  if (pct >= 55) return 'fortune_good';
  if (pct >= 35) return 'fortune_developing';
  if (pct >= 15) return 'fortune_weak';
  return 'fortune_none';
}

export class GameRoom {
  code: string;
  hostId: string;
  targetScore: number;
  state: RoomState = 'lobby';
  players: Map<string, Player> = new Map();
  currentRound = 0;
  roundEmojis: string[] = [];
  picks: Map<string, string> = new Map();
  roundTimer: NodeJS.Timeout | null = null;
  botTimers: NodeJS.Timeout[] = [];
  gameMode: GameMode = 'classic';
  private io: Server;

  // Duo mode state
  duoHistory: DuoRoundHistory[] = [];
  duoCurrentStreak = 0;
  duoLongestStreak = 0;
  duoMatches = 0;

  constructor(code: string, hostId: string, targetScore: number, io: Server) {
    this.code = code;
    this.hostId = hostId;
    this.targetScore = targetScore;
    this.io = io;
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string): Player | undefined {
    const player = this.players.get(playerId);
    if (player) {
      if (player.isBot) {
        this.players.delete(playerId);
      } else {
        player.isConnected = false;
      }
    }
    return player;
  }

  getPlayerList(): Player[] {
    return Array.from(this.players.values());
  }

  getHumanCount(): number {
    return this.getPlayerList().filter(p => !p.isBot && p.isConnected).length;
  }

  isDuo(): boolean {
    return this.gameMode === 'duo';
  }

  startGame(): void {
    // Detect duo mode: exactly 2 players, both human
    const players = this.getPlayerList();
    if (players.length === 2 && players.every(p => !p.isBot)) {
      this.gameMode = 'duo';
    } else {
      this.gameMode = 'classic';
    }

    this.state = 'picking';
    this.currentRound = 0;
    this.duoHistory = [];
    this.duoCurrentStreak = 0;
    this.duoLongestStreak = 0;
    this.duoMatches = 0;

    for (const player of this.players.values()) {
      player.score = 0;
    }

    this.io.to(this.code).emit('game-started', {
      targetScore: this.isDuo() ? 100 : this.targetScore,
      playerCount: this.players.size,
      gameMode: this.gameMode,
      totalRounds: this.isDuo() ? DUO_TOTAL_ROUNDS : undefined,
    });

    this.startNextRound();
  }

  startNextRound(): void {
    this.currentRound++;
    this.picks.clear();
    this.state = 'picking';

    // Duo: always 5 emojis. Classic: N emojis for N players
    const emojiCount = this.isDuo() ? DUO_EMOJIS_PER_ROUND : this.players.size;
    this.roundEmojis = getRandomEmojis(emojiCount);

    this.io.to(this.code).emit('round-start', {
      roundNumber: this.currentRound,
      emojis: this.roundEmojis,
      timeLimit: ROUND_TIME_LIMIT,
      totalRounds: this.isDuo() ? DUO_TOTAL_ROUNDS : undefined,
    });

    // Schedule bot picks
    this.botTimers = [];
    for (const player of this.players.values()) {
      if (player.isBot) {
        const timer = scheduleBotPick(this.roundEmojis, (emoji) => {
          this.submitPick(player.id, emoji);
        });
        this.botTimers.push(timer);
      }
    }

    this.roundTimer = setTimeout(() => {
      this.autoPickRemaining();
    }, ROUND_TIME_LIMIT * 1000);
  }

  submitPick(playerId: string, emoji: string): boolean {
    if (this.state !== 'picking') return false;
    if (this.picks.has(playerId)) return false;
    if (!this.roundEmojis.includes(emoji)) return false;
    if (!this.players.has(playerId)) return false;

    this.picks.set(playerId, emoji);

    this.io.to(this.code).emit('picks-update', {
      pickedCount: this.picks.size,
      totalPlayers: this.players.size,
    });

    if (this.picks.size === this.players.size) {
      this.endRound();
    }

    return true;
  }

  private autoPickRemaining(): void {
    for (const player of this.players.values()) {
      if (!this.picks.has(player.id)) {
        const randomEmoji = this.roundEmojis[Math.floor(Math.random() * this.roundEmojis.length)];
        this.picks.set(player.id, randomEmoji);
      }
    }
    this.endRound();
  }

  private endRound(): void {
    if (this.state !== 'picking') return;
    this.state = 'reveal';

    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    for (const timer of this.botTimers) clearTimeout(timer);
    this.botTimers = [];

    if (this.isDuo()) {
      this.endDuoRound();
    } else {
      this.endClassicRound();
    }
  }

  // ---- Classic mode scoring ----
  private endClassicRound(): void {
    const result = this.scoreClassicRound();

    this.io.to(this.code).emit('round-result', {
      ...result,
      roundNumber: this.currentRound,
    });

    const winners = this.getPlayerList().filter(p => p.score >= this.targetScore);
    if (winners.length > 0) {
      this.state = 'finished';
      this.io.to(this.code).emit('game-over', {
        winners: winners.map(w => ({ id: w.id, name: w.name, score: w.score })),
        finalScores: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: p.score })),
      });
    } else {
      setTimeout(() => {
        if (this.state === 'reveal') this.startNextRound();
      }, 5000);
    }
  }

  private scoreClassicRound(): RoundResult {
    const emojiCounts = new Map<string, number>();
    for (const emoji of this.picks.values()) {
      emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
    }

    const results: PlayerRoundResult[] = [];
    for (const [playerId, emoji] of this.picks.entries()) {
      const isUnique = emojiCounts.get(emoji) === 1;
      const player = this.players.get(playerId)!;
      if (isUnique) player.score += 1;
      results.push({ playerId, name: player.name, emoji, scoredPoint: isUnique });
    }

    return {
      results,
      scores: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: p.score })),
    };
  }

  // ---- Duo mode scoring ----
  private endDuoRound(): void {
    const playerIds = Array.from(this.picks.keys());
    const emoji1 = this.picks.get(playerIds[0])!;
    const emoji2 = this.picks.get(playerIds[1])!;
    const connected = emoji1 === emoji2;

    // Track history
    if (connected) {
      this.duoMatches++;
      this.duoCurrentStreak++;
      if (this.duoCurrentStreak > this.duoLongestStreak) {
        this.duoLongestStreak = this.duoCurrentStreak;
      }
    } else {
      this.duoCurrentStreak = 0;
    }

    this.duoHistory.push({
      round: this.currentRound,
      connected,
      emoji1,
      emoji2,
    });

    // In duo mode, "scoredPoint" means connected
    const results: PlayerRoundResult[] = [];
    for (const [playerId, emoji] of this.picks.entries()) {
      const player = this.players.get(playerId)!;
      results.push({ playerId, name: player.name, emoji, scoredPoint: connected });
    }

    // Update display scores (running percentage)
    const currentPct = this.calculateDuoPercentage();
    for (const player of this.players.values()) {
      player.score = currentPct;
    }

    this.io.to(this.code).emit('round-result', {
      results,
      scores: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: p.score })),
      roundNumber: this.currentRound,
      duoConnected: connected,
    });

    // Check if 10 rounds done
    if (this.currentRound >= DUO_TOTAL_ROUNDS) {
      this.state = 'finished';
      const duoResult = this.buildDuoFinalResult();
      this.io.to(this.code).emit('game-over', {
        winners: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: duoResult.percentage })),
        finalScores: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: duoResult.percentage })),
        duoResult,
      });
    } else {
      setTimeout(() => {
        if (this.state === 'reveal') this.startNextRound();
      }, 4000);
    }
  }

  private calculateDuoPercentage(): number {
    // Point system:
    // - Match = +10 (streak 2+ = +15)
    // - Miss = -5
    // - Max 100, min 0

    let points = 0;
    let streak = 0;

    for (const rh of this.duoHistory) {
      if (rh.connected) {
        streak++;
        points += streak >= 2 ? 15 : 10;
      } else {
        streak = 0;
        points -= 5;
      }
    }

    return Math.min(100, Math.max(0, points));
  }

  private buildDuoFinalResult(): DuoFinalResult {
    const percentage = this.calculateDuoPercentage();
    const fortuneKey = getDuoFortuneKey(percentage);
    return {
      percentage,
      matches: this.duoMatches,
      totalRounds: DUO_TOTAL_ROUNDS,
      longestStreak: this.duoLongestStreak,
      roundHistory: this.duoHistory,
      fortune: '', // Client will use fortuneKey for i18n
      fortuneKey,
    };
  }

  resetToLobby(): void {
    this.cleanup();
    this.state = 'lobby';
    this.currentRound = 0;
    this.roundEmojis = [];
    this.picks.clear();
    this.duoHistory = [];
    this.duoCurrentStreak = 0;
    this.duoLongestStreak = 0;
    this.duoMatches = 0;
    this.gameMode = 'classic';
    for (const player of this.players.values()) {
      player.score = 0;
    }
  }

  updateTargetScore(score: number): void {
    this.targetScore = Math.max(1, Math.min(50, score));
  }

  cleanup(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    for (const timer of this.botTimers) clearTimeout(timer);
  }
}
