// ============================================================
// FOCUS TO-DO - AppearanceSettings
// Tab Appearance - Dark Mode + Theme Wallpaper selection
// ============================================================
import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import type { ThemeMode } from '../../types';

// ----------------------------------------------------------
// Cau hinh wallpaper
// ----------------------------------------------------------
interface WallpaperItem {
  id: string;
  label: string;
  gradient: string;
}

const WALLPAPERS: WallpaperItem[] = [
  {
    id: 'dark-forest',
    label: 'Dark Forest',
    gradient: 'linear-gradient(135deg, #0d1f0f 0%, #1a3a1e 40%, #0a1a0c 100%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    gradient: 'linear-gradient(135deg, #006994 0%, #0099aa 50%, #004e7c 100%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    gradient: 'linear-gradient(135deg, #1b4332 0%, #40916c 50%, #081c15 100%)',
  },
  {
    id: 'mountain',
    label: 'Mountain',
    gradient: 'linear-gradient(135deg, #2d1b69 0%, #11998e 50%, #1a0a2e 100%)',
  },
];

// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
const sectionLabelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10,
  marginTop: 20,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  outline: 'none',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
};

// ----------------------------------------------------------
// Component wallpaper thumbnail
// ----------------------------------------------------------
interface WallpaperCardProps {
  item: WallpaperItem;
  selected: boolean;
  onClick: () => void;
}

const WallpaperCard: React.FC<WallpaperCardProps> = ({ item, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={item.label}
    style={{
      position: 'relative',
      height: 80,
      borderRadius: 'var(--radius-md)',
      border: selected ? '2px solid var(--accent)' : '2px solid transparent',
      background: item.gradient,
      cursor: 'pointer',
      overflow: 'hidden',
      transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
      outline: 'none',
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)'; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
  >
    {/* Label ben duoi */}
    <span style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '4px 8px',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      fontSize: 11,
      textAlign: 'left',
      fontWeight: 500,
    }}>
      {item.label}
    </span>

    {/* Checkmark khi duoc chon - goc phai duoi */}
    {selected && (
      <span style={{
        position: 'absolute',
        bottom: 24,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'var(--accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )}
  </button>
);

// ----------------------------------------------------------
// Component chinh
// ----------------------------------------------------------
const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();

  const handleDarkModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ darkMode: e.target.value as ThemeMode });
  };

  const handleWallpaperSelect = (id: string) => {
    updateSettings({ themeWallpaper: id });
  };

  return (
    <div>
      {/* Dark Mode */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 6 }}>
          Chế độ hiển thị
        </label>
        <select style={selectStyle} value={settings.darkMode} onChange={handleDarkModeChange}>
          <option value="light">Sáng</option>
          <option value="dark">Tối</option>
          <option value="auto">Tự động (theo hệ thống)</option>
        </select>
      </div>

      {/* Theme Wallpaper */}
      <div style={sectionLabelStyle}>Chủ đề</div>
      <div style={gridStyle}>
        {WALLPAPERS.map((wp) => (
          <WallpaperCard
            key={wp.id}
            item={wp}
            selected={settings.themeWallpaper === wp.id}
            onClick={() => handleWallpaperSelect(wp.id)}
          />
        ))}
      </div>

      {/* Thong tin them */}
      <div style={{ marginTop: 20, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Hình nền sẽ được áp dụng làm nền màn hình chính của ứng dụng.
      </div>
    </div>
  );
};

export default AppearanceSettings;
