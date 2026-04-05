import React from 'react';
import { Pressable, Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { saveLanguage } from '../lib/i18n';
import { getEmojiImageUrl } from '../lib/emoji-utils';
import { colors, radius } from '../lib/theme';

// Flag codepoints: Turkey = 1f1f9-1f1f7, UK = 1f1ec-1f1e7
const TR_FLAG = '1f1f9-1f1f7';
const GB_FLAG = '1f1ec-1f1e7';

export function LanguagePicker() {
  const { i18n } = useTranslation();
  const isTR = i18n.language === 'tr';

  const toggle = async () => {
    const next = isTR ? 'en' : 'tr';
    await i18n.changeLanguage(next);
    await saveLanguage(next);
  };

  return (
    <Pressable onPress={toggle} style={styles.wrap}>
      <View style={[styles.option, isTR && styles.active]}>
        <Image source={{ uri: getEmojiImageUrl(TR_FLAG) }} style={styles.flag} />
      </View>
      <View style={styles.divider} />
      <View style={[styles.option, !isTR && styles.active]}>
        <Image source={{ uri: getEmojiImageUrl(GB_FLAG) }} style={styles.flag} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.full,
    padding: 3, borderWidth: 1, borderColor: colors.border,
  },
  option: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full, opacity: 0.4 },
  active: { opacity: 1, backgroundColor: colors.bgCardLight },
  divider: { width: 1, height: 20, backgroundColor: colors.border },
  flag: { width: 24, height: 24 },
});
