import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  // Gunakan backend untuk memuat file terjemahan secara dinamis dari folder public/locales
  .use(Backend)
  // Deteksi bahasa pengguna (dari URL, LocalStorage, atau Browser)
  .use(LanguageDetector)
  // Mengirim instance i18n ke react-i18next
  .use(initReactI18next)
  .init({
    fallbackLng: 'en', // Jika terjemahan tidak ditemukan, kembali ke bahasa Inggris
    debug: false,
    
    // Konfigurasi detektor bahasa
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang', // Memungkinkan ?lang=id di URL untuk SEO
      caches: ['localStorage'], // Simpan preferensi bahasa pengguna
    },

    interpolation: {
      escapeValue: false, // React sudah aman dari XSS
    },

    backend: {
      loadPath: '/locales/{{lng}}/translation.json', // Path ke file terjemahan
    }
  });

export default i18n;
