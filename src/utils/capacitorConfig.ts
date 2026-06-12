// capacitorConfig.ts
// Cung cap cac tien ich phat hien moi truong Capacitor va lay URL backend dung

import { Capacitor } from '@capacitor/core';

/**
 * Kiem tra xem ung dung co dang chay trong Capacitor native (Android/iOS) khong.
 * Tra ve false khi chay tren trinh duyet web thong thuong.
 */
export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Lay URL goc cua API backend phu hop voi moi truong hien tai.
 *
 * - Moi truong web (Vite dev server): su dung VITE_BACKEND_URL hoac '' (proxy)
 * - Moi truong Capacitor native: su dung VITE_CAPACITOR_BACKEND_URL
 *   (la dia chi IP/domain cua server, vi du: http://192.168.1.x:4000)
 *
 * Cach cau hinh:
 *   Them vao file .env.local (khong commit):
 *     VITE_CAPACITOR_BACKEND_URL=http://192.168.1.100:4000
 */
export function getApiBaseUrl(): string {
  if (isNativeMobile()) {
    const mobileUrl = import.meta.env.VITE_CAPACITOR_BACKEND_URL;
    if (!mobileUrl) {
      console.warn(
        '[CapacitorConfig] Chua cau hinh VITE_CAPACITOR_BACKEND_URL.\n' +
        'Them bien nay vao .env.local voi dia chi IP server cua ban.\n' +
        'Vi du: VITE_CAPACITOR_BACKEND_URL=http://192.168.1.100:4000'
      );
    }
    return mobileUrl || '';
  }
  // Moi truong web: dung proxy cua Vite hoac bien VITE_BACKEND_URL
  return import.meta.env.VITE_BACKEND_URL || '';
}

/**
 * Lay ten nen tang hien tai de hien thi hoac log.
 */
export function getPlatformName(): 'android' | 'ios' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') return 'android';
  if (platform === 'ios') return 'ios';
  return 'web';
}
