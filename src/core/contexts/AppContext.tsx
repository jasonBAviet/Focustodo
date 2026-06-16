// ============================================================
// FOCUS TO-DO - AppContext
// Manage global Settings and UI state of the app
// ============================================================
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { Settings, ThemeMode } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import useLocalStorage from '@/shared/hooks/useLocalStorage';

// ----------------------------------------------------------
// Context data type
// ----------------------------------------------------------
interface AppContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  isDark: boolean;
  openModal: string | null;
  setOpenModal: (name: string | null) => void;
  isReportOpen: boolean;
  setIsReportOpen: (v: boolean) => void;
  viewMode: 'list' | 'calendar' | 'kg';
  setViewMode: (v: 'list' | 'calendar' | 'kg') => void;
}

// ----------------------------------------------------------
// Initialize Context
// ----------------------------------------------------------
export const AppContext = createContext<AppContextType | null>(null);

// ----------------------------------------------------------
// Function to determine dark mode based on darkMode setting
// ----------------------------------------------------------
function resolveIsDark(darkMode: ThemeMode): boolean {
  if (darkMode === 'dark') return true;
  if (darkMode === 'light') return false;
  // 'auto' mode - depends on user system
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ----------------------------------------------------------
// Provider
// ----------------------------------------------------------
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useLocalStorage<Settings>(
    'focus-settings',
    DEFAULT_SETTINGS,
  );

  // Merge visibleViews so any new view added to DEFAULT_SETTINGS becomes visible
  // for existing users whose stored settings predate the new view.
  const mergedSettings: Settings = {
    ...settings,
    visibleViews: {
      ...DEFAULT_SETTINGS.visibleViews,
      ...settings.visibleViews,
    },
  };

  // One-time migration: force diary and learning visible for users with old stored settings
  useEffect(() => {
    if (!settings.settingsVersion || settings.settingsVersion < 2) {
      setSettings((prev) => ({
        ...prev,
        settingsVersion: 2,
        visibleViews: {
          ...prev.visibleViews,
          diary: true,
          learning: true,
        },
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI state - no need to save to localStorage
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useLocalStorage<'list' | 'calendar' | 'kg'>('focus-view-mode', 'list');

  // Determine isDark from current settings
  const [isDark, setIsDark] = useState<boolean>(() =>
    resolveIsDark(settings.darkMode ?? DEFAULT_SETTINGS.darkMode),
  );

  // --------------------------------------------------------
  // Track darkMode changes from settings
  // --------------------------------------------------------
  useEffect(() => {
    if (mergedSettings.darkMode !== 'auto') {
      setIsDark(mergedSettings.darkMode === 'dark');
      return;
    }

    // Auto mode - listen to system changes
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
  // Apply theme to DOM when isDark changes
  // --------------------------------------------------------
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  // --------------------------------------------------------
  // Update partial settings
  // --------------------------------------------------------
  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [setSettings],
  );

  // --------------------------------------------------------
  // Context value (memoized)
  // --------------------------------------------------------
  const value = useMemo<AppContextType>(
    () => ({
      settings: mergedSettings,
      updateSettings,
      isDark,
      openModal,
      setOpenModal,
      isReportOpen,
      setIsReportOpen,
      viewMode,
      setViewMode,
    }),
    [mergedSettings, updateSettings, isDark, openModal, isReportOpen, viewMode, setViewMode],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ----------------------------------------------------------
// Convenient custom hook
// ----------------------------------------------------------
export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
