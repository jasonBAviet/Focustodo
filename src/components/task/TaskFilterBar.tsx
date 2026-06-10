import React, { useEffect, useRef, useState } from 'react';
import { useTaskContext, EMPTY_FILTERS } from '../../contexts/TaskContext';
import { toggleArrayItem } from '../../utils/arrayUtils';
import { getContextTags } from '../../utils/tagScope';

type OpenMenu = 'tag' | 'project' | 'created' | 'due' | null;

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

const TaskFilterBar: React.FC = () => {
  const { filters, setFilters, tags, projects, folders, activeView, activeProjectId, activeFolderId } = useTaskContext();
  // Nhãn lọc theo ngữ cảnh dự án/thư mục đang xem (view khác -> hiện tất cả).
  const visibleTags = getContextTags(tags, folders, projects, activeView, activeProjectId, activeFolderId);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  // Mobile: Tag/Project/ngày thu sau nút "Lọc"; toggle này bung/đóng chúng.
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

  const activeCount =
    (filters.text.trim() ? 1 : 0) +
    (filters.tagIds.length > 0 ? 1 : 0) +
    (filters.projectIds.length > 0 ? 1 : 0) +
    (filters.createdFrom || filters.createdTo ? 1 : 0) +
    (filters.dueFrom || filters.dueTo ? 1 : 0);

  const tagLabel = filters.tagIds.length > 0 ? `Tag (${filters.tagIds.length})` : 'Tag';
  const projectLabel = filters.projectIds.length > 0 ? `Project (${filters.projectIds.length})` : 'Project';
  const createdActive = !!(filters.createdFrom || filters.createdTo);
  const dueActive = !!(filters.dueFrom || filters.dueTo);

  return (
    <div className={`task-filter-bar ${mobileFiltersOpen ? 'filters-open' : ''}`} ref={wrapRef}>
      {/* Text */}
      <div className="tfb-search">
        <IconSearch />
        <input
          className="tfb-search-input"
          type="text"
          placeholder="Lọc theo từ khóa…"
          value={filters.text}
          onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
        />
      </div>

      {/* Mobile-only: nút bung/đóng nhóm bộ lọc (Tag/Project/ngày) */}
      <button
        type="button"
        className={`tfb-toggle ${activeCount > 0 ? 'active' : ''}`}
        onClick={() => setMobileFiltersOpen((v) => !v)}
        aria-expanded={mobileFiltersOpen}
      >
        Lọc{activeCount > 0 ? ` (${activeCount})` : ''} <IconChevron />
      </button>

      {/* Nhóm bộ lọc — desktop: inline (display:contents); mobile: thu sau nút "Lọc" */}
      <div className="tfb-filters">

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
            {visibleTags.length === 0 ? (
              <p className="tfb-empty">Chưa có tag nào</p>
            ) : (
              visibleTags.map((tag) => {
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
              })
            )}
          </div>
        )}
      </div>

      {/* Project */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${filters.projectIds.length > 0 ? 'active' : ''}`}
          onClick={() => toggleMenu('project')}
        >
          {projectLabel} <IconChevron />
        </button>
        {openMenu === 'project' && (
          <div className="tfb-menu">
            {projects.length === 0 ? (
              <p className="tfb-empty">Chưa có project nào</p>
            ) : (
              projects.map((p) => {
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
              })
            )}
          </div>
        )}
      </div>

      {/* Ngày tạo */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${createdActive ? 'active' : ''}`}
          onClick={() => toggleMenu('created')}
        >
          Ngày tạo <IconChevron />
        </button>
        {openMenu === 'created' && (
          <div className="tfb-menu tfb-menu--date">
            <label className="tfb-date-row">
              <span>Từ</span>
              <input
                type="date"
                value={filters.createdFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, createdFrom: e.target.value || null }))}
              />
            </label>
            <label className="tfb-date-row">
              <span>Đến</span>
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
                Xóa khoảng
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ngày due */}
      <div className="tfb-item">
        <button
          className={`tfb-btn ${dueActive ? 'active' : ''}`}
          onClick={() => toggleMenu('due')}
        >
          Ngày due <IconChevron />
        </button>
        {openMenu === 'due' && (
          <div className="tfb-menu tfb-menu--date">
            <label className="tfb-date-row">
              <span>Từ</span>
              <input
                type="date"
                value={filters.dueFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dueFrom: e.target.value || null }))}
              />
            </label>
            <label className="tfb-date-row">
              <span>Đến</span>
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
                Xóa khoảng
              </button>
            )}
          </div>
        )}
      </div>

      {/* Xóa tất cả filter */}
      {activeCount > 0 && (
        <button className="tfb-clear-all" onClick={() => { setFilters(EMPTY_FILTERS); setOpenMenu(null); setMobileFiltersOpen(false); }}>
          Xóa lọc ({activeCount})
        </button>
      )}

      </div>

      <style>{`
        .task-filter-bar {
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
          margin-bottom: 10px;
        }
        /* Desktop: nút "Lọc" ẩn, nhóm bộ lọc flow inline như cũ.
           Mobile override (display:flex / collapse) nằm trong index.css @media. */
        .tfb-toggle {
          display: none; align-items: center; gap: 6px;
          background: var(--task-bg); border: 1px solid var(--border);
          color: var(--text-secondary); font-size: var(--text-sm);
          font-family: var(--font-main); cursor: pointer;
          padding: 6px 10px; border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .tfb-toggle:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .tfb-toggle.active {
          border-color: var(--accent); color: var(--accent);
          background: color-mix(in srgb, var(--accent) 8%, transparent);
        }
        .tfb-toggle svg { transition: transform var(--transition-fast); }
        .tfb-filters { display: contents; }
        .task-filter-bar.filters-open .tfb-toggle svg { transform: rotate(180deg); }
        .tfb-search {
          display: flex; align-items: center; gap: 6px;
          border: 1px solid var(--border); border-radius: var(--radius-md);
          padding: 5px 10px; background: var(--task-bg);
          color: var(--text-tertiary);
          transition: border-color var(--transition-fast);
        }
        .tfb-search:focus-within { border-color: var(--accent); }
        .tfb-search-input {
          background: none; border: none; outline: none;
          color: var(--text-primary); font-size: var(--text-sm);
          font-family: var(--font-main); width: 150px;
        }
        .tfb-search-input::placeholder { color: var(--text-tertiary); }
        .tfb-item { position: relative; }
        .tfb-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--task-bg); border: 1px solid var(--border);
          color: var(--text-secondary); font-size: var(--text-sm);
          font-family: var(--font-main); cursor: pointer;
          padding: 6px 10px; border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }
        .tfb-btn:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .tfb-btn.active {
          border-color: var(--accent); color: var(--accent);
          background: color-mix(in srgb, var(--accent) 8%, transparent);
        }
        .tfb-menu {
          position: absolute; left: 0; top: calc(100% + 4px);
          background: var(--bg-dialog); border: 1px solid var(--border);
          border-radius: var(--radius-md); padding: 4px;
          min-width: 180px; max-height: 280px; overflow-y: auto;
          z-index: 200; box-shadow: var(--shadow-lg);
          animation: slide-in-down 150ms ease both;
        }
        .tfb-menu--date {
          display: flex; flex-direction: column; gap: 8px; padding: 10px;
          min-width: 200px;
        }
        .tfb-menu-item {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 7px 8px; border: none; background: none;
          cursor: pointer; border-radius: 6px; font-size: var(--text-sm);
          color: var(--text-secondary); text-align: left;
          transition: background var(--transition-fast);
        }
        .tfb-menu-item:hover { background: var(--glass-bg-hover); color: var(--text-primary); }
        .tfb-menu-item.checked { color: var(--text-primary); }
        .tfb-menu-text { flex: 1; }
        .tfb-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .tfb-check { color: var(--accent); font-size: 12px; }
        .tfb-empty { font-size: var(--text-xs); color: var(--text-tertiary); padding: 10px; text-align: center; }
        .tfb-date-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          font-size: var(--text-sm); color: var(--text-secondary);
        }
        .tfb-date-row input {
          background: var(--bg-input, var(--task-bg)); border: 1px solid var(--border);
          border-radius: 6px; padding: 4px 8px; color: var(--text-primary);
          font-family: var(--font-main); font-size: var(--text-sm);
          color-scheme: dark;
        }
        .tfb-date-row input:focus { outline: none; border-color: var(--accent); }
        .tfb-clear-range {
          background: none; border: 1px solid var(--border); color: var(--text-tertiary);
          border-radius: 6px; padding: 5px; font-size: var(--text-xs);
          cursor: pointer; font-family: var(--font-main);
          transition: all var(--transition-fast);
        }
        .tfb-clear-range:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .tfb-clear-all {
          background: none; border: 1px solid var(--border);
          color: var(--text-secondary); font-size: var(--text-xs);
          font-family: var(--font-main); cursor: pointer;
          padding: 6px 10px; border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }
        .tfb-clear-all:hover { border-color: var(--priority-high); color: var(--priority-high); }
      `}</style>
    </div>
  );
};

export default TaskFilterBar;
