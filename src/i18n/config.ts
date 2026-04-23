import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en/translation.json';
import ar from '../locales/ar/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Handle RTL transition on language change
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

export default i18n;
