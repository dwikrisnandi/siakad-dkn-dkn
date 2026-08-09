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

// Sinkronisasi otomatis dengan Google Translate
i18n.on('languageChanged', (lng) => {
  // Google Translate menggunakan 'zh-CN' untuk bahasa mandarin
  const gLng = lng === 'zh' ? 'zh-CN' : (lng === 'id' ? 'id' : lng);
  
  // Set Cookie agar Google Translate otomatis translate saat load
  document.cookie = `googtrans=/id/${gLng}; path=/`;
  document.cookie = `googtrans=/id/${gLng}; domain=${window.location.hostname}; path=/`;

  // Mencari dropdown bawaan google translate jika script sudah jalan
  const googleSelect = document.querySelector('.goog-te-combo');
  if (googleSelect) {
    googleSelect.value = gLng;
    googleSelect.dispatchEvent(new Event('change'));
  } else if (gLng !== 'id') {
    // Jika dropdown belum ada (script belum load), reload halaman agar cookie terbaca
    // Tapi tunggu sebentar agar tidak infinite loop, atau biarkan Google membaca cookie saat inisialisasi
  }
});

export default i18n;
