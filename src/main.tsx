import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';

// Dang ky Service Worker PWA
// autoUpdate: tu dong cap nhat SW khi co phien ban moi
const updateSW = registerSW({
  onNeedRefresh() {
    // Co phien ban moi cua ung dung, yeu cau tai lai trang
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
