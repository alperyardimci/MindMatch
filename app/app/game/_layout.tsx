import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../lib/theme';

export default function GameLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade_from_bottom',
      }}
    />
  );
}
