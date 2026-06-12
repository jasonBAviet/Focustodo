// ============================================================
// FOCUS TO-DO - TagsSettings
// Tab quản lý toàn bộ Tags + click chuột phải để tương tác
// ============================================================
import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import ContextMenu from '../common/ContextMenu';
import ColorPicker from '../common/ColorPicker';
import Dialog from '../common/Dialog';
import Toggle from '../common/Toggle';

const sectionTitleStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 20 };

const tagRowStyle = (isVisible: boolean, isActive: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 12px',
  borderRadius: 'var(--radius-md)', background: isActive ? 'var(--accent-soft)' : 'var(--bg-card)',
  opacity: isVisible ? 1 : 0.55, cursor: 'context-menu', transition: 'background var(--transition-fast), opacity var(--transition-fast)',
  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
});

const menuBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-sm)', gap: 8, borderRadius: 'var(--radius-xs)' };


const scopeBadgeStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  padding: '2px 6px',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--bg-body)',
  color: 'var(--text-muted)',
  fontWeight: 500,
};

const TagsSettings: React.FC = () => {
  const { tags, folders, projects, updateTag, deleteTag, addTag } = useTaskContext();
  const [menuState, setMenuState] = useState<{ x: number; y: number; tagId: string } | null>(null);

  // Edit Name & Color States
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#7ec8e3');

  // Edit Scope States
  const [scopeTagId, setScopeTagId] = useState<string | null>(null);
  const [scopeProjectId, setScopeProjectId] = useState<string>('');
  const [scopeFolderId, setScopeFolderId] = useState<string>('');

  // Add Tag Inline
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#f4a261');

  const handleContextMenu = (e: React.MouseEvent, tagId: string) => {
    e.preventDefault();
    setMenuState({ x: e.clientX, y: e.clientY, tagId });
  };

  const handleCloseMenu = () => setMenuState(null);

  const currentMenuTag = tags.find((t) => t.id === menuState?.tagId);
  const targetTagForScope = scopeTagId ? tags.find((t) => t.id === scopeTagId) : null;


  // Thao tác chỉnh sửa
  const handleOpenRename = () => {
    if (!currentMenuTag) return;
    setEditTagId(currentMenuTag.id);
    setEditName(currentMenuTag.name);
    setEditColor(currentMenuTag.color);
    handleCloseMenu();
  };

  const handleSaveRename = () => {
    if (!editTagId || !editName.trim()) return;
    updateTag(editTagId, { name: editName.trim(), color: editColor });
    setEditTagId(null);
  };

  const handleOpenScope = () => {
    if (!currentMenuTag) return;
    setScopeTagId(currentMenuTag.id);
    setScopeProjectId(currentMenuTag.projectId ?? '');
    setScopeFolderId(currentMenuTag.folderId ?? '');
    handleCloseMenu();
  };

  const handleSaveScope = () => {
    if (!scopeTagId) return;
    updateTag(scopeTagId, {
      projectId: scopeProjectId || null,
      folderId: scopeFolderId || null,
    });
    setScopeTagId(null);
  };

  const handleToggleHide = () => {
    if (!currentMenuTag) return;
    updateTag(currentMenuTag.id, { isVisible: currentMenuTag.isVisible === false ? true : false });
    handleCloseMenu();
  };

  const handleDelete = () => {
    if (!currentMenuTag) return;
    if (confirm(`Bạn có chắc chắn muốn xóa nhãn "${currentMenuTag.name}"?`)) {
      deleteTag(currentMenuTag.id);
    }
    handleCloseMenu();
  };

  const handleAddTag = () => {
    if (!newName.trim()) return;
    addTag(newName.trim(), newColor);
    setNewName('');
    setIsAdding(false);
  };

  const getTagScopeText = (tag: any) => {
    if (tag.projectId) {
      const p = projects.find((x) => x.id === tag.projectId);
      return `Dự án: ${p?.name ?? 'Không xác định'}`;
    }
    if (tag.folderId) {
      const f = folders.find((x) => x.id === tag.folderId);
      return `Thư mục: ${f?.name ?? 'Không xác định'}`;
    }
    return 'Dùng chung';
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={sectionTitleStyle}>Tags List</div>
        {!isAdding ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setIsAdding(true)}
            style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
          >
            Add Tag
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setIsAdding(false)}
            style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Add Tag Inline Form */}
      {isAdding && (
        <div style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px dashed var(--divider)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <input
              type="text"
              autoFocus
              placeholder="Nhập tên tag..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="add-project-input"
              style={{ flex: 1, margin: 0 }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <button type="button" className="btn btn--primary btn--sm" onClick={handleAddTag} disabled={!newName.trim()}>
              Save
            </button>
          </div>
          <ColorPicker value={newColor} onChange={setNewColor} />
        </div>
      )}

      {/* Tags List */}
      {tags.length === 0 ? (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '8px 0' }}>
          Chưa có nhãn nào được tạo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={tagRowStyle(tag.isVisible !== false, menuState?.tagId === tag.id)}
              onContextMenu={(e) => handleContextMenu(e, tag.id)}
              title="Nhấp chuột phải để xem các tùy chọn"
            >
              {/* Color Dot */}
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: tag.color,
                  flexShrink: 0,
                }}
              />

              {/* Tag Name */}
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                {tag.name} {tag.isVisible === false && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Đang ẩn)</span>}
              </span>

              {/* Scope Badge */}
              <span style={scopeBadgeStyle}>{getTagScopeText(tag)}</span>

              {/* Toggle ẩn/hiện ở Sidebar */}
              <div
                style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}
                onClick={(e) => e.stopPropagation()}
                title={tag.isVisible !== false ? 'Click để ẩn nhãn trên sidebar' : 'Click để hiện nhãn trên sidebar'}
              >
                <Toggle
                  checked={tag.isVisible !== false}
                  onChange={(checked) => updateTag(tag.id, { isVisible: checked })}
                  size="sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
        * Nhấp chuột phải vào Tag để Rename, Assign Scope, Ẩn/Hiện hoặc Xóa.
      </div>

      {/* Context Menu */}
      <ContextMenu x={menuState?.x ?? 0} y={menuState?.y ?? 0} isOpen={!!menuState} onClose={handleCloseMenu}>
        <button type="button" style={menuBtnStyle} onClick={handleOpenRename}>
          Rename
        </button>
        <button type="button" style={menuBtnStyle} onClick={handleOpenScope}>
          Assign Scope (Chọn thư mục/dự án)
        </button>
        <button type="button" style={menuBtnStyle} onClick={handleToggleHide}>
          {currentMenuTag?.isVisible === false ? 'Show Tag (Hiện nhãn)' : 'Hide Tag (Ẩn nhãn)'}
        </button>
        <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
        <button type="button" style={{ ...menuBtnStyle, color: '#f25f5c' }} onClick={handleDelete}>
          Delete Tag
        </button>
      </ContextMenu>

      {/* Rename Dialog */}
      <Dialog isOpen={!!editTagId} onClose={() => setEditTagId(null)} title="Rename Tag">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            className="add-project-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            style={{ width: '100%', margin: 0 }}
            autoFocus
          />
          <ColorPicker value={editColor} onChange={setEditColor} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="apd-btn apd-btn--cancel" onClick={() => setEditTagId(null)}>
              Hủy
            </button>
            <button type="button" className="apd-btn apd-btn--ok" onClick={handleSaveRename} disabled={!editName.trim()}>
              Lưu
            </button>
          </div>
        </div>
      </Dialog>

      {/* Assign Scope Dialog */}
      <Dialog isOpen={!!scopeTagId} onClose={() => setScopeTagId(null)} title="Assign Scope for Tag">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {targetTagForScope && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-body)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Nhãn đang chọn: 
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: targetTagForScope.color }} />
                <strong>{targetTagForScope.name}</strong>
              </span>
            </div>
          )}
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Chọn dự án hoặc thư mục chứa nhãn này. Nhãn sẽ chỉ xuất hiện khi bạn đang xem dự án hoặc thư mục đó.
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Dự án
            </label>
            <select
              className="add-project-input"
              value={scopeProjectId}
              onChange={(e) => {
                setScopeProjectId(e.target.value);
                if (e.target.value) setScopeFolderId(''); // Clear folder scope if project scope is set
              }}
              style={{ width: '100%', margin: 0 }}
            >
              <option value="">Không có (Dùng chung / Toàn cục)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              Thư mục
            </label>
            <select
              className="add-project-input"
              value={scopeFolderId}
              onChange={(e) => {
                setScopeFolderId(e.target.value);
                if (e.target.value) setScopeProjectId(''); // Clear project scope if folder scope is set
              }}
              style={{ width: '100%', margin: 0 }}
            >
              <option value="">Không có (Dùng chung / Toàn cục)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="apd-btn apd-btn--cancel" onClick={() => setScopeTagId(null)}>
              Hủy
            </button>
            <button type="button" className="apd-btn apd-btn--ok" onClick={handleSaveScope}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TagsSettings;
