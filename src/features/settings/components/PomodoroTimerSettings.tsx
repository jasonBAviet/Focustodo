// ============================================================
// FOCUS TO-DO - PomodoroTimerSettings
// Pomodoro Timer Tab in Settings
// ============================================================
import React from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import Toggle from '@/shared/components/Toggle';

// ----------------------------------------------------------
// Inline styles used for settings
// ----------------------------------------------------------
const sectionStyle: React.CSSProperties = {
  marginBottom: 20,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  color: 'var(--text-secondary)',
  marginBottom: 6,
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

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  marginBottom: 16,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--divider)',
  margin: '16px 0',
};

const toggleRowStyle: React.CSSProperties = {
  marginBottom: 14,
};

// ----------------------------------------------------------
// Options for each dropdown
// ----------------------------------------------------------
const POMODORO_OPTS = [5, 10, 15, 20, 25, 30, 45, 60];
const SHORT_BREAK_OPTS = [1, 2, 5, 10, 15];
const LONG_BREAK_OPTS = [10, 15, 20, 30];
const LONG_BREAK_AFTER_OPTS = [2, 3, 4, 5, 6];

// ----------------------------------------------------------
// Subcomponent: Simple select row
// ----------------------------------------------------------
interface SelectFieldProps {
  label: string;
  value: number;
  options: number[];
  unit: string;
  onChange: (val: number) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, unit, onChange }) => (
  <div>
    <label style={labelStyle}>{label}</label>
    <select
      style={selectStyle}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt} {unit}
        </option>
      ))}
    </select>
  </div>
);

// ----------------------------------------------------------
// Main component
// ----------------------------------------------------------
const PomodoroTimerSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();

  return (
    <div>
      {/* Group 1: Duration */}
      <div style={sectionStyle}>
        <div style={rowStyle}>
          <SelectField
            label="Pomodoro Length"
            value={settings.pomodoroLength}
            options={POMODORO_OPTS}
            unit="minutes"
            onChange={(v) => updateSettings({ pomodoroLength: v })}
          />
          <SelectField
            label="Short Break Length"
            value={settings.shortBreakLength}
            options={SHORT_BREAK_OPTS}
            unit="minutes"
            onChange={(v) => updateSettings({ shortBreakLength: v })}
          />
        </div>

        <div style={rowStyle}>
          <SelectField
            label="Long Break Length"
            value={settings.longBreakLength}
            options={LONG_BREAK_OPTS}
            unit="minutes"
            onChange={(v) => updateSettings({ longBreakLength: v })}
          />
          <SelectField
            label="Long Break After"
            value={settings.longBreakAfter}
            options={LONG_BREAK_AFTER_OPTS}
            unit="pomodoros"
            onChange={(v) => updateSettings({ longBreakAfter: v })}
          />
        </div>
      </div>

      <div style={dividerStyle} />

      {/* Group 2: Auto start toggles */}
      <div style={sectionStyle}>
        <div style={toggleRowStyle}>
          <Toggle
            checked={settings.autoStartNextPomodoro}
            onChange={(v) => updateSettings({ autoStartNextPomodoro: v })}
            label="Auto Start of Next Pomodoro"
          />
        </div>
        <div style={toggleRowStyle}>
          <Toggle
            checked={settings.autoStartBreak}
            onChange={(v) => updateSettings({ autoStartBreak: v })}
            label="Auto Start of Break"
          />
        </div>
        <div style={toggleRowStyle}>
          <Toggle
            checked={settings.disableBreak}
            onChange={(v) => updateSettings({ disableBreak: v })}
            label="Disable Break"
          />
        </div>
      </div>

      <div style={dividerStyle} />

      {/* Group 3: Alarm */}
      <div style={sectionStyle}>
        <div style={toggleRowStyle}>
          <Toggle
            checked={settings.alarmSound}
            onChange={(v) => updateSettings({ alarmSound: v })}
            label="Alarm Sound"
          />
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimerSettings;
