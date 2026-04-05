import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { EmojiCard } from './emoji-card';
import { PlayerRoundResult } from '../types/game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EmojiGridProps {
  emojis: string[];
  selectedEmoji: string | null;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  roundResults?: PlayerRoundResult[] | null;
  myId?: string;
}

export function EmojiGrid({
  emojis,
  selectedEmoji,
  onSelect,
  disabled = false,
  roundResults = null,
}: EmojiGridProps) {
  const count = emojis.length;
  const columns = count <= 3 ? count : count <= 6 ? 3 : 4;
  const cardSize = Math.min(48, (SCREEN_WIDTH - 80) / columns - 34);

  function getHighlight(emoji: string): 'unique' | 'duplicate' | null {
    if (!roundResults) return null;
    const resultsForEmoji = roundResults.filter(r => r.emoji === emoji);
    if (resultsForEmoji.length === 0) return null;
    if (resultsForEmoji.some(r => r.scoredPoint)) return 'unique';
    return 'duplicate';
  }

  return (
    <View style={[styles.grid, { maxWidth: columns * (cardSize + 34) + 20 }]}>
      {emojis.map((emoji, index) => (
        <EmojiCard
          key={`${emoji}-${index}`}
          emoji={emoji}
          selected={selectedEmoji === emoji}
          highlighted={getHighlight(emoji)}
          onPress={() => onSelect(emoji)}
          size={cardSize}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
});
