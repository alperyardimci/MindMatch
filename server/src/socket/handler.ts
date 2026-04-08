import { Server, Socket } from 'socket.io';
import { GameManager } from '../game/game-manager';

export function setupSocketHandlers(io: Server): void {
  const manager = new GameManager(io);

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('random-play', ({ playerName }: { playerName: string }) => {
      const room = manager.createRandomGame(socket.id, playerName || 'Player');
      socket.join(room.code);

      socket.emit('room-created', {
        roomCode: room.code,
        players: room.getPlayerList(),
        targetScore: room.targetScore,
      });

      // Auto-start random games after a short delay
      setTimeout(() => {
        room.startGame();
      }, 1500);
    });

    socket.on('create-room', ({ playerName, targetScore }: { playerName: string; targetScore: number }) => {
      const score = Math.max(1, Math.min(50, targetScore || 5));
      const room = manager.createRoom(socket.id, playerName || 'Host', score);
      socket.join(room.code);

      socket.emit('room-created', {
        roomCode: room.code,
        players: room.getPlayerList(),
        targetScore: room.targetScore,
      });
    });

    socket.on('join-room', ({ playerName, roomCode }: { playerName: string; roomCode: string }) => {
      const room = manager.joinRoom(roomCode, socket.id, playerName || 'Player');

      if (!room) {
        socket.emit('error', {
          message: 'Room not found or game already started',
          code: 'ROOM_NOT_FOUND',
        });
        return;
      }

      socket.join(room.code);

      socket.emit('room-created', {
        roomCode: room.code,
        players: room.getPlayerList(),
        targetScore: room.targetScore,
      });

      io.to(room.code).emit('player-joined', {
        players: room.getPlayerList(),
      });
    });

    socket.on('start-game', ({ roomCode }: { roomCode: string }) => {
      const room = manager.getRoom(roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      if (room.state !== 'lobby') return;
      if (room.getPlayerList().length < 2) return;

      room.startGame();
    });

    socket.on('pick-emoji', ({ roomCode, emoji }: { roomCode: string; emoji: string }) => {
      const room = manager.getRoom(roomCode);
      if (!room) return;

      const success = room.submitPick(socket.id, emoji);
      if (success) {
        socket.emit('pick-confirmed', { emoji });
      }
    });

    socket.on('restart-game', ({ roomCode }: { roomCode: string }) => {
      const room = manager.getRoom(roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      if (room.state !== 'finished') return;

      room.resetToLobby();

      io.to(room.code).emit('room-returned-to-lobby', {
        roomCode: room.code,
        players: room.getPlayerList(),
        targetScore: room.targetScore,
      });
    });

    socket.on('update-room', ({ roomCode, targetScore }: { roomCode: string; targetScore: number }) => {
      const room = manager.getRoom(roomCode);
      if (!room) return;
      if (room.hostId !== socket.id) return;
      if (room.state !== 'lobby') return;

      room.updateTargetScore(targetScore);

      io.to(room.code).emit('room-updated', {
        targetScore: room.targetScore,
      });
    });

    socket.on('leave-room', ({ roomCode }: { roomCode: string }) => {
      socket.leave(roomCode);
      manager.handleDisconnect(socket.id);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      manager.handleDisconnect(socket.id);
    });
  });
}
