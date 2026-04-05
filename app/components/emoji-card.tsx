import React from 'react';
import { Pressable, Image, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors, radius } from '../lib/theme';
import { getEmojiImageUrl } from '../lib/emoji-utils';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface EmojiCardProps {
  emoji: string; // hex codepoint like "1f600"
  selected?: boolean;
  highlighted?: 'unique' | 'duplicate' | null;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
}

export function EmojiCard({
  emoji,
  selected = false,
  highlighted = null,
  onPress,
  size = 48,
  disabled = false,
}: EmojiCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const bgColor = highlighted === 'unique'
    ? colors.successDark
    : highlighted === 'duplicate'
      ? colors.errorDark
      : selected
        ? colors.primary
        : colors.bgCardLight;

  const borderColor = highlighted === 'unique'
    ? colors.success
    : highlighted === 'duplicate'
      ? colors.error
      : selected
        ? colors.primaryLight
        : colors.border;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.card,
        animStyle,
        {
          width: size + 24,
          height: size + 24,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: selected || highlighted ? 2.5 : 1,
        },
      ]}
    >
      <Image
        source={{ uri: getEmojiImageUrl(emoji) }}
        style={{ width: size, height: size }}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
});
