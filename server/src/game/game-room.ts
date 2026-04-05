import { Server } from 'socket.io';
import { Player, RoomState, RoundResult, PlayerRoundResult } from '../types/game.js';
import { getRandomEmojis } from './emoji-pool.js';
import { scheduleBotPick } from './bot.js';

const ROUND_TIME_LIMIT = 15; // seconds

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
  private io: Server;

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

  startGame(): void {
    this.state = 'picking';
    this.currentRound = 0;
    // Reset scores
    for (const player of this.players.values()) {
      player.score = 0;
    }
    this.io.to(this.code).emit('game-started', {
      targetScore: this.targetScore,
      playerCount: this.players.size,
    });
    this.startNextRound();
  }

  startNextRound(): void {
    this.currentRound++;
    this.picks.clear();
    this.state = 'picking';

    // Pick N random emojis where N = number of players
    const playerCount = this.players.size;
    this.roundEmojis = getRandomEmojis(playerCount);

    this.io.to(this.code).emit('round-start', {
      roundNumber: this.currentRound,
      emojis: this.roundEmojis,
      timeLimit: ROUND_TIME_LIMIT,
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

    // Round timer - auto-pick for anyone who hasn't picked
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

    // Notify room about pick count (don't reveal what was picked)
    this.io.to(this.code).emit('picks-update', {
      pickedCount: this.picks.size,
      totalPlayers: this.players.size,
    });

    // Check if all players have picked
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

    // Clear timers
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    for (const timer of this.botTimers) {
      clearTimeout(timer);
    }
    this.botTimers = [];

    // Score the round
    const result = this.scoreRound();

    this.io.to(this.code).emit('round-result', {
      ...result,
      roundNumber: this.currentRound,
    });

    // Check for winners
    const winners = this.getPlayerList().filter(p => p.score >= this.targetScore);
    if (winners.length > 0) {
      this.state = 'finished';
      this.io.to(this.code).emit('game-over', {
        winners: winners.map(w => ({ id: w.id, name: w.name, score: w.score })),
        finalScores: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: p.score })),
      });
    } else {
      // Start next round after delay
      setTimeout(() => {
        if (this.state === 'reveal') {
          this.startNextRound();
        }
      }, 5000);
    }
  }

  private scoreRound(): RoundResult {
    // Count emoji occurrences
    const emojiCounts = new Map<string, number>();
    for (const emoji of this.picks.values()) {
      emojiCounts.set(emoji, (emojiCounts.get(emoji) || 0) + 1);
    }

    const results: PlayerRoundResult[] = [];
    for (const [playerId, emoji] of this.picks.entries()) {
      const isUnique = emojiCounts.get(emoji) === 1;
      const player = this.players.get(playerId)!;
      if (isUnique) {
        player.score += 1;
      }
      results.push({
        playerId,
        name: player.name,
        emoji,
        scoredPoint: isUnique,
      });
    }

    return {
      results,
      scores: this.getPlayerList().map(p => ({ id: p.id, name: p.name, score: p.score })),
    };
  }

  cleanup(): void {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    for (const timer of this.botTimers) clearTimeout(timer);
  }
}
