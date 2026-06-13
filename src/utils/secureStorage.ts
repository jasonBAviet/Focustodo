// secureStorage.ts
// Wrapper luu tru an toan, tu dong dung Capacitor Preferences tren mobile
// va localStorage tren web. Giao dien thong nhat cho ca hai moi truong.

import { isNativeMobile } from '@/utils/capacitorConfig';

const TOKEN_KEY = 'focustodo_token';

// Lazy import Capacitor Preferences de tranh loi khi chay tren web
async function getPreferences() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

/**
 * Luu token JWT vao luu tru an toan.
 * - Native (Android/iOS): Capacitor Preferences (du lieu duoc ma hoa boi OS)
 * - Web: localStorage (dong hanh voi code cu, khong the pha vo)
 */
export async function saveToken(token: string): Promise<void> {
  if (isNativeMobile()) {
    const Preferences = await getPreferences();
    await Preferences.set({ key: TOKEN_KEY, value: token });
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Doc token JWT tu luu tru an toan.
 * Tra ve null neu chua dang nhap.
 */
export async function loadToken(): Promise<string | null> {
  if (isNativeMobile()) {
    const Preferences = await getPreferences();
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  } else {
    return localStorage.getItem(TOKEN_KEY);
  }
}

/**
 * Xoa token JWT (dang xuat).
 */
export async function clearToken(): Promise<void> {
  if (isNativeMobile()) {
    const Preferences = await getPreferences();
    await Preferences.remove({ key: TOKEN_KEY });
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Doc token dong bo (sync) - dung cho cac noi can truy cap ngay
 * ma khong the dung async (vi du: khoi tao state ban dau).
 * Tren native, lan dau se tra ve null; token se duoc load async sau do.
 */
export function loadTokenSync(): string | null {
  // Tren native, khong the doc sync - phai dung loadToken() async
  if (isNativeMobile()) return null;
  return localStorage.getItem(TOKEN_KEY);
}
