import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ar from './ar/translation.json';
import en from './en/translation.json';

export const LANGUAGE_STORAGE_KEY = '@citymarket_courier_language';
export type AppLanguage = 'ar' | 'en';

const resources = {
  ar: { translation: ar },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar', // Arabic default as requested
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

/** Applies a language: translations immediately, layout direction from the next launch. */
export const applyLanguage = async (lang: AppLanguage) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch(() => {});
  if (i18n.language !== lang) await i18n.changeLanguage(lang);
  const rtl = lang === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    return true; // direction changes after a restart
  }
  return false;
};

/** Restores the saved language at startup (Arabic by default). */
export const restoreLanguage = async () => {
  const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).catch(() => null);
  const lang: AppLanguage = saved === 'en' ? 'en' : 'ar';
  if (i18n.language !== lang) await i18n.changeLanguage(lang);
  const rtl = lang === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
};

export default i18n;
