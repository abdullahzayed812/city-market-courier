import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import ar from './ar/translation.json';
import en from './en/translation.json';

const resources = {
    ar: { translation: ar },
    en: { translation: en },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'ar', // Set Arabic as default
        fallbackLng: 'ar',
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
