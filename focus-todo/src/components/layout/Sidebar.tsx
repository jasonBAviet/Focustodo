import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAppContext } from '../../contexts/AppContext';
import type { Task, ViewType, Project } from '../../types';

import logoUrl from '../../assets/Logo.jpg';

// ============================================================
// SIDEBAR COMPONENT
// ============================================================

// Icon SVG nho gon
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
  </svg>
);
const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM11 2h2v3h-2zm0 17h2v3h-2zm9-8h3v2h-3zM2 11h3v2H2zm15.4-6l2.1-2.1 1.4 1.4-2.1 2.1zm-12.8 12.8l-2.1 2.1-1.4-1.4 2.1-2.1zm12.8 0l1.4-1.4 2.1 2.1-1.4 1.4zm-14.2-14.2l1.4 1.4-2.1 2.1-1.4-1.4z"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
  </svg>
);
const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
  </svg>
);
const IconStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>
);
const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
  </svg>
);
const IconTag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.41l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.41zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
  </svg>
);
const IconFolderPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f25f5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    <line x1="12" y1="11" x2="12" y2="17"></line>
    <line x1="9" y1="14" x2="15" y2="14"></line>
  </svg>
);
const IconTagPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f25f5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
    <line x1="7" y1="7" x2="7.01" y2="7"></line>
    <line x1="14" y1="14" x2="19" y2="14"></line>
    <line x1="16.5" y1="11.5" x2="16.5" y2="16.5"></line>
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
    folders,
    tags,
    activeView,
    activeProjectId,
    activeTagId,
    activeFolderId,
    searchQuery,
    setSearchQuery,
    setActiveView,
    setActiveProjectId,
    setActiveTagId,
    setActiveFolderId,
  } = useTaskContext();

  const { settings, setOpenModal } = useAppContext();
  const [listsExpanded, setListsExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Loc views theo visibleViews settings
  const visibleViews = SMART_VIEWS.filter(
    (v) => settings.visibleViews[v.id] !== false
  );

  // Format minutes to Xh Ym
  const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getTasksStats = (taskList: Task[]) => {
    const count = taskList.length;
    const totalPomodoros = taskList.reduce((acc, t) => {
      // time remaining to complete
      return acc + Math.max(0, (t.pomodoroEstimate || 0) - (t.pomodoroCompleted || 0));
    }, 0);
    const time = totalPomodoros * (settings?.pomodoroLength || 25);
    return { count, time };
  };

  // Task count cho moi project (chi dem task chua hoan thanh)
  const getProjectStats = (projectId: string) =>
    getTasksStats(tasks.filter((t) => t.projectId === projectId && !t.completed));

  const getFolderStats = (folderId: string) => {
    const folderProjectIds = projects.filter(p => p.folderId === folderId).map(p => p.id);
    return getTasksStats(tasks.filter(t => !t.completed && t.projectId && folderProjectIds.includes(t.projectId)));
  };

  const getTagStats = (tagId: string) =>
    getTasksStats(tasks.filter(t => !t.completed && (t.tags || []).includes(tagId)));

  // Task count cho smart views
  const hasValidDueDate = (task: Task) =>
    typeof task.dueDate === 'string' && task.dueDate.trim() !== '';

  const getViewStats = (viewId: ViewType) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(today.getDate() + 1);
    const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

    switch (viewId) {
      case 'today':
        return getTasksStats(tasks.filter((t) => !t.completed && t.dueDate?.startsWith(todayStr)));
      case 'tomorrow':
        return getTasksStats(tasks.filter((t) => !t.completed && t.dueDate?.startsWith(tomorrowStr)));
      case 'planned':
        return getTasksStats(tasks.filter((t) => !t.completed && hasValidDueDate(t)));
      case 'completed':
        return getTasksStats(tasks.filter((t) => t.completed));
      default:
        return { count: 0, time: 0 };
    }
  };

  const handleNavClick = (viewId: ViewType) => {
    setActiveView(viewId);
    setActiveProjectId(null);
    setActiveTagId(null);
    setActiveFolderId(null);
    setSearchQuery('');
  };

  const handleProjectClick = (projectId: string) => {
    setActiveView('project');
    setActiveProjectId(projectId);
    setActiveTagId(null);
    setActiveFolderId(null);
    setSearchQuery('');
  };

  const handleTagClick = (tagId: string) => {
    setActiveView('tag');
    setActiveTagId(tagId);
    setActiveProjectId(null);
    setActiveFolderId(null);
    setSearchQuery('');
  };

  const handleFolderFilterClick = (folderId: string) => {
    setActiveView('folder');
    setActiveFolderId(folderId);
    setActiveProjectId(null);
    setActiveTagId(null);
    setSearchQuery('');
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const renderProjectItem = (project: Project, isChild = false) => {
    const isActive = activeView === 'project' && activeProjectId === project.id;
    const { count, time } = getProjectStats(project.id);
    return (
      <div
        key={project.id}
        className={`nav-item${isActive ? ' active' : ''}`}
        style={isChild ? { paddingLeft: 'var(--space-6)' } : {}}
        onClick={() => handleProjectClick(project.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(project.id)}
      >
        <span
          className="project-dot"
          style={{ backgroundColor: project.color, width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }}
        />
        <span className="nav-label truncate">{project.name}</span>
        <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>{formatMinutes(time)}</span>
          <span>{count}</span>
        </span>
      </div>
    );
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Focus To-Do Logo"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              objectFit: 'cover', flexShrink: 0,
            }}
          />
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
          const { count, time } = getViewStats(view.id);
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
              <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>{formatMinutes(time)}</span>
                <span>{count}</span>
              </span>
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

        {listsExpanded && (
          <>
            {/* Render Folders and their child projects */}
            {folders.map((folder) => {
              const isExpanded = expandedFolders[folder.id];
              const isFolderActive = activeView === 'folder' && activeFolderId === folder.id;
              const { count, time } = getFolderStats(folder.id);
              return (
                <React.Fragment key={folder.id}>
                  <div
                    className={`nav-item${isFolderActive ? ' active' : ''}`}
                    onClick={() => handleFolderFilterClick(folder.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleFolderFilterClick(folder.id)}
                    title={`Xem tat ca task trong folder ${folder.name}`}
                  >
                    <span style={{ color: isFolderActive ? 'var(--accent)' : folder.color }}>
                      <IconFolder />
                    </span>
                    <span className="nav-label truncate">{folder.name}</span>
                    <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>{formatMinutes(time)}</span>
                      <span>{count}</span>
                      <span
                        style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                        onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                      >
                        <IconChevron down={isExpanded} />
                      </span>
                    </span>
                  </div>
                  {isExpanded && projects.filter(p => p.folderId === folder.id).map(p => renderProjectItem(p, true))}
                </React.Fragment>
              );
            })}

            {/* Render Standalone Projects */}
            {projects.filter(p => !p.folderId).map(p => renderProjectItem(p, false))}

            {/* Render Tags */}
            {tags.map((tag) => {
              const isTagActive = activeView === 'tag' && activeTagId === tag.id;
              const { count, time } = getTagStats(tag.id);
              return (
                <div
                  key={tag.id}
                  className={`nav-item${isTagActive ? ' active' : ''}`}
                  onClick={() => handleTagClick(tag.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleTagClick(tag.id)}
                >
                  <span style={{ color: isTagActive ? 'var(--accent)' : tag.color }}>
                    <IconTag />
                  </span>
                  <span className="nav-label truncate">{tag.name}</span>
                  <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>{formatMinutes(time)}</span>
                    <span>{count}</span>
                  </span>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)' }}>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setOpenModal('add-project')}
          aria-label="Thêm project mới"
          style={{ justifyContent: 'flex-start', gap: 'var(--space-2)', flex: 1, paddingLeft: 0, color: '#f25f5c', border: 'none', outline: 'none', boxShadow: 'none' }}
        >
          <IconPlus />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Add Project</span>
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => setOpenModal('add-tag')} aria-label="Add Tag" style={{ padding: '4px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
            <IconTagPlus />
          </button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => setOpenModal('add-folder')} aria-label="Add Folder" style={{ padding: '4px', cursor: 'pointer', background: 'transparent', border: 'none' }}>
            <IconFolderPlus />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
