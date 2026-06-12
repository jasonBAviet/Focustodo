import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAppContext } from '../../contexts/AppContext';
import type { ViewType, Project, Folder } from '../../types';
import { getRootFolders, getChildFolders } from '../../utils/folderUtils';
import { getContextTags } from '../../utils/tagScope';
import {
  formatMinutes,
  getProjectStats,
  getFolderStats,
  getTagStats,
  getViewStats,
} from '../../utils/sidebarStats';
import {
  IconPlus,
  IconFolder,
  IconTag,
  IconFolderPlus,
  IconTagPlus,
  IconChevron,
  SMART_VIEWS,
} from './SidebarIcons';

import logoUrl from '../../assets/Logo.jpg';

// ============================================================
// SIDEBAR COMPONENT
// ============================================================
interface SidebarProps {
  /** Called after a navigation action — used to close the mobile drawer. */
  onNavigate?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
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

  const normalTasks = tasks.filter((t) => !t.isKnowledge);
  const { settings, setOpenModal } = useAppContext();
  const [listsExpanded, setListsExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Loc views theo visibleViews settings
  const visibleViews = SMART_VIEWS.filter(
    (v) => settings.visibleViews[v.id] !== false
  );



  const handleNavClick = (viewId: ViewType) => {
    setActiveView(viewId);
    setActiveProjectId(null);
    setActiveTagId(null);
    setActiveFolderId(null);
    setSearchQuery('');
    onNavigate?.();
  };

  const handleProjectClick = (projectId: string) => {
    setActiveView('project');
    setActiveProjectId(projectId);
    setActiveTagId(null);
    setActiveFolderId(null);
    setSearchQuery('');
    onNavigate?.();
  };

  const handleTagClick = (tagId: string) => {
    setActiveView('tag');
    setActiveTagId(tagId);
    setActiveProjectId(null);
    setActiveFolderId(null);
    setSearchQuery('');
    onNavigate?.();
  };

  const handleFolderFilterClick = (folderId: string) => {
    setActiveView('folder');
    setActiveFolderId(folderId);
    setActiveProjectId(null);
    setActiveTagId(null);
    setSearchQuery('');
    toggleFolder(folderId);
    onNavigate?.();
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const expandAllFolders = () => {
    const next: Record<string, boolean> = {};
    folders.forEach(f => {
      next[f.id] = true;
    });
    setExpandedFolders(next);
  };

  const collapseAllFolders = () => {
    setExpandedFolders({});
  };

  const indentStyle = (depth: number): React.CSSProperties =>
    depth > 0 ? { paddingLeft: `calc(var(--space-4) + ${depth} * var(--space-4))` } : {};

  const renderProjectItem = (project: Project, depth = 0) => {
    const isActive = activeView === 'project' && activeProjectId === project.id;
    const { count, time } = getProjectStats(normalTasks, project.id, settings);
    return (
      <div
        key={project.id}
        className={`nav-item${isActive ? ' active' : ''}`}
        style={indentStyle(depth)}
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
        {(count > 0 || time > 0) && (
          <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatMinutes(time)}</span>
            <span>{count}</span>
          </span>
        )}
      </div>
    );
  };

  // Render đệ quy 1 folder + folder con + project con (lồng nhiều cấp).
  const renderFolder = (folder: Folder, depth: number): React.ReactNode => {
    const isExpanded = expandedFolders[folder.id];
    const isFolderActive = activeView === 'folder' && activeFolderId === folder.id;
    const { count, time } = getFolderStats(normalTasks, projects, folders, folder.id, settings);
    const childFolders = getChildFolders(folders.filter(f => f.isVisible !== false), folder.id);
    const childProjects = projects.filter((p) => p.folderId === folder.id && p.isVisible !== false);
    const hasChildren = childFolders.length > 0 || childProjects.length > 0;
    return (
      <React.Fragment key={folder.id}>
        <div
          className={`nav-item${isFolderActive ? ' active' : ''}`}
          style={indentStyle(depth)}
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
            {(count > 0 || time > 0) && (
              <>
                <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatMinutes(time)}</span>
                <span>{count}</span>
              </>
            )}
            {hasChildren && (
              <span
                style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
              >
                <IconChevron down={isExpanded} />
              </span>
            )}
          </span>
        </div>
        {isExpanded && (
          <>
            {childFolders.map((cf) => renderFolder(cf, depth + 1))}
            {childProjects.map((p) => renderProjectItem(p, depth + 1))}
          </>
        )}
      </React.Fragment>
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
          const { count, time } = getViewStats(tasks, normalTasks, view.id, settings);
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
              {(count > 0 || time > 0) && (
                <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatMinutes(time)}</span>
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
        >
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--text-tertiary)', flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            onClick={() => setListsExpanded((v) => !v)}
          >
            My Lists
          </span>
          {listsExpanded && folders.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginRight: '4px' }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); expandAllFolders(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 'var(--text-2xs)', cursor: 'pointer', padding: '2px 4px', borderRadius: 'var(--radius-xs)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title="Mở rộng tất cả thư mục"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); collapseAllFolders(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 'var(--text-2xs)', cursor: 'pointer', padding: '2px 4px', borderRadius: 'var(--radius-xs)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title="Thu gọn tất cả thư mục"
              >
                Collapse All
              </button>
            </div>
          )}
          <span style={{ color: 'var(--text-tertiary)' }} onClick={() => setListsExpanded((v) => !v)}>
            <IconChevron down={listsExpanded} />
          </span>
        </div>

        {listsExpanded && (
          <>
            {/* Render Folders (lồng nhiều cấp) + project con của chúng */}
            {getRootFolders(folders.filter(f => f.isVisible !== false)).map((folder) => renderFolder(folder, 0))}

            {/* Render Standalone Projects (không thuộc folder nào) */}
            {projects.filter(p => !p.folderId && p.isVisible !== false).map(p => renderProjectItem(p, 0))}

            {/* Render Tags — lọc theo dự án/thư mục đang xem (view khác hiện tất cả) */}
            {getContextTags(tags, folders, projects, activeView, activeProjectId, activeFolderId).map((tag) => {
              const isTagActive = activeView === 'tag' && activeTagId === tag.id;
              const { count, time } = getTagStats(normalTasks, projects, folders, activeView, activeProjectId, activeFolderId, tag.id, settings);
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
                  {(count > 0 || time > 0) && (
                    <span className="nav-meta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>{formatMinutes(time)}</span>
                      <span>{count}</span>
                    </span>
                  )}
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
          style={{ justifyContent: 'flex-start', gap: 'var(--space-2)', flex: 1, paddingLeft: 0, color: 'var(--accent)', border: 'none', outline: 'none', boxShadow: 'none' }}
        >
          <IconPlus />
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 500 }}>Add Project</span>
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
