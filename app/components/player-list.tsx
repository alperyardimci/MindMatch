import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Player } from '../types/game';
import { useTranslation } from 'react-i18next';
import { getSocket } from '../lib/socket';
import { getEmojiImageUrl } from '../lib/emoji-utils';
import { colors, radius, spacing } from '../lib/theme';

interface PlayerListProps {
  players: Player[];
  targetScore: number;
  compact?: boolean;
}

export function PlayerList({ players, targetScore, compact = false }: PlayerListProps) {
  const { t } = useTranslation();
  const socket = getSocket();
  const sorted = [...players].sort((a, b) => b.score - a.score);

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        {sorted.map((p, i) => {
          const isMe = p.id === socket.id;
          const progress = Math.min(1, p.score / targetScore);
          return (
            <View key={p.id} style={styles.compactRow}>
              <Text style={[styles.compactRank, i === 0 && p.score > 0 && styles.topRank]}>
                {i + 1}
              </Text>
              <Image
                source={{ uri: getEmojiImageUrl('1f464') }}
                style={styles.miniIcon}
              />
              <Text style={[styles.compactName, isMe && styles.myName]} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={styles.barOuter}>
                <View style={[styles.barInner, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.compactScore}>{p.score}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  const MEDALS = ['1f947', '1f948', '1f949']; // gold, silver, bronze

  return (
    <View style={styles.fullWrap}>
      {sorted.map((p, i) => {
        const isMe = p.id === socket.id;
        return (
          <View key={p.id} style={[styles.fullRow, isMe && styles.myRow]}>
            {i < 3 ? (
              <Image source={{ uri: getEmojiImageUrl(MEDALS[i]) }} style={styles.medalImg} />
            ) : (
              <Text style={styles.rankNum}>{i + 1}</Text>
            )}
            <View style={styles.nameWrap}>
              <Text style={[styles.fullName, isMe && styles.myName]}>
                {p.name}
              </Text>
              {isMe && <Text style={styles.youTag}>{t('you')}</Text>}
            </View>
            <Text style={styles.fullScore}>{p.score}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  compactWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 6 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compactRank: { fontSize: 12, fontWeight: '700', color: colors.textMuted, width: 16, textAlign: 'center' },
  topRank: { color: colors.gold },
  miniIcon: { width: 16, height: 16 },
  compactName: { fontSize: 13, color: colors.textSecondary, width: 60 },
  myName: { fontWeight: '700', color: colors.primaryLight },
  barOuter: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  barInner: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  compactScore: { fontSize: 14, fontWeight: '800', color: colors.text, width: 24, textAlign: 'right' },
  fullWrap: { gap: 8, paddingVertical: spacing.sm },
  fullRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  myRow: { borderColor: colors.primary, backgroundColor: colors.bgCardLight },
  medalImg: { width: 28, height: 28 },
  rankNum: { fontSize: 18, fontWeight: '700', color: colors.textMuted, width: 28, textAlign: 'center' },
  nameWrap: { flex: 1, marginLeft: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullName: { fontSize: 16, color: colors.text },
  youTag: {
    fontSize: 10, fontWeight: '700', color: colors.primary,
    backgroundColor: colors.bgCardLight, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary, overflow: 'hidden',
  },
  fullScore: { fontSize: 24, fontWeight: '800', color: colors.accent },
});
