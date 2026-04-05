import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  FadeInDown,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { LanguagePicker } from '../components/language-picker';
import { useGame } from '../hooks/use-game';
import { getEmojiImageUrl } from '../lib/emoji-utils';
import { DEFAULT_TARGET_SCORE } from '../lib/constants';
import { colors, radius, spacing } from '../lib/theme';

const { width: W } = Dimensions.get('window');

const FLOAT_EMOJIS = ['1f9e0','1f4a1','1f3af','1f3b2','1f0cf','1f52e','26a1','1f31f','1f3ad','1f3aa'];

function FloatingEmoji({ code, delay, x }: { code: string; delay: number; x: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.2, { duration: 1000 }));
    translateY.value = withDelay(delay,
      withRepeat(withSequence(withTiming(-18, { duration: 2500 }), withTiming(18, { duration: 2500 })), -1, true));
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }], opacity: opacity.value }));
  return (
    <Animated.View style={[{ position: 'absolute', top: '20%', left: x }, style]}>
      <Image source={{ uri: getEmojiImageUrl(code) }} style={{ width: 36, height: 36 }} />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { randomPlay, createRoom, joinRoom } = useGame();

  const [name, setName] = useState('');
  const [modal, setModal] = useState<'random' | 'create' | 'join' | null>(null);
  const [target, setTarget] = useState(String(DEFAULT_TARGET_SCORE));
  const [code, setCode] = useState('');

  const handleRandom = () => { setModal(null); randomPlay(name.trim() || 'Player'); router.push('/game/play'); };
  const handleCreate = () => { setModal(null); createRoom(name.trim() || 'Host', parseInt(target) || DEFAULT_TARGET_SCORE); router.push('/game/lobby'); };
  const handleJoin = () => { if (!code.trim()) return; setModal(null); joinRoom(name.trim() || 'Player', code.trim()); router.push('/game/lobby'); };

  return (
    <View style={styles.container}>
      {FLOAT_EMOJIS.map((e, i) => (
        <FloatingEmoji key={i} code={e} delay={i * 400} x={((i * 73) % (W - 50)) + 10 + W * 0.05} />
      ))}

      <SafeAreaView style={styles.safe}>
        <Animated.View entering={FadeIn.delay(200)} style={styles.topBar}>
          <View style={{ width: 80 }} />
          <View style={{ flex: 1 }} />
          <LanguagePicker />
        </Animated.View>

        <View style={styles.hero}>
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Image source={{ uri: getEmojiImageUrl('1f9e0') }} style={styles.logoImg} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(400).springify()} style={styles.title}>
            {t('appName')}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(500).springify()} style={styles.tagline}>
            {t('tagline')}
          </Animated.Text>
        </View>

        <View style={styles.buttons}>
          <Animated.View entering={FadeInUp.delay(600).springify()}>
            <Pressable style={({ pressed }) => [styles.btn, styles.btnRandom, pressed && styles.pressed]} onPress={() => setModal('random')}>
              <Image source={{ uri: getEmojiImageUrl('1f3b2') }} style={styles.btnIcon} />
              <View>
                <Text style={styles.btnTitle}>{t('randomPlay')}</Text>
                <Text style={styles.btnSub}>5 {t('players')}</Text>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(700).springify()}>
            <Pressable style={({ pressed }) => [styles.btn, styles.btnCreate, pressed && styles.pressed]} onPress={() => setModal('create')}>
              <Image source={{ uri: getEmojiImageUrl('1f3e0') }} style={styles.btnIcon} />
              <View>
                <Text style={styles.btnTitle}>{t('createRoom')}</Text>
                <Text style={styles.btnSub}>{t('shareCode')}</Text>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(800).springify()}>
            <Pressable style={({ pressed }) => [styles.btn, styles.btnJoin, pressed && styles.pressed]} onPress={() => setModal('join')}>
              <Image source={{ uri: getEmojiImageUrl('1f680') }} style={styles.btnIcon} />
              <View>
                <Text style={styles.btnTitle}>{t('joinRoom')}</Text>
                <Text style={styles.btnSub}>{t('enterRoomCode')}</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>

      {/* Bottom sheet modal */}
      <Modal visible={modal !== null} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <Pressable style={styles.overlayBg} onPress={() => setModal(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {modal === 'random' ? t('randomPlay') : modal === 'create' ? t('createRoom') : t('joinRoom')}
            </Text>

            <Text style={styles.inputLabel}>{t('enterName')}</Text>
            <TextInput
              style={styles.input} placeholder="Player" placeholderTextColor={colors.textMuted}
              value={name} onChangeText={setName} maxLength={12} autoFocus
            />

            {modal === 'create' && (
              <>
                <Text style={styles.inputLabel}>{t('targetScore')}</Text>
                <View style={styles.scoreRow}>
                  <Pressable style={styles.scoreBtn} onPress={() => setTarget(String(Math.max(1, (parseInt(target) || 5) - 1)))}>
                    <Text style={styles.scoreBtnText}>-</Text>
                  </Pressable>
                  <TextInput
                    style={[styles.input, styles.scoreInput]} value={target}
                    onChangeText={setTarget} keyboardType="number-pad" maxLength={2}
                  />
                  <Pressable style={styles.scoreBtn} onPress={() => setTarget(String(Math.min(50, (parseInt(target) || 5) + 1)))}>
                    <Text style={styles.scoreBtnText}>+</Text>
                  </Pressable>
                </View>
              </>
            )}

            {modal === 'join' && (
              <>
                <Text style={styles.inputLabel}>{t('roomCode')}</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]} placeholder="XXXX"
                  placeholderTextColor={colors.textMuted} value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())} maxLength={4} autoCapitalize="characters"
                />
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.sheetBtn, pressed && styles.pressed, modal === 'join' && !code.trim() && styles.disabled]}
              onPress={modal === 'random' ? handleRandom : modal === 'create' ? handleCreate : handleJoin}
              disabled={modal === 'join' && !code.trim()}
            >
              <Text style={styles.sheetBtnText}>{modal === 'join' ? t('join') : t('confirm')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 20 },
  logoImg: { width: 88, height: 88, marginBottom: spacing.sm },
  title: { fontSize: 42, fontWeight: '900', color: colors.text, letterSpacing: 2 },
  tagline: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.xs, letterSpacing: 0.5 },
  buttons: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.xl, gap: 16, borderWidth: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  btnRandom: { backgroundColor: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.4)' },
  btnCreate: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
  btnJoin: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)' },
  btnIcon: { width: 36, height: 36 },
  btnTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  btnSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bgOverlay },
  sheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xxl, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginLeft: 4 },
  input: { backgroundColor: colors.bgCardLight, borderRadius: radius.md, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  codeInput: { fontSize: 28, fontWeight: '800', textAlign: 'center', letterSpacing: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.md },
  scoreBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  scoreBtnText: { fontSize: 24, fontWeight: '700', color: colors.text },
  scoreInput: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '800' },
  sheetBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: radius.lg, alignItems: 'center', marginTop: spacing.sm },
  sheetBtnText: { fontSize: 17, fontWeight: '700', color: colors.text },
  disabled: { opacity: 0.4 },
});
