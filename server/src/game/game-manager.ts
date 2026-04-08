import { Server } from 'socket.io';
import { GameRoom } from './game-room';
import { Player } from '../types/game';
import { generateRoomCode } from '../utils/room-code';
import { getBotName } from './bot';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRoomMap: Map<string, string> = new Map(); // socketId -> roomCode
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    // Cleanup stale rooms every 5 minutes
    setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
  }

  createRoom(hostSocketId: string, playerName: string, targetScore: number): GameRoom {
    const existingCodes = new Set(this.rooms.keys());
    const code = generateRoomCode(existingCodes);

    const room = new GameRoom(code, hostSocketId, targetScore, this.io);
    room.addPlayer({
      id: hostSocketId,
      name: playerName,
      score: 0,
      isBot: false,
      isConnected: true,
    });

    this.rooms.set(code, room);
    this.playerRoomMap.set(hostSocketId, code);
    return room;
  }

  createRandomGame(playerSocketId: string, playerName: string): GameRoom {
    const room = this.createRoom(playerSocketId, playerName, 5);

    // Add 4 bots
    for (let i = 0; i < 4; i++) {
      const botId = `bot-${room.code}-${i}`;
      room.addPlayer({
        id: botId,
        name: getBotName(),
        score: 0,
        isBot: true,
        isConnected: true,
      });
    }

    return room;
  }

  joinRoom(roomCode: string, socketId: string, playerName: string): GameRoom | null {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return null;
    if (room.state !== 'lobby') return null;

    room.addPlayer({
      id: socketId,
      name: playerName,
      score: 0,
      isBot: false,
      isConnected: true,
    });

    this.playerRoomMap.set(socketId, roomCode.toUpperCase());
    return room;
  }

  getRoom(roomCode: string): GameRoom | undefined {
    return this.rooms.get(roomCode.toUpperCase());
  }

  getRoomByPlayer(socketId: string): GameRoom | undefined {
    const code = this.playerRoomMap.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  handleDisconnect(socketId: string): void {
    const code = this.playerRoomMap.get(socketId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.removePlayer(socketId);
    this.playerRoomMap.delete(socketId);

    if (player) {
      this.io.to(code).emit('player-left', {
        players: room.getPlayerList(),
        leftPlayerName: player.name,
      });
    }

    // If host left, promote someone
    if (room.hostId === socketId) {
      const humans = room.getPlayerList().filter(p => !p.isBot && p.isConnected);
      if (humans.length > 0) {
        room.hostId = humans[0].id;
      }
    }

    // If no humans left, destroy room
    if (room.getHumanCount() === 0) {
      room.cleanup();
      this.rooms.delete(code);
    }
  }

  private cleanupStaleRooms(): void {
    // Remove finished rooms and rooms with no connected humans
    for (const [code, room] of this.rooms.entries()) {
      if (room.state === 'finished' || room.getHumanCount() === 0) {
        room.cleanup();
        this.rooms.delete(code);
        // Clean up player-room mappings
        for (const [socketId, roomCode] of this.playerRoomMap.entries()) {
          if (roomCode === code) {
            this.playerRoomMap.delete(socketId);
          }
        }
      }
    }
  }
}
