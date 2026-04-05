import { useEffect, useCallback, useState } from 'react';
import { getSocket } from '../lib/socket';
import { GameState } from '../types/game';

// ---- Global singleton state ----
let gameState: GameState = {
  roomCode: null,
  players: [],
  state: 'idle',
  roundNumber: 0,
  emojis: [],
  myPick: null,
  pickedCount: 0,
  roundResult: null,
  winners: null,
  targetScore: 5,
  timeRemaining: 0,
  isHost: false,
};

const listeners = new Set<() => void>();
let timerInterval: ReturnType<typeof setInterval> | null = null;
let socketReady = false;

function notify() {
  listeners.forEach(l => l());
}

function setState(partial: Partial<GameState>) {
  gameState = { ...gameState, ...partial };
  notify();
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (gameState.timeRemaining > 0) {
      setState({ timeRemaining: gameState.timeRemaining - 1 });
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

function setupSocket() {
  if (socketReady) return;
  socketReady = true;
  const socket = getSocket();

  socket.on('room-created', (data: any) => {
    setState({
      roomCode: data.roomCode,
      players: data.players,
      targetScore: data.targetScore,
      state: 'lobby',
      isHost: data.players[0]?.id === socket.id,
    });
  });

  socket.on('player-joined', (data: any) => setState({ players: data.players }));
  socket.on('player-left', (data: any) => setState({ players: data.players }));
  socket.on('game-started', (data: any) => setState({ state: 'picking', targetScore: data.targetScore }));

  socket.on('round-start', (data: any) => {
    setState({
      state: 'picking',
      roundNumber: data.roundNumber,
      emojis: data.emojis,
      myPick: null,
      pickedCount: 0,
      roundResult: null,
      timeRemaining: data.timeLimit,
    });
    startTimer();
  });

  socket.on('pick-confirmed', (data: any) => setState({ myPick: data.emoji }));
  socket.on('picks-update', (data: any) => setState({ pickedCount: data.pickedCount }));

  socket.on('round-result', (data: any) => {
    stopTimer();
    const updatedPlayers = gameState.players.map(p => {
      const s = data.scores.find((x: any) => x.id === p.id);
      return s ? { ...p, score: s.score } : p;
    });
    setState({ state: 'reveal', roundResult: data, players: updatedPlayers });
  });

  socket.on('game-over', (data: any) => {
    stopTimer();
    const updatedPlayers = gameState.players.map(p => {
      const s = data.finalScores.find((x: any) => x.id === p.id);
      return s ? { ...p, score: s.score } : p;
    });
    setState({ state: 'finished', winners: data.winners, players: updatedPlayers });
  });
}

// ---- Hook ----
export function useGame() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    setupSocket();
    const listener = () => forceUpdate(n => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const randomPlay = useCallback((playerName: string) => {
    getSocket().emit('random-play', { playerName });
  }, []);

  const createRoom = useCallback((playerName: string, targetScore: number) => {
    getSocket().emit('create-room', { playerName, targetScore });
  }, []);

  const joinRoom = useCallback((playerName: string, roomCode: string) => {
    getSocket().emit('join-room', { playerName, roomCode: roomCode.toUpperCase() });
  }, []);

  const startGame = useCallback(() => {
    if (gameState.roomCode) getSocket().emit('start-game', { roomCode: gameState.roomCode });
  }, []);

  const pickEmoji = useCallback((emoji: string) => {
    if (gameState.roomCode) getSocket().emit('pick-emoji', { roomCode: gameState.roomCode, emoji });
  }, []);

  const leaveRoom = useCallback(() => {
    if (gameState.roomCode) getSocket().emit('leave-room', { roomCode: gameState.roomCode });
    stopTimer();
    setState({
      roomCode: null, players: [], state: 'idle', roundNumber: 0,
      emojis: [], myPick: null, pickedCount: 0, roundResult: null,
      winners: null, targetScore: 5, timeRemaining: 0, isHost: false,
    });
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    setState({
      roomCode: null, players: [], state: 'idle', roundNumber: 0,
      emojis: [], myPick: null, pickedCount: 0, roundResult: null,
      winners: null, targetScore: 5, timeRemaining: 0, isHost: false,
    });
  }, []);

  return { state: gameState, randomPlay, createRoom, joinRoom, startGame, pickEmoji, leaveRoom, reset };
}
