import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Khoi tao React truoc - registerSW chi duoc goi sau khi app da render
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Dang ky Service Worker SAU khi React da mount
// Goi tach biet de tranh xung dot module trong qua trinh khoi tao
if ('serviceWorker' in navigator) {
  // Dung import() dong de tranh top-level module conflict
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      onNeedRefresh() {
        if (window.confirm('Co phien ban moi cua Focus Todo. Tai lai de cap nhat?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        console.log('[PWA] Ung dung san sang hoat dong ngoai tuyen!');
      },
      onRegistered(registration) {
        console.log('[PWA] Service Worker da dang ky thanh cong:', registration);
      },
      onRegisterError(error) {
        console.error('[PWA] Loi dang ky Service Worker:', error);
      },
    });
  }).catch((err) => {
    // Bo qua loi trong moi truong dev khi PWA bi tat
    if (import.meta.env.DEV) return;
    console.error('[PWA] Khong the tai module dang ky SW:', err);
  });
}
