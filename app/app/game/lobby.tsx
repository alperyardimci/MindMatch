import React, { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { useGame } from '../../hooks/use-game';
import { getEmojiImageUrl } from '../../lib/emoji-utils';
import { colors, radius, spacing } from '../../lib/theme';

export default function LobbyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { state, startGame, leaveRoom } = useGame();

  useEffect(() => {
    if (state.state === 'picking') router.replace('/game/play');
  }, [state.state]);

  const handleShare = () => {
    if (state.roomCode) Share.share({ message: `MindMatch - Room: ${state.roomCode}` });
  };
  const handleLeave = () => { leaveRoom(); router.replace('/'); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleLeave} style={styles.backBtn}>
          <Text style={styles.backIcon}>✕</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Lobby</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t('roomCode')}</Text>
        <Text style={styles.codeText}>{state.roomCode}</Text>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareText}>{t('shareCode')}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(400)} style={styles.targetRow}>
        <Image source={{ uri: getEmojiImageUrl('1f3af') }} style={styles.targetIcon} />
        <Text style={styles.targetText}>{state.targetScore} {t('pointsToWin')}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(500)} style={styles.playersCard}>
        <Text style={styles.playersTitle}>
          {t('players')}
          <Text style={styles.playerCount}> ({state.players.length})</Text>
        </Text>
        {state.players.map((p, i) => (
          <Animated.View key={p.id} entering={SlideInRight.delay(600 + i * 100).springify()} style={styles.playerRow}>
            <View style={[styles.avatar, i === 0 && styles.hostAvatar]}>
              <Image source={{ uri: getEmojiImageUrl('1f464') }} style={styles.avatarImg} />
            </View>
            <Text style={styles.playerName}>{p.name}</Text>
            {i === 0 && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostText}>HOST</Text>
              </View>
            )}
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.Text entering={FadeIn.delay(800)} style={styles.waiting}>
        {t('waitingForPlayers')}
      </Animated.Text>

      {state.isHost && state.players.length >= 2 && (
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            onPress={startGame}
          >
            <Text style={styles.startText}>{t('start')}</Text>
          </Pressable>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: colors.textSecondary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  codeCard: {
    marginHorizontal: spacing.lg, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: colors.primary,
  },
  codeLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  codeText: { fontSize: 52, fontWeight: '900', color: colors.primaryLight, letterSpacing: 16, marginVertical: spacing.sm },
  shareBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: radius.full },
  shareText: { fontSize: 14, fontWeight: '600', color: colors.text },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg, gap: 8 },
  targetIcon: { width: 20, height: 20 },
  targetText: { fontSize: 15, color: colors.textSecondary },
  playersCard: {
    margin: spacing.lg, backgroundColor: colors.bgCard,
    borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  playersTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  playerCount: { color: colors.textMuted },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
  },
  avatar: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.bgCardLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  hostAvatar: { borderColor: colors.accent },
  avatarImg: { width: 22, height: 22 },
  playerName: { flex: 1, fontSize: 16, color: colors.text },
  hostBadge: {
    backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  hostText: { fontSize: 10, fontWeight: '800', color: colors.accent, letterSpacing: 1 },
  waiting: { textAlign: 'center', fontSize: 14, color: colors.textMuted },
  footer: { padding: spacing.lg, marginTop: 'auto' },
  startBtn: { backgroundColor: colors.success, paddingVertical: 20, borderRadius: radius.xl, alignItems: 'center' },
  startText: { fontSize: 18, fontWeight: '800', color: colors.text },
});
