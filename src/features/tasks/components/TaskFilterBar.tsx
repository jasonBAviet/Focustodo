import React, { useEffect, useRef, useState } from 'react';
import { useTaskContext, EMPTY_FILTERS } from '@/features/tasks/TaskContext';
import { toggleArrayItem } from '@/utils/arrayUtils';
import { getContextTags } from '@/utils/tagScope';
import './TaskFilterBar.css';

type OpenMenu = 'tag' | 'project' | 'created' | 'start' | 'due' | null;

const IconChevron = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const NO_PROJECT_ID = '__no_project__';
const NO_TAG_ID = '__no_tag__';

const TaskFilterBar: React.FC = () => {
  const { filters, setFilters, tags, projects, folders, tasks, activeView, activeProjectId, activeFolderId } = useTaskContext();
  // Filter labels context by current project/folder view.
  const visibleTags = getContextTags(tags, folders, projects, activeView, activeProjectId, activeFolderId);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  // Mobile: Toggle for tag/project/date filters behind 'Filter' button.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) =>
    setOpenMenu((prev) => (prev === menu ? null : menu));

  const toggleTag = (id: string) =>
    setFilters((f) => ({ ...f, tagIds: toggleArrayItem(f.tagIds, id) }));
  const toggleProject = (id: string) =>
    setFilters((f) => ({ ...f, projectIds: toggleArrayItem(f.projectIds, id) }));

  // When in project/folder/tag view, the 'Project' filter is not applicable
  const showProjectFilter = activeView !== 'project' && activeView !== 'folder' && activeView !== 'tag';

  // Available tags after selecting project filter
  const tagsForSelectedProjects = React.useMemo(() => {
    const realProjectIds = filters.projectIds.filter((id) => id !== NO_PROJECT_ID);
    if (realProjectIds.length === 0) return visibleTags;
    const tagIdsInProjects = new Set<string>();
    tasks.forEach((t) => {
      if (t.projectId && realProjectIds.includes(t.projectId)) {
        t.tags.forEach((tid) => tagIdsInProjects.add(tid));
      }
    });
    return visibleTags.filter((tag) => tagIdsInProjects.has(tag.id));
  }, [filters.projectIds, tasks, visibleTags]);

  // Any tasks with no project?
  const hasTasksWithNoProject = tasks.some((t) => !t.projectId);
  // Any tasks with no tag?
  const hasTasksWithNoTag = tasks.some((t) => t.tags.length === 0);

  const activeCount =
    (filters.text.trim() ? 1 : 0) +
    (filters.tagIds.length > 0 ? 1 : 0) +
    (showProjectFilter && filters.projectIds.length > 0 ? 1 : 0) +
    (filters.createdFrom || filters.createdTo ? 1 : 0) +
    (filters.startFrom || filters.startTo ? 1 : 0) +
    (filters.dueFrom || filters.dueTo ? 1 : 0);

  const tagLabel = filters.tagIds.length > 0 ? `Tag (${filters.tagIds.length})` : 'Tag';
  const projectLabel = filters.projectIds.length > 0 ? `Project (${filters.projectIds.length})` : 'Project';
  const createdActive = !!(filters.createdFrom || filters.createdTo);
  const startActive = !!(filters.startFrom || filters.startTo);
  const dueActive = !!(filters.dueFrom || filters.dueTo);

  return (
    <div className={`task-filter-bar ${mobileFiltersOpen ? 'filters-open' : ''}`} ref={wrapRef}>
      {/* Text */}
      <div className="tfb-search">
        <IconSearch />
        <input
          className="tfb-search-input"
          type="text"
          placeholder="Filter by keyword…"
          value={filters.text}
          onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
        />
      </div>

      {/* Mobile-only: toggle button for filters */}
      <button
        type="button"
        className={`tfb-toggle ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => setMobileFiltersOpen((v) => !v)}
        aria-expanded={mobileFiltersOpen}
      >
        Filter{activeCount > 0 ? ` (${activeCount})` : ''} <IconChevron />
      </button>

      {/* Filter group */}
      <div className="tfb-filters">

      {/* Project */}
      {showProjectFilter && (
        <div className="tfb-item">
          <button
            className={`tfb-btn ${filters.projectIds.length > 0 ? 'active' : ''}`}
            onClick={() => toggleMenu('project')}
          >
            {projectLabel} <IconChevron />
          </button>
          {openMenu === 'project' && (
            <div className="tfb-menu">
              {projects.map((p) => {
                const checked = filters.projectIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    className={`tfb-menu-item ${checked ? 'checked' : ''}`}
                    onClick={() => toggleProject(p.id)}
                  >
                    <span className="tfb-dot" style={{ background: p.color }} />
                    <span className="tfb-menu-text">{p.name}</span>
                    {checked && <span className="tfb-check">✓</span>}
                  </button>
                );
              })}
              {hasTasksWithNoProject && (
                <button
                  className={`tfb-menu-item ${filters.projectIds.includes(NO_PROJECT_ID) ? 'checked' : ''}`}
                  onClick={() => toggleProject(NO_PROJECT_ID)}
                >
                  <span className="tfb-dot" style={{ background: 'var(--text-tertiary)', opacity: 0.4 }} />
                  <span className="tfb-menu-text" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No project</span>
                  {filters.projectIds.includes(NO_PROJECT_ID) && <span className="tfb-check">✓</span>}
                </button>
              )}
              {projects.length === 0 && !hasTasksWithNoProject && (
                <p className="tfb-empty">No projects yet</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tag */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${filters.tagIds.length > 0 ? 'active' : ''}`}
          onClick={() => toggleMenu('tag')}
        >
          {tagLabel} <IconChevron />
        </button>
        {openMenu === 'tag' && (
          <div className="tfb-menu">
            {tagsForSelectedProjects.map((tag) => {
              const checked = filters.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  className={`tfb-menu-item ${checked ? 'checked' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span className="tfb-dot" style={{ background: tag.color }} />
                  <span className="tfb-menu-text">{tag.name}</span>
                  {checked && <span className="tfb-check">✓</span>}
                </button>
              );
            })}
            {hasTasksWithNoTag && (
              <button
                className={`tfb-menu-item ${filters.tagIds.includes(NO_TAG_ID) ? 'checked' : ''}`}
                onClick={() => toggleTag(NO_TAG_ID)}
              >
                <span className="tfb-dot" style={{ background: 'var(--text-tertiary)', opacity: 0.4 }} />
                <span className="tfb-menu-text" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No tag</span>
                {filters.tagIds.includes(NO_TAG_ID) && <span className="tfb-check">✓</span>}
              </button>
            )}
            {tagsForSelectedProjects.length === 0 && !hasTasksWithNoTag && (
              <p className="tfb-empty">No tags yet</p>
            )}
          </div>
        )}
      </div>

      {/* Created date */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${createdActive ? 'active' : ''}`}
          onClick={() => toggleMenu('created')}
        >
          Created Date <IconChevron />
        </button>
        {openMenu === 'created' && (
          <div className="tfb-menu tfb-menu--date">
            <label className="tfb-date-row">
              <span>From</span>
              <input
                type="date"
                value={filters.createdFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, createdFrom: e.target.value || null }))}
              />
            </label>
            <label className="tfb-date-row">
              <span>To</span>
              <input
                type="date"
                value={filters.createdTo ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, createdTo: e.target.value || null }))}
              />
            </label>
            {createdActive && (
              <button
                className="tfb-clear-range"
                onClick={() => setFilters((f) => ({ ...f, createdFrom: null, createdTo: null }))}
              >
                Clear range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Start date */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${startActive ? 'active' : ''}`}
          onClick={() => toggleMenu('start')}
        >
          Start Date <IconChevron />
        </button>
        {openMenu === 'start' && (
          <div className="tfb-menu tfb-menu--date">
            <label className="tfb-date-row">
              <span>From</span>
              <input
                type="date"
                value={filters.startFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, startFrom: e.target.value || null }))}
              />
            </label>
            <label className="tfb-date-row">
              <span>To</span>
              <input
                type="date"
                value={filters.startTo ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, startTo: e.target.value || null }))}
              />
            </label>
            {startActive && (
              <button
                className="tfb-clear-range"
                onClick={() => setFilters((f) => ({ ...f, startFrom: null, startTo: null }))}
              >
                Clear range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Due date */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${dueActive ? 'active' : ''}`}
          onClick={() => toggleMenu('due')}
        >
          Due Date <IconChevron />
        </button>
        {openMenu === 'due' && (
          <div className="tfb-menu tfb-menu--date">
            <label className="tfb-date-row">
              <span>From</span>
              <input
                type="date"
                value={filters.dueFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dueFrom: e.target.value || null }))}
              />
            </label>
            <label className="tfb-date-row">
              <span>To</span>
              <input
                type="date"
                value={filters.dueTo ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dueTo: e.target.value || null }))}
              />
            </label>
            {dueActive && (
              <button
                className="tfb-clear-range"
                onClick={() => setFilters((f) => ({ ...f, dueFrom: null, dueTo: null }))}
              >
                Clear range
              </button>
            )}
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {activeCount > 0 && (
        <button className="tfb-clear-all" onClick={() => { setFilters(EMPTY_FILTERS); setOpenMenu(null); setMobileFiltersOpen(false); }}>
          Clear filters ({activeCount})
        </button>
      )}

      </div>
    </div>
  );
};

export default TaskFilterBar;
