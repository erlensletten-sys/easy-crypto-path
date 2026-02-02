import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import no from './locales/no.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      no: { translation: no }
    },
    lng: 'no', // Default to Norwegian
    fallbackLng: 'no',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
