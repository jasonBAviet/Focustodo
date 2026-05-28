// ============================================================
// FOCUS TO-DO - GeneralSettings
// Tab General - Xuat/Nhap du lieu, Focus Goal, Thong tin app
// ============================================================
import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useTaskContext } from '../../contexts/TaskContext';
import type { Priority } from '../../types';

// ----------------------------------------------------------
// Styles
// ----------------------------------------------------------
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 12,
  marginTop: 20,
};

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
  marginRight: 10,
};

const btnPrimaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'var(--accent)',
  color: 'var(--text-on-accent)',
  border: '1px solid var(--accent)',
};

const inputStyle: React.CSSProperties = {
  width: 100,
  padding: '7px 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  textAlign: 'right',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--divider)',
  margin: '16px 0',
};

const infoRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  fontSize: 'var(--text-sm)',
  borderBottom: '1px solid var(--divider)',
};

// ----------------------------------------------------------
// Component chinh
// ----------------------------------------------------------
const GeneralSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const { tasks, addTask } = useTaskContext();

// ----------------------------------------------------------
  // Tao du lieu mockup
  // ----------------------------------------------------------
  const handleGenerateMockData = () => {
    const projects = ['inbox', 'work', 'study', 'personal'];
    const priorities: Priority[] = ['none', 'low', 'medium', 'high'];
    for (let i = 1; i <= 100; i++) {
      const title = `Task Mockup ${i}`;
      const proj = projects[Math.floor(Math.random() * projects.length)];
      const prio = priorities[Math.floor(Math.random() * priorities.length)];
      const estimate = Math.floor(Math.random() * 8) + 1; // 1 den 8 pomodoro
      addTask(title, proj, prio, estimate);
    }
    alert('Đã tạo thành công 100 task mockup!');
  };

  // ----------------------------------------------------------
  // Focus Goal
  // ----------------------------------------------------------
  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0) {
      updateSettings({ dailyFocusGoalHours: val });
    }
  };

  return (
    <div>
      {/* Section Du lieu */}
      <div style={sectionTitleStyle}>Dữ liệu</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" style={btnPrimaryStyle} onClick={handleGenerateMockData}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M12 4v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4m10 0V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2m10 0h-10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Tạo Mockup 100 Tasks
        </button>
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
        Hiện có {tasks.length} task trong hệ thống.
      </div>

      <div style={dividerStyle} />

      {/* Section Focus Goal */}
      <div style={sectionTitleStyle}>Mục tiêu Focus</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flex: 1 }}>
          Mục tiêu focus hàng ngày
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            min={0}
            max={24}
            step={0.5}
            style={inputStyle}
            value={settings.dailyFocusGoalHours}
            onChange={handleGoalChange}
          />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>giờ/ngày</span>
        </div>
      </div>

      <div style={{ ...dividerStyle, marginTop: 20 }} />

      {/* Section Thong tin */}
      <div style={sectionTitleStyle}>Thông tin ứng dụng</div>

      <div>
        <div style={infoRowStyle}>
          <span style={{ color: 'var(--text-secondary)' }}>Phiên bản</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>1.0.0</span>
        </div>
        <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
          <span style={{ color: 'var(--text-secondary)' }}>GitHub</span>
          <a
            href="https://github.com/focus-todo"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}
          >
            github.com/focus-todo
          </a>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
