import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { RoundResult } from '../types/game';
import { useTranslation } from 'react-i18next';
import { getSocket } from '../lib/socket';
import { getEmojiImageUrl } from '../lib/emoji-utils';
import { colors, radius, spacing } from '../lib/theme';

interface RoundResultViewProps {
  result: RoundResult;
  roundEmojis: string[]; // all emojis available this round
}

interface EmojiGroup {
  emoji: string;
  players: { name: string; isMe: boolean }[];
  unique: boolean;
}

export function RoundResultView({ result, roundEmojis }: RoundResultViewProps) {
  const { t } = useTranslation();
  const socket = getSocket();

  const { uniqueGroups, dupGroups, notPicked } = useMemo(() => {
    // Group picks by emoji
    const emojiMap = new Map<string, { name: string; isMe: boolean }[]>();

    for (const r of result.results) {
      const isMe = r.playerId === socket.id;
      const displayName = isMe ? t('you') : r.name;
      if (!emojiMap.has(r.emoji)) emojiMap.set(r.emoji, []);
      emojiMap.get(r.emoji)!.push({ name: displayName, isMe });
    }

    const unique: EmojiGroup[] = [];
    const dup: EmojiGroup[] = [];

    for (const [emoji, players] of emojiMap) {
      const group = { emoji, players, unique: players.length === 1 };
      if (group.unique) unique.push(group);
      else dup.push(group);
    }

    // Sort: "me" groups first
    unique.sort((a, b) => (b.players.some(p => p.isMe) ? 1 : 0) - (a.players.some(p => p.isMe) ? 1 : 0));
    dup.sort((a, b) => b.players.length - a.players.length);

    // Emojis not picked by anyone
    const pickedEmojis = new Set(emojiMap.keys());
    const unpicked = roundEmojis.filter(e => !pickedEmojis.has(e));

    return { uniqueGroups: unique, dupGroups: dup, notPicked: unpicked };
  }, [result, roundEmojis, socket.id, t]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('round')} {result.roundNumber}</Text>
      <Text style={styles.subtitle}>{t('results')}</Text>

      {/* Unique picks */}
      {uniqueGroups.length > 0 && (
        <>
          <SectionDivider label={t('uniqueSection')} />
          {uniqueGroups.map(g => (
            <View key={g.emoji} style={[styles.row, styles.uniqueRow, g.players.some(p => p.isMe) && styles.meRow]}>
              <Image source={{ uri: getEmojiImageUrl(g.emoji) }} style={styles.emoji} />
              <View style={styles.content}>
                <Text style={[styles.names, g.players[0]?.isMe && styles.meText]}>
                  {g.players[0]?.name}
                </Text>
                <Text style={[styles.badge, styles.uniqueBadge]}>+1 {t('uniquePick')}</Text>
              </View>
              <Text style={[styles.score, styles.uniqueScore]}>+1</Text>
            </View>
          ))}
        </>
      )}

      {/* Telepathic bonds */}
      {dupGroups.length > 0 && (
        <>
          <SectionDivider label={t('telepathicBond')} />
          {dupGroups.map(g => {
            const hasMe = g.players.some(p => p.isMe);
            return (
              <View key={g.emoji} style={[styles.row, styles.dupRow, hasMe && styles.meRow]}>
                <Image source={{ uri: getEmojiImageUrl(g.emoji) }} style={styles.emoji} />
                <View style={styles.content}>
                  <Text style={styles.names} numberOfLines={1}>
                    {g.players.map((p, i) => (
                      <Text key={i}>
                        {i > 0 && <Text style={styles.dim}>, </Text>}
                        <Text style={p.isMe ? styles.meText : undefined}>{p.name}</Text>
                      </Text>
                    ))}
                  </Text>
                  <Text style={[styles.badge, styles.dupBadge]}>
                    {t('samePicked', { count: g.players.length })}
                  </Text>
                </View>
                <Text style={[styles.score, styles.dupScore]}>0</Text>
              </View>
            );
          })}
        </>
      )}

      {/* Not picked */}
      {notPicked.length > 0 && (
        <>
          <SectionDivider label={t('notPicked')} />
          <View style={styles.notPickedRow}>
            {notPicked.map(e => (
              <Image key={e} source={{ uri: getEmojiImageUrl(e) }} style={styles.notPickedEmoji} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  title: {
    fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 4,
  },

  // Section divider
  divider: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, marginBottom: 8,
  },
  dividerLine: {
    flex: 1, height: 1, backgroundColor: colors.border,
  },
  dividerLabel: {
    fontSize: 10, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: radius.md, marginBottom: 5,
  },
  uniqueRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  dupRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.18)',
  },
  meRow: {
    borderWidth: 2, borderColor: colors.primaryLight,
  },

  emoji: { width: 38, height: 38 },

  content: { flex: 1, gap: 2 },
  names: { fontSize: 14, fontWeight: '600', color: colors.text },
  meText: { color: colors.primaryLight, fontWeight: '700' },
  dim: { color: colors.textMuted },

  badge: {
    fontSize: 11, fontWeight: '700', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full,
    overflow: 'hidden',
  },
  uniqueBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)', color: colors.success,
  },
  dupBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)', color: colors.error,
  },

  score: { fontSize: 20, fontWeight: '800' },
  uniqueScore: { color: colors.success },
  dupScore: { color: colors.error },

  // Not picked
  notPickedRow: {
    flexDirection: 'row', gap: 8, paddingVertical: 6, paddingHorizontal: 4,
  },
  notPickedEmoji: { width: 26, height: 26, opacity: 0.3 },
});
