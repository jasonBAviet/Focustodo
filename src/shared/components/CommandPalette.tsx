import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import type { ViewType } from '@/types';

interface CommandPaletteProps {
  onToggleReport?: () => void;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  dot?: string; // màu chấm (project/tag/folder)
  keywords?: string;
  run: () => void;
}

const SMART_VIEWS: { id: ViewType; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this-week', label: 'This Week' },
  { id: 'planned', label: 'Planned' },
  { id: 'completed', label: 'Completed' },
];

// Command palette + quick-capture. Mở bằng Ctrl/Cmd+K.
const CommandPalette: React.FC<CommandPaletteProps> = ({ onToggleReport }) => {
  const {
    projects, folders, tags, addTask,
    setActiveView, setActiveProjectId, setActiveFolderId, setActiveTagId, setSearchQuery, setSelectedTaskId,
  } = useTaskContext();
  const { setOpenModal } = useAppContext();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mở/đóng bằng Ctrl/Cmd+K (toàn cục).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      // focus sau khi render
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const close = () => setOpen(false);

  const goView = (view: ViewType) => {
    setActiveView(view);
    setActiveProjectId(null);
    setActiveFolderId(null);
    setActiveTagId(null);
    setSearchQuery('');
    close();
  };

  // Danh sách lệnh tĩnh + động.
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    for (const v of SMART_VIEWS) {
      list.push({ id: `view-${v.id}`, label: v.label, hint: 'View', keywords: 'view ' + v.id, run: () => goView(v.id) });
    }
    if (onToggleReport) {
      list.push({ id: 'report', label: 'Report & Statistics', hint: 'View', keywords: 'report stats analytics', run: () => { onToggleReport(); close(); } });
    }
    list.push({ id: 'settings', label: 'Open Settings', hint: 'Action', keywords: 'settings preferences', run: () => { setOpenModal('settings'); close(); } });
    list.push({ id: 'add-project', label: 'New Project…', hint: 'Action', keywords: 'create project list', run: () => { setOpenModal('add-project'); close(); } });
    list.push({ id: 'add-folder', label: 'New Folder…', hint: 'Action', keywords: 'create folder group', run: () => { setOpenModal('add-folder'); close(); } });
    list.push({ id: 'add-tag', label: 'New Tag…', hint: 'Action', keywords: 'create tag label', run: () => { setOpenModal('add-tag'); close(); } });
    for (const p of projects) {
      list.push({
        id: `project-${p.id}`, label: p.name, hint: 'Project', dot: p.color, keywords: 'project ' + p.name,
        run: () => { setActiveView('project'); setActiveProjectId(p.id); setActiveFolderId(null); setActiveTagId(null); setSearchQuery(''); close(); },
      });
    }
    for (const f of folders) {
      list.push({
        id: `folder-${f.id}`, label: f.name, hint: 'Folder', dot: f.color, keywords: 'folder ' + f.name,
        run: () => { setActiveView('folder'); setActiveFolderId(f.id); setActiveProjectId(null); setActiveTagId(null); setSearchQuery(''); close(); },
      });
    }
    for (const t of tags) {
      list.push({
        id: `tag-${t.id}`, label: `#${t.name}`, hint: 'Tag', dot: t.color, keywords: 'tag ' + t.name,
        run: () => { setActiveView('tag'); setActiveTagId(t.id); setActiveProjectId(null); setActiveFolderId(null); setSearchQuery(''); close(); },
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, folders, tags, onToggleReport]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return commands;
    return commands.filter((c) => (c.label + ' ' + (c.keywords ?? '')).toLowerCase().includes(q));
  }, [commands, q]);

  // Quick-capture: nếu có query, luôn cho phép tạo task nhanh ở đầu danh sách.
  const quickAdd: Command | null = q
    ? {
        id: 'quick-add',
        label: `Create task: “${query.trim()}”`,
        hint: 'Enter',
        keywords: '',
        run: () => {
          const t = addTask(query.trim());
          setSelectedTaskId(t.id);
          close();
        },
      }
    : null;

  const items = quickAdd ? [quickAdd, ...filtered] : filtered;
  const clampedIndex = Math.min(index, Math.max(0, items.length - 1));

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[clampedIndex]?.run(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={close}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search views, projects, tags… or type to create a task"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
          onKeyDown={onInputKeyDown}
        />
        <div className="cmdk-list">
          {items.length === 0 ? (
            <div className="cmdk-empty">No results</div>
          ) : (
            items.map((c, i) => (
              <div
                key={c.id}
                className={`cmdk-item${i === clampedIndex ? ' active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => c.run()}
              >
                {c.dot && <span className="cmdk-dot" style={{ background: c.dot }} />}
                <span className="cmdk-label">{c.label}</span>
                {c.hint && <span className="cmdk-hint">{c.hint}</span>}
              </div>
            ))
          )}
        </div>
        <div className="cmdk-footer">
          <span>↑↓ to navigate</span>
          <span>↵ to select</span>
          <span>esc to close</span>
        </div>
      </div>

      <style>{`
        .cmdk-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: 12vh;
          animation: cmdk-fade 120ms ease;
        }
        @keyframes cmdk-fade { from { opacity: 0; } to { opacity: 1; } }
        .cmdk {
          width: min(560px, 92vw); max-height: 60vh; display: flex; flex-direction: column;
          background: var(--bg-dialog); border: 1px solid var(--border);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden;
        }
        .cmdk-input {
          padding: 16px; border: none; outline: none; background: transparent;
          color: var(--text-primary); font-size: var(--text-md); font-family: var(--font-main);
          border-bottom: 1px solid var(--divider);
        }
        .cmdk-input::placeholder { color: var(--text-tertiary); }
        .cmdk-list { overflow-y: auto; padding: 6px; }
        .cmdk-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: var(--radius-md); cursor: pointer;
          color: var(--text-primary); font-size: var(--text-sm);
        }
        .cmdk-item.active { background: var(--bg-card-hover, rgba(255,255,255,0.06)); }
        .cmdk-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .cmdk-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cmdk-hint { font-size: var(--text-xs); color: var(--text-tertiary); }
        .cmdk-empty { padding: 18px; text-align: center; color: var(--text-tertiary); font-size: var(--text-sm); }
        .cmdk-footer {
          display: flex; gap: 16px; padding: 8px 14px; border-top: 1px solid var(--divider);
          color: var(--text-tertiary); font-size: var(--text-xs);
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;
