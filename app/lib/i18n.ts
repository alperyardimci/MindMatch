import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

const LANGUAGE_KEY = '@mindmatch_language';

export async function getSavedLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export async function saveLanguage(lang: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // ignore
  }
}

const deviceLang = Localization.getLocales()[0]?.languageCode || 'en';
const defaultLang = deviceLang === 'tr' ? 'tr' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Load saved preference
getSavedLanguage().then(lang => {
  if (lang) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
