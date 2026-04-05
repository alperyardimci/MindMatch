import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { RoundResult } from '../types/game';
import { useTranslation } from 'react-i18next';
import { getSocket } from '../lib/socket';
import { colors, radius, spacing } from '../lib/theme';
import { getEmojiImageUrl } from '../lib/emoji-utils';

interface RoundResultViewProps {
  result: RoundResult;
}

export function RoundResultView({ result }: RoundResultViewProps) {
  const { t } = useTranslation();
  const socket = getSocket();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('round')} {result.roundNumber}</Text>
      <Text style={styles.subtitle}>{t('results')}</Text>

      <View style={styles.list}>
        {result.results.map((r) => {
          const isMe = r.playerId === socket.id;
          return (
            <View
              key={r.playerId}
              style={[
                styles.row,
                r.scoredPoint ? styles.uniqueRow : styles.dupRow,
                isMe && styles.myRow,
              ]}
            >
              <Image
                source={{ uri: getEmojiImageUrl(r.emoji) }}
                style={styles.emoji}
              />
              <View style={styles.info}>
                <Text style={[styles.name, isMe && styles.myText]}>
                  {r.name}{isMe ? ` (${t('you')})` : ''}
                </Text>
                <Text style={[
                  styles.badge,
                  r.scoredPoint ? styles.uniqueBadge : styles.dupBadge,
                ]}>
                  {r.scoredPoint ? `+1 ${t('uniquePick')}` : t('duplicatePick')}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  uniqueRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dupRow: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  myRow: {
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  emoji: {
    width: 36,
    height: 36,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  myText: {
    color: colors.primaryLight,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  uniqueBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: colors.success,
  },
  dupBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: colors.error,
  },
});
