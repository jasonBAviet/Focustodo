// ============================================================
// FOCUS TO-DO - AppContext
// Quản lý Settings toàn cục và trạng thái UI của ứng dụng
// ============================================================
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { Settings, ThemeMode } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { loadRemoteAppState, saveRemoteAppState } from '../utils/remoteState';

// ----------------------------------------------------------
// Kiểu dữ liệu Context
// ----------------------------------------------------------
interface AppContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  isDark: boolean;
  openModal: string | null;
  setOpenModal: (name: string | null) => void;
  isReportOpen: boolean;
  setIsReportOpen: (v: boolean) => void;
}

// ----------------------------------------------------------
// Khởi tạo Context
// ----------------------------------------------------------
export const AppContext = createContext<AppContextType | null>(null);

// ----------------------------------------------------------
// Hàm xác định chế độ tối dựa trên cài đặt darkMode
// ----------------------------------------------------------
function resolveIsDark(darkMode: ThemeMode): boolean {
  if (darkMode === 'dark') return true;
  if (darkMode === 'light') return false;
  // Chế độ 'auto' - phụ thuộc vào hệ thống người dùng
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ----------------------------------------------------------
// Provider
// ----------------------------------------------------------
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState<boolean>(false);

  // Load state từ backend
  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const state = await loadRemoteAppState();
        if (mounted && state && state.settings) {
          setSettings({ ...DEFAULT_SETTINGS, ...state.settings });
        }
        if (mounted) setRemoteSyncEnabled(true);
      } catch (error) {
        console.warn('Failed to load settings from DB:', error);
      }
    }
    loadSettings();
    return () => { mounted = false; };
  }, []);

  // Save state tới backend khi thay đổi
  useEffect(() => {
    if (!remoteSyncEnabled) return;
    const timeoutId = window.setTimeout(() => {
      saveRemoteAppState({ settings }).catch(e => console.warn('Failed to save settings to DB:', e));
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [settings, remoteSyncEnabled]);

  // Trạng thái UI - không cần lưu localStorage
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Xác định isDark từ settings hiện tại
  const [isDark, setIsDark] = useState<boolean>(() =>
    resolveIsDark(settings.darkMode),
  );

  // --------------------------------------------------------
  // Theo dõi thay đổi darkMode từ settings
  // --------------------------------------------------------
  useEffect(() => {
    if (settings.darkMode !== 'auto') {
      setIsDark(settings.darkMode === 'dark');
      return;
    }

    // Chế độ auto - lắng nghe thay đổi từ hệ thống
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [settings.darkMode]);

  // --------------------------------------------------------
  // Áp dụng theme vào DOM khi isDark thay đổi
  // --------------------------------------------------------
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  // --------------------------------------------------------
  // Cập nhật một phần settings
  // --------------------------------------------------------
  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [],
  );

  // --------------------------------------------------------
  // Giá trị Context (memoized)
  // --------------------------------------------------------
  const value = useMemo<AppContextType>(
    () => ({
      settings,
      updateSettings,
      isDark,
      openModal,
      setOpenModal,
      isReportOpen,
      setIsReportOpen,
    }),
    [settings, updateSettings, isDark, openModal, isReportOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ----------------------------------------------------------
// Custom hook tiện lợi
// ----------------------------------------------------------
export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext phải được dùng bên trong AppProvider');
  }
  return ctx;
}
