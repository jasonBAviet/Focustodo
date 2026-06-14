import React, { useState, useRef, useEffect } from 'react';
import type { Tag } from '@/types';
import { toggleArrayItem } from '@/utils/arrayUtils';

const TAG_COLORS = [
  '#f25f5c', '#f4a261', '#e9c46a', '#2ec4b6', '#4361ee',
  '#7209b7', '#06d6a0', '#ff9f1c', '#4cc9f0', '#7cb518',
];

interface TagPickerProps {
  taskTags: string[];
  allTags: Tag[];
  onUpdate: (tagIds: string[]) => void;
  onAddTag: (name: string, color: string) => Tag;
}

const IconTag = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M1.5 1.5h5l5.5 5.5-5 5-5.5-5.5V1.5z"
      fill={color}
      stroke={color}
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
    <circle cx="3.5" cy="3.5" r="0.8" fill="white" />
  </svg>
);

const TagPicker: React.FC<TagPickerProps> = ({ taskTags, allTags, onUpdate, onAddTag }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const dropRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        handleCancel();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleOpen = () => {
    setPending([...taskTags]);
    setShowNew(false);
    setNewName('');
    setIsOpen(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setShowNew(false);
    setNewName('');
  };

  const handleOk = () => {
    onUpdate(pending);
    setIsOpen(false);
    setShowNew(false);
  };

  const toggleTag = (id: string) => {
    setPending((prev) => toggleArrayItem(prev, id));
  };

  const handleAddNewTag = () => {
    if (!newName.trim()) return;
    const tag = onAddTag(newName.trim(), newColor);
    setPending((prev) => [...prev, tag.id]);
    setNewName('');
    setShowNew(false);
  };

  const selectedTags = allTags.filter((t) => taskTags.includes(t.id));

  return (
    <div className="tag-picker-wrap">
      {/* Display selected tags + button */}
      <div className="tag-picker-bar">
        {selectedTags.map((t) => (
          <span key={t.id} className="tag-chip" style={{ borderColor: t.color }}>
            <span className="tag-chip-dot" style={{ background: t.color }} />
            {t.name}
          </span>
        ))}
        <button ref={btnRef} className="tag-add-btn" onClick={handleOpen}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Tags
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="tag-dropdown" ref={dropRef}>
          <div className="tag-dropdown-list">
            {allTags.length === 0 && !showNew && (
              <p className="tag-empty-hint">No tags yet. Create a new tag below.</p>
            )}
            {allTags.map((tag) => {
              const checked = pending.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className={`tag-dropdown-item ${checked ? 'checked' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <IconTag color={tag.color} />
                  <span className="tag-dropdown-name">{tag.name}</span>
                  <span className={`tag-radio ${checked ? 'active' : ''}`}>
                    {checked && (
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <circle cx="4" cy="4" r="3" fill="white" />
                      </svg>
                    )}
                  </span>
                </div>
              );
            })}

            {showNew && (
              <div className="tag-new-row">
                <input
                  className="tag-new-input"
                  placeholder="Tag name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                  autoFocus
                />
                <div className="tag-color-row">
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`tag-color-dot ${newColor === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
                <button className="tag-new-confirm-btn" onClick={handleAddNewTag}>
                  Add tag
                </button>
              </div>
            )}

            {!showNew && (
              <div className="tag-dropdown-item add-new" onClick={() => setShowNew(true)}>
                <span className="tag-add-plus">+</span>
                <span className="tag-dropdown-name" style={{ color: 'var(--accent)' }}>
                  New Tag
                </span>
              </div>
            )}
          </div>

          <div className="tag-dropdown-footer">
            <button className="tag-footer-btn cancel" onClick={handleCancel}>Cancel</button>
            <button className="tag-footer-btn ok" onClick={handleOk}>OK</button>
          </div>
        </div>
      )}

      <style>{`
        .tag-picker-wrap { position: relative; }
        .tag-picker-bar {
          display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
          padding: 6px 0 10px;
        }
        .tag-chip {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--text-secondary);
          border: 1px solid; border-radius: 20px;
          padding: 2px 8px; background: transparent;
        }
        .tag-chip-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .tag-add-btn {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px; color: var(--text-tertiary);
          background: none; border: 1px dashed var(--border);
          border-radius: 20px; padding: 3px 10px;
          cursor: pointer; font-family: var(--font-main);
          transition: all var(--transition-fast);
        }
        .tag-add-btn:hover { border-color: var(--accent); color: var(--accent); }
        .tag-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 260px;
          background: var(--bg-dialog);
          border: none;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22);
          z-index: 300;
          overflow: hidden;
          animation: slide-in-down 150ms ease both;
        }
        .tag-dropdown-list {
          max-height: 280px; overflow-y: auto;
          padding: 8px 0;
        }
        .tag-dropdown-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; cursor: pointer;
          transition: background var(--transition-fast);
        }
        .tag-dropdown-item:hover { background: var(--bg-card-hover); }
        .tag-dropdown-item.checked { background: color-mix(in srgb, var(--accent) 8%, transparent); }
        .tag-dropdown-name { flex: 1; font-size: 13px; color: var(--text-primary); }
        .tag-radio {
          width: 16px; height: 16px; border-radius: 50%;
          border: 1.5px solid var(--border-strong);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all var(--transition-fast);
        }
        .tag-radio.active { background: var(--accent); border-color: var(--accent); }
        .tag-add-plus { font-size: 16px; color: var(--accent); width: 14px; text-align: center; }
        .tag-empty-hint { font-size: 12px; color: var(--text-tertiary); text-align: center; padding: 12px; }
        .tag-new-row {
          padding: 8px 16px 4px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .tag-new-input {
          width: 100%; background: var(--bg-input);
          border: 1px solid var(--border); border-radius: 8px;
          padding: 6px 10px; color: var(--text-primary);
          font-size: 13px; font-family: var(--font-main);
          outline: none; box-sizing: border-box;
        }
        .tag-new-input:focus { border-color: var(--accent); }
        .tag-color-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .tag-color-dot {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid transparent; cursor: pointer;
          transition: transform var(--transition-fast);
        }
        .tag-color-dot:hover { transform: scale(1.15); }
        .tag-color-dot.selected { border-color: var(--text-primary); transform: scale(1.15); }
        .tag-new-confirm-btn {
          background: var(--accent); color: white; border: none;
          border-radius: 6px; padding: 5px 12px; font-size: 12px;
          cursor: pointer; font-family: var(--font-main);
          transition: opacity var(--transition-fast);
          align-self: flex-start;
        }
        .tag-new-confirm-btn:hover { opacity: 0.88; }
        .tag-dropdown-footer {
          display: flex; gap: 8px; padding: 10px 16px;
          border-top: 1px solid var(--border);
        }
        .tag-footer-btn {
          flex: 1; padding: 8px; border-radius: 8px;
          font-size: 13px; cursor: pointer; font-family: var(--font-main);
          transition: all var(--transition-fast);
        }
        .tag-footer-btn.cancel {
          background: none; border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .tag-footer-btn.cancel:hover { border-color: var(--border-strong); color: var(--text-primary); }
        .tag-footer-btn.ok {
          background: var(--accent); border: none; color: white; font-weight: 500;
        }
        .tag-footer-btn.ok:hover { opacity: 0.88; }
      `}</style>
    </div>
  );
};

export default TagPicker;
