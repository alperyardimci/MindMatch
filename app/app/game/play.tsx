import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useGame } from '../../hooks/use-game';
import { EmojiGrid } from '../../components/emoji-grid';
import { PlayerList } from '../../components/player-list';
import { RoundResultView } from '../../components/round-result';
import { getSocket } from '../../lib/socket';
import { getEmojiImageUrl } from '../../lib/emoji-utils';
import { colors, radius, spacing } from '../../lib/theme';
import { ROUND_TIME_LIMIT } from '../../lib/constants';

const { height: H } = Dimensions.get('window');

const TIMER_SIZE = 48;

const TIMER_STROKE = 3.5;
const TIMER_R = (TIMER_SIZE - TIMER_STROKE) / 2;
const TIMER_CIRC = 2 * Math.PI * TIMER_R;
const TIMER_CENTER = TIMER_SIZE / 2;

function TimerRing({ seconds, total }: { seconds: number; total: number }) {
  const isUrgent = seconds <= 5;
  const progress = total > 0 ? seconds / total : 0;
  const offset = TIMER_CIRC * (1 - progress);

  return (
    <View style={timerS.wrap}>
      <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
        <Circle
          cx={TIMER_CENTER} cy={TIMER_CENTER} r={TIMER_R}
          stroke={colors.border} strokeWidth={TIMER_STROKE} fill={colors.bgCard}
        />
        <Circle
          cx={TIMER_CENTER} cy={TIMER_CENTER} r={TIMER_R}
          stroke={isUrgent ? colors.error : colors.primary}
          strokeWidth={TIMER_STROKE} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${TIMER_CIRC}`}
          strokeDashoffset={offset}
          rotation={-90} origin={`${TIMER_CENTER}, ${TIMER_CENTER}`}
        />
      </Svg>
      <Text style={[timerS.text, isUrgent && timerS.urgentText]}>{seconds}</Text>
    </View>
  );
}

const timerS = StyleSheet.create({
  wrap: {
    width: TIMER_SIZE, height: TIMER_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  text: {
    position: 'absolute', fontSize: 15, fontWeight: '800', color: colors.text,
  },
  urgentText: { color: colors.error },
});

export default function PlayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { state, pickEmoji, leaveRoom, reset } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showTimeUp, setShowTimeUp] = useState(false);
  const socket = getSocket();

  // Pulse for waiting
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (state.myPick && state.state === 'picking') {
      pulse.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1, true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [state.myPick, state.state]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // Reset on new round
  useEffect(() => {
    if (state.state === 'picking') {
      setSelected(null);
      setShowResult(false);
      setShowTimeUp(false);
    }
  }, [state.roundNumber]);

  // Show results
  useEffect(() => {
    if (state.state === 'reveal' && state.roundResult) setShowResult(true);
  }, [state.state, state.roundResult]);

  // Time's up notification
  useEffect(() => {
    if (state.state === 'picking' && state.timeRemaining === 0 && !state.myPick) {
      setShowTimeUp(true);
      setTimeout(() => setShowTimeUp(false), 2000);
    }
  }, [state.timeRemaining, state.state, state.myPick]);

  const handleSelect = useCallback((emoji: string) => {
    if (!state.myPick) setSelected(emoji);
  }, [state.myPick]);

  const handleConfirm = useCallback(() => {
    if (selected && !state.myPick) pickEmoji(selected);
  }, [selected, state.myPick, pickEmoji]);

  const handleLeave = () => { leaveRoom(); router.replace('/'); };
  const handlePlayAgain = () => { reset(); router.replace('/'); };

  const hasPicked = !!state.myPick;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleLeave} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Animated.View entering={ZoomIn} style={styles.roundPill}>
          <Text style={styles.roundLabel}>{t('round')}</Text>
          <Text style={styles.roundNum}>{state.roundNumber}</Text>
        </Animated.View>
        <TimerRing seconds={state.timeRemaining} total={ROUND_TIME_LIMIT} />
      </View>

      {/* Scoreboard */}
      <PlayerList players={state.players} targetScore={state.targetScore} compact />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status */}
        {state.state === 'picking' && !hasPicked && !showTimeUp && (
          <Animated.Text entering={FadeIn} style={styles.instruction}>{t('pickEmoji')}</Animated.Text>
        )}
        {state.state === 'picking' && hasPicked && (
          <Animated.Text style={[styles.waitMsg, pulseStyle]}>{t('waitingForPicks')}</Animated.Text>
        )}

        {/* Time's up banner */}
        {showTimeUp && (
          <Animated.View entering={FadeIn} style={styles.timeUpBanner}>
            <Image source={{ uri: getEmojiImageUrl('23f0') }} style={styles.timeUpIcon} />
            <Text style={styles.timeUpText}>{t('autoPickWarning')}</Text>
          </Animated.View>
        )}

        {/* Pick dots */}
        {state.state === 'picking' && (
          <View style={styles.pickCounter}>
            {Array.from({ length: state.players.length }).map((_, i) => (
              <View key={i} style={[styles.dot, i < state.pickedCount && styles.dotFilled]} />
            ))}
            <Text style={styles.pickText}>
              {t('pickedCount', { count: state.pickedCount, total: state.players.length })}
            </Text>
          </View>
        )}

        {/* Emoji Grid */}
        <Animated.View entering={FadeInUp.springify()} style={styles.gridWrap}>
          <EmojiGrid
            emojis={state.emojis}
            selectedEmoji={selected}
            onSelect={handleSelect}
            disabled={hasPicked || state.state !== 'picking'}
            roundResults={state.roundResult?.results}
            myId={socket.id}
          />
        </Animated.View>

        {/* Confirm */}
        {state.state === 'picking' && selected && !hasPicked && (
          <Animated.View entering={FadeInUp.springify()}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
              onPress={handleConfirm}
            >
              <Image source={{ uri: getEmojiImageUrl(selected) }} style={styles.confirmEmoji} />
              <Text style={styles.confirmText}>{t('confirm')}</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Round Result */}
      <Modal visible={showResult && !!state.roundResult} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowResult(false)}>
          <Animated.View entering={ZoomIn.springify()} style={styles.resultSheet}>
            {state.roundResult && <RoundResultView result={state.roundResult} roundEmojis={state.emojis} />}
            <Text style={styles.tapHint}>Tap to continue</Text>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Game Over */}
      <Modal visible={state.state === 'finished'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View entering={ZoomIn.springify()} style={styles.gameOverSheet}>
            <Image source={{ uri: getEmojiImageUrl('1f3c6') }} style={styles.trophyImg} />
            <Text style={styles.gameOverTitle}>{t('gameOver')}</Text>

            {state.winners && state.winners.length > 0 && (
              <View style={styles.winnerSection}>
                <Text style={styles.winnerLabel}>
                  {state.winners.length > 1 ? t('winners') : t('winner')}
                </Text>
                {state.winners.map((w) => (
                  <Text key={w.id} style={styles.winnerName}>{w.name} — {w.score} pts</Text>
                ))}
              </View>
            )}

            <View style={styles.finalScores}>
              <PlayerList players={state.players} targetScore={state.targetScore} />
            </View>

            <Pressable style={({ pressed }) => [styles.playAgainBtn, pressed && styles.pressed]} onPress={handlePlayAgain}>
              <Text style={styles.playAgainText}>{t('playAgain')}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 16, color: colors.textSecondary },
  roundPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full,
    gap: 6, borderWidth: 1, borderColor: colors.border,
  },
  roundLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  roundNum: { fontSize: 18, fontWeight: '800', color: colors.primaryLight },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  instruction: {
    fontSize: 17, fontWeight: '700', color: colors.primaryLight,
    textAlign: 'center', marginTop: spacing.lg,
  },
  waitMsg: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  timeUpBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 16, marginTop: spacing.md,
    gap: 10,
  },
  timeUpIcon: { width: 24, height: 24 },
  timeUpText: { fontSize: 14, fontWeight: '600', color: colors.error },
  pickCounter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: spacing.md, marginBottom: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotFilled: { backgroundColor: colors.primary },
  pickText: { fontSize: 12, color: colors.textMuted, marginLeft: 4 },
  gridWrap: { marginVertical: spacing.lg },
  confirmBtn: {
    flexDirection: 'row', backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    marginHorizontal: spacing.md,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  confirmEmoji: { width: 32, height: 32 },
  confirmText: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalOverlay: {
    flex: 1, backgroundColor: colors.bgOverlay,
    justifyContent: 'center', alignItems: 'center', padding: spacing.lg,
  },
  resultSheet: { width: '100%', maxWidth: 380, maxHeight: H * 0.75 },
  tapHint: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: spacing.md },
  gameOverSheet: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl,
    width: '100%', maxWidth: 380, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  trophyImg: { width: 80, height: 80, marginBottom: spacing.sm },
  gameOverTitle: { fontSize: 32, fontWeight: '900', color: colors.text, marginBottom: spacing.md },
  winnerSection: { alignItems: 'center', marginBottom: spacing.md },
  winnerLabel: {
    fontSize: 13, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6,
  },
  winnerName: { fontSize: 22, fontWeight: '800', color: colors.accent },
  finalScores: { width: '100%', marginBottom: spacing.md },
  playAgainBtn: {
    backgroundColor: colors.primary, paddingVertical: 18,
    paddingHorizontal: 48, borderRadius: radius.xl,
  },
  playAgainText: { fontSize: 17, fontWeight: '700', color: colors.text },
});
