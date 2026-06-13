// ============================================================
// FOCUS TO-DO - ProjectsSettings
// Tab Projects - toggle hien thi smart views + quan ly projects
// ============================================================
import React, { useState } from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useTaskContext } from '@/features/tasks/TaskContext';
import Toggle from '@/shared/components/Toggle';

// ----------------------------------------------------------
// Kieu du lieu Smart View
// ----------------------------------------------------------
interface SmartViewItem {
  key: string;
  label: string;
  color: string;
  iconPath: string;
}

const SMART_VIEWS: SmartViewItem[] = [
  { key: 'today',           label: 'Today',           color: '#f25f5c', iconPath: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm0 3v4l2 1.5' },
  { key: 'tomorrow',        label: 'Tomorrow',        color: '#f4a261', iconPath: 'M3 8h10M9 4l4 4-4 4' },
  { key: 'this-week',       label: 'This Week',       color: '#4361ee', iconPath: 'M2 5h12v8H2zM5 5V3M11 5V3' },
  { key: 'planned',         label: 'Planned',         color: '#4cc9f0', iconPath: 'M2 4h12v10H2zM5 4V2M11 4V2M2 8h12' },
  { key: 'high-priority',   label: 'High Priority',   color: '#f25f5c', iconPath: 'M8 2v8M5 5l3-3 3 3M4 14h8' },
  { key: 'medium-priority', label: 'Medium Priority', color: '#f4a261', iconPath: 'M4 6h8M4 10h6M4 14h4' },
  { key: 'low-priority',    label: 'Low Priority',    color: '#2ec4b6', iconPath: 'M4 6h4M4 10h6M4 14h8' },
  { key: 'someday',         label: 'Someday',         color: '#888',    iconPath: 'M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Zm0 4v2l1 1' },
  { key: 'events',          label: 'Events',          color: '#e040fb', iconPath: 'M2 5h12v9H2zM5 5V3M11 5V3M2 9h12' },
  { key: 'completed',       label: 'Completed',       color: '#06d6a0', iconPath: 'M3 8l3.5 3.5L13 5' },
];

// ----------------------------------------------------------
// Styles noi tuyen
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

const viewRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10,
  padding: '8px 0',
};

const projectRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 8,
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-card)',
};

const iconBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--text-muted)',
  transition: 'background var(--transition-fast)',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--divider)',
  margin: '16px 0',
};

// ----------------------------------------------------------
// Component chinh
// ----------------------------------------------------------
const ProjectsSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const { projects, deleteProject } = useTaskContext();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Cap nhat visibleViews
  const toggleView = (key: string, val: boolean) => {
    updateSettings({
      visibleViews: { ...settings.visibleViews, [key]: val },
    });
  };

  // Xu ly xoa project voi confirm
  const handleDeleteClick = (id: string) => {
    if (confirmDeleteId === id) {
      deleteProject(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  return (
    <div>
      {/* Phan 1: Smart Views */}
      <div style={sectionTitleStyle}>Smart Views</div>
      <div>
        {SMART_VIEWS.map((view) => (
          <div key={view.key} style={viewRowStyle}>
            {/* Icon mau */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: view.color }}>
              <path d={view.iconPath} stroke={view.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Label - flex: 1 de day toggle sang phai */}
            <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              {view.label}
            </span>

            {/* Toggle */}
            <Toggle
              checked={settings.visibleViews?.[view.key] ?? false}
              onChange={(val) => toggleView(view.key, val)}
              size="sm"
            />
          </div>
        ))}
      </div>

      <div style={dividerStyle} />

      {/* Phan 2: Projects list */}
      <div style={sectionTitleStyle}>Projects</div>
      {projects.length === 0 ? (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '8px 0' }}>
          Chua co project nao.
        </div>
      ) : (
        <div>
          {projects.map((project) => (
            <div key={project.id} style={projectRowStyle}>
              {/* Mau dot */}
              <span style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: project.color,
                flexShrink: 0,
                display: 'inline-block',
              }} />

              {/* Ten project */}
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                {project.name}
              </span>

              {/* Nut xoa voi confirm */}
              <button
                type="button"
                title={confirmDeleteId === project.id ? 'Nhan lai de xac nhan xoa' : 'Xoa project'}
                style={{
                  ...iconBtnStyle,
                  color: confirmDeleteId === project.id ? '#f25f5c' : 'var(--text-muted)',
                  background: confirmDeleteId === project.id ? 'rgba(242,95,92,0.12)' : 'transparent',
                }}
                onClick={() => handleDeleteClick(project.id)}
                onBlur={() => setConfirmDeleteId(null)}
              >
                {confirmDeleteId === project.id ? (
                  // Icon xac nhan
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7l4 4 8-8" stroke="#f25f5c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  // Icon thung rac
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4h10M5 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5A1 1 0 0 0 4.7 12h4.6a1 1 0 0 0 1-.95L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          ))}

          {confirmDeleteId && (
            <div style={{ fontSize: 'var(--text-xs)', color: '#f4a261', marginTop: 4, padding: '0 4px' }}>
              Nhan nut xoa lan 2 de xac nhan. Click ra ngoai de huy.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsSettings;
