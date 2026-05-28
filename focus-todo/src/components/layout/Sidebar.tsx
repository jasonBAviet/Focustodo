import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAppContext } from '../../contexts/AppContext';
import type { ViewType } from '../../types';

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

// Icon SVG nho gon
const IconClock = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 4v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.1 3.1l1 1M10.9 10.9l1 1M10.9 3.1l-1 1M3.1 10.9l1-1"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.5 6h12M5 1v3M10 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M2 4h11M2 7.5h11M2 11h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const IconStar = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5l1.5 4h4l-3.2 2.5 1.2 4-3.5-2.5L4 12l1.2-4L2 5.5h4l1.5-4z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 7.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.1 3.1l1 1M10.9 10.9l1 1M10.9 3.1l-1 1M3.1 10.9l1-1"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const IconChevron = ({ down }: { down?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
    style={{ transform: down ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 200ms ease' }}>
    <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Cau hinh smart views
interface NavView {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

const SMART_VIEWS: NavView[] = [
  { id: 'today',     label: 'Today',     icon: <IconClock /> },
  { id: 'tomorrow',  label: 'Tomorrow',  icon: <IconSun /> },
  { id: 'this-week', label: 'This Week', icon: <IconCalendar /> },
  { id: 'planned',   label: 'Planned',   icon: <IconList /> },
  { id: 'events',    label: 'Events',    icon: <IconStar /> },
  { id: 'completed', label: 'Completed', icon: <IconCheck /> },
];

// ============================================================
// MAIN COMPONENT
// ============================================================
const Sidebar: React.FC = () => {
  const {
    tasks,
    projects,
    activeView,
    activeProjectId,
    searchQuery,
    setSearchQuery,
    setActiveView,
    setActiveProjectId,
  } = useTaskContext();

  const { settings, setOpenModal } = useAppContext();
  const [listsExpanded, setListsExpanded] = useState(true);

  // Loc views theo visibleViews settings
  const visibleViews = SMART_VIEWS.filter(
    (v) => settings.visibleViews[v.id] !== false
  );

  // Task count cho moi project (chi dem task chua hoan thanh)
  const getProjectCount = (projectId: string) =>
    tasks.filter((t) => t.projectId === projectId && !t.completed).length;

  // Task count cho smart views
  const getViewCount = (viewId: ViewType): number => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);
    const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

    switch (viewId) {
      case 'today':
        return tasks.filter((t) => !t.completed && t.dueDate?.startsWith(todayStr)).length;
      case 'tomorrow':
        return tasks.filter((t) => !t.completed && t.dueDate?.startsWith(tomorrowStr)).length;
      case 'planned':
        return tasks.filter((t) => !t.completed && t.dueDate !== null).length;
      case 'completed':
        return tasks.filter((t) => t.completed).length;
      default:
        return 0;
    }
  };

  const handleNavClick = (viewId: ViewType) => {
    setActiveView(viewId);
    setActiveProjectId(null);
  };

  const handleProjectClick = (projectId: string) => {
    setActiveView('project');
    setActiveProjectId(projectId);
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="flex items-center gap-2">
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)',
            flexShrink: 0,
          }}>
            F
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', flex: 1 }}>
            Focus To-Do
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Tim kiem task"
        />
      </div>

      {/* Nav - Smart Views */}
      <nav className="sidebar-nav">
        {visibleViews.map((view) => {
          const isActive =
            activeView === view.id && activeProjectId === null;
          const count = getViewCount(view.id);
          return (
            <div
              key={view.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => handleNavClick(view.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleNavClick(view.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                {view.icon}
              </span>
              <span className="nav-label">{view.label}</span>
              {count > 0 && (
                <span className="nav-meta">
                  <span>{count}</span>
                </span>
              )}
            </div>
          );
        })}

        {/* Divider */}
        <div className="divider" style={{ margin: 'var(--space-2) var(--space-4)' }} />

        {/* My Lists section */}
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          style={{
            padding: 'var(--space-1) var(--space-4)',
            marginBottom: 'var(--space-1)',
          }}
          onClick={() => setListsExpanded((v) => !v)}
        >
          <span className="text-xs font-semibold"
            style={{ color: 'var(--text-tertiary)', flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Lists
          </span>
          <span style={{ color: 'var(--text-tertiary)' }}>
            <IconChevron down={listsExpanded} />
          </span>
        </div>

        {listsExpanded && projects.map((project) => {
          const isActive = activeView === 'project' && activeProjectId === project.id;
          const count = getProjectCount(project.id);
          return (
            <div
              key={project.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => handleProjectClick(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(project.id)}
            >
              <span
                className="project-dot"
                style={{ backgroundColor: project.color }}
              />
              <span className="nav-label truncate">{project.name}</span>
              {count > 0 && (
                <span className="nav-meta">
                  <span>{count}</span>
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="btn btn--ghost btn--sm flex-1"
          onClick={() => setOpenModal('add-project')}
          aria-label="Them project moi"
          style={{ justifyContent: 'flex-start', gap: 'var(--space-2)' }}
        >
          <IconPlus />
          <span>Add Project</span>
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setOpenModal('settings')}
          aria-label="Mo cai dat"
          style={{ padding: 'var(--space-1) var(--space-2)' }}
        >
          <IconSettings />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
