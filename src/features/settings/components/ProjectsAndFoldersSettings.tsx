// ============================================================
// FOCUS TO-DO - ProjectsAndFoldersSettings
// Quản lý Smart Views + cây thư mục & dự án + chuột phải tương tác
// ============================================================
import React, { useState } from 'react';
import { useAppContext } from '@/core/contexts/AppContext';
import { useTaskContext } from '@/features/tasks/TaskContext';
import Toggle from '@/shared/components/Toggle';
import ContextMenu from '@/shared/components/ContextMenu';
import ColorPicker from '@/shared/components/ColorPicker';
import Dialog from '@/shared/components/Dialog';
import { getRootFolders, getChildFolders, isAncestor } from '@/utils/folderUtils';

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

const sectionTitleStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, marginTop: 20 };
const viewRowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '6px 0' };

const itemRowStyle = (isVisible: boolean, isActive: boolean, depth: number): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, padding: '8px 12px',
  paddingLeft: depth > 0 ? depth * 20 + 12 : 12, borderRadius: 'var(--radius-md)',
  background: isActive ? 'var(--accent-soft)' : 'var(--bg-card)', border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
  opacity: isVisible ? 1 : 0.55, cursor: 'context-menu', transition: 'background var(--transition-fast), opacity var(--transition-fast)',
});

const menuBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', width: '100%', padding: '8px 16px', background: 'transparent', border: 'none', textAlign: 'left', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-sm)', gap: 8, borderRadius: 'var(--radius-xs)' };


const ProjectsAndFoldersSettings: React.FC = () => {
  const { settings, updateSettings } = useAppContext();
  const { projects, folders, updateProject, updateFolder, deleteProject, deleteFolder } = useTaskContext();

  const [menuState, setMenuState] = useState<{ x: number; y: number; id: string; type: 'project' | 'folder' } | null>(null);

  // Edit States (Dùng chung cho cả project/folder)
  const [editState, setEditState] = useState<{ id: string; type: 'project' | 'folder'; name: string; color: string } | null>(null);

  // Reassign States
  const [moveProjectState, setMoveProjectState] = useState<{ projectId: string; folderId: string } | null>(null);
  const [moveFolderState, setMoveFolderState] = useState<{ folderId: string; parentId: string } | null>(null);

  const toggleView = (key: string, val: boolean) => {
    updateSettings({
      visibleViews: { ...settings.visibleViews, [key]: val },
    });
  };

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'project' | 'folder') => {
    e.preventDefault();
    setMenuState({ x: e.clientX, y: e.clientY, id, type });
  };

  const handleCloseMenu = () => setMenuState(null);

  const currentFolder = menuState?.type === 'folder' ? folders.find((f) => f.id === menuState.id) : null;
  const currentProject = menuState?.type === 'project' ? projects.find((p) => p.id === menuState.id) : null;

  const targetProjectForMove = moveProjectState ? projects.find((p) => p.id === moveProjectState.projectId) : null;
  const targetFolderForMove = moveFolderState ? folders.find((f) => f.id === moveFolderState.folderId) : null;


  // 1. Rename / Edit Color
  const handleOpenRename = () => {
    if (menuState?.type === 'folder' && currentFolder) {
      setEditState({ id: currentFolder.id, type: 'folder', name: currentFolder.name, color: currentFolder.color });
    } else if (menuState?.type === 'project' && currentProject) {
      setEditState({ id: currentProject.id, type: 'project', name: currentProject.name, color: currentProject.color });
    }
    handleCloseMenu();
  };

  const handleSaveRename = () => {
    if (!editState || !editState.name.trim()) return;
    if (editState.type === 'folder') {
      updateFolder(editState.id, { name: editState.name.trim(), color: editState.color });
    } else {
      updateProject(editState.id, { name: editState.name.trim(), color: editState.color });
    }
    setEditState(null);
  };

  // 2. Hide / Show
  const handleToggleHide = () => {
    if (menuState?.type === 'folder' && currentFolder) {
      updateFolder(currentFolder.id, { isVisible: currentFolder.isVisible === false ? true : false });
    } else if (menuState?.type === 'project' && currentProject) {
      updateProject(currentProject.id, { isVisible: currentProject.isVisible === false ? true : false });
    }
    handleCloseMenu();
  };

  // 3. Move Folder / Move Project
  const handleOpenMove = () => {
    if (menuState?.type === 'folder' && currentFolder) {
      setMoveFolderState({ folderId: currentFolder.id, parentId: currentFolder.parentId ?? '' });
    } else if (menuState?.type === 'project' && currentProject) {
      setMoveProjectState({ projectId: currentProject.id, folderId: currentProject.folderId ?? '' });
    }
    handleCloseMenu();
  };

  const handleSaveMoveProject = () => {
    if (!moveProjectState) return;
    updateProject(moveProjectState.projectId, { folderId: moveProjectState.folderId || null });
    setMoveProjectState(null);
  };

  const handleSaveMoveFolder = () => {
    if (!moveFolderState) return;
    // Chống vòng lặp
    if (moveFolderState.parentId === moveFolderState.folderId) return;
    if (moveFolderState.parentId && isAncestor(folders, moveFolderState.folderId, moveFolderState.parentId)) {
      alert('Không thể di chuyển thư mục vào bên trong cây thư mục con của nó.');
      return;
    }
    updateFolder(moveFolderState.folderId, { parentId: moveFolderState.parentId || null });
    setMoveFolderState(null);
  };

  // 4. Delete
  const handleDelete = () => {
    if (menuState?.type === 'folder' && currentFolder) {
      if (confirm(`Bạn có chắc chắn muốn xóa thư mục "${currentFolder.name}"? Các dự án con sẽ được đưa ra ngoài.`)) {
        deleteFolder(currentFolder.id);
      }
    } else if (menuState?.type === 'project' && currentProject) {
      if (confirm(`Bạn có chắc chắn muốn xóa dự án "${currentProject.name}"?`)) {
        deleteProject(currentProject.id);
      }
    }
    handleCloseMenu();
  };

  // Vẽ đệ quy cây folder & projects
  const renderFolderNode = (folder: any, depth = 0): React.ReactNode => {
    const childFolders = getChildFolders(folders, folder.id);
    const childProjects = projects.filter((p) => p.folderId === folder.id);
    const isMenuOpened = menuState?.id === folder.id && menuState?.type === 'folder';

    return (
      <React.Fragment key={folder.id}>
        <div
          style={itemRowStyle(folder.isVisible !== false, isMenuOpened, depth)}
          onContextMenu={(e) => handleContextMenu(e, folder.id, 'folder')}
        >
          {/* Folder Icon */}
          <span style={{ color: folder.color, display: 'flex', alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {folder.name} {folder.isVisible === false && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Đang ẩn)</span>}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.8, marginRight: 4 }}>Thư mục</span>
          <Toggle
            checked={folder.isVisible !== false}
            onChange={(val) => updateFolder(folder.id, { isVisible: val })}
            size="sm"
          />
        </div>
        {/* Render child folders */}
        {childFolders.map((cf) => renderFolderNode(cf, depth + 1))}
        {/* Render child projects */}
        {childProjects.map((p) => renderProjectNode(p, depth + 1))}
      </React.Fragment>
    );
  };

  const renderProjectNode = (project: any, depth = 0): React.ReactNode => {
    const isMenuOpened = menuState?.id === project.id && menuState?.type === 'project';
    return (
      <div
        key={project.id}
        style={itemRowStyle(project.isVisible !== false, isMenuOpened, depth)}
        onContextMenu={(e) => handleContextMenu(e, project.id, 'project')}
      >
        {/* Project Dot */}
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: project.color,
            flexShrink: 0,
          }}
        />
        <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
          {project.name} {project.isVisible === false && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Đang ẩn)</span>}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.8, marginRight: 4 }}>Dự án</span>
        <Toggle
          checked={project.isVisible !== false}
          onChange={(val) => updateProject(project.id, { isVisible: val })}
          size="sm"
        />
      </div>
    );
  };

  return (
    <div>
      {/* Smart Views */}
      <div style={sectionTitleStyle}>Smart Views</div>
      <div>
        {SMART_VIEWS.map((view) => (
          <div key={view.key} style={viewRowStyle}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: view.color }}>
              <path d={view.iconPath} stroke={view.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{view.label}</span>
            <Toggle checked={settings.visibleViews?.[view.key] ?? false} onChange={(val) => toggleView(view.key, val)} size="sm" />
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />

      {/* Projects and Folders List */}
      <div style={sectionTitleStyle}>Projects & Folders Tree</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* 1. Render Folders ở gốc (parentId = null) */}
        {getRootFolders(folders).map((f) => renderFolderNode(f, 0))}

        {/* 2. Render Project ở gốc (folderId = null) */}
        {projects.filter((p) => !p.folderId).map((p) => renderProjectNode(p, 0))}

        {folders.length === 0 && projects.length === 0 && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', padding: '8px 0' }}>
            Chưa có thư mục hoặc dự án nào.
          </div>
        )}
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
        * Nhấp chuột phải vào Dự án/Thư mục để đổi tên, chọn lại thư mục, ẩn/hiện hoặc xóa.
      </div>

      {/* Context Menu */}
      <ContextMenu x={menuState?.x ?? 0} y={menuState?.y ?? 0} isOpen={!!menuState} onClose={handleCloseMenu}>
        <button type="button" style={menuBtnStyle} onClick={handleOpenRename}>
          Rename
        </button>
        <button type="button" style={menuBtnStyle} onClick={handleOpenMove}>
          {menuState?.type === 'folder' ? 'Move Folder (Chọn thư mục cha)' : 'Move Project (Chọn thư mục chứa)'}
        </button>
        <button type="button" style={menuBtnStyle} onClick={handleToggleHide}>
          {menuState?.type === 'folder'
            ? currentFolder?.isVisible === false
              ? 'Show Folder (Hiện thư mục)'
              : 'Hide Folder (Ẩn thư mục)'
            : currentProject?.isVisible === false
            ? 'Show Project (Hiện dự án)'
            : 'Hide Project (Ẩn dự án)'}
        </button>
        <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
        <button type="button" style={{ ...menuBtnStyle, color: '#f25f5c' }} onClick={handleDelete}>
          {menuState?.type === 'folder' ? 'Delete Folder' : 'Delete Project'}
        </button>
      </ContextMenu>

      {/* Edit Dialog (Rename & Color) */}
      <Dialog isOpen={!!editState} onClose={() => setEditState(null)} title={editState?.type === 'folder' ? 'Edit Folder' : 'Edit Project'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            className="add-project-input"
            value={editState?.name ?? ''}
            onChange={(e) => setEditState(prev => prev ? { ...prev, name: e.target.value } : null)}
            style={{ width: '100%', margin: 0 }}
            autoFocus
          />
          <ColorPicker value={editState?.color ?? '#7ec8e3'} onChange={(color) => setEditState(prev => prev ? { ...prev, color } : null)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="apd-btn apd-btn--cancel" onClick={() => setEditState(null)}>
              Hủy
            </button>
            <button type="button" className="apd-btn apd-btn--ok" onClick={handleSaveRename} disabled={!editState?.name.trim()}>
              Lưu
            </button>
          </div>
        </div>
      </Dialog>

      {/* Move Project Dialog */}
      <Dialog isOpen={!!moveProjectState} onClose={() => setMoveProjectState(null)} title="Move Project to Folder">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {targetProjectForMove && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-body)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)' }}>
              Dự án đang chọn: <strong>{targetProjectForMove.name}</strong>
            </div>
          )}
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Chọn thư mục chứa dự án này. Chọn "Không có" để chuyển thành dự án độc lập ngoài gốc.
          </div>
          <div>
            <select
              className="add-project-input"
              value={moveProjectState?.folderId ?? ''}
              onChange={(e) => setMoveProjectState(prev => prev ? { ...prev, folderId: e.target.value } : null)}
              style={{ width: '100%', margin: 0 }}
            >
              <option value="">Không có (Dự án độc lập ở gốc)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="apd-btn apd-btn--cancel" onClick={() => setMoveProjectState(null)}>
              Hủy
            </button>
            <button type="button" className="apd-btn apd-btn--ok" onClick={handleSaveMoveProject}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </Dialog>

      {/* Move Folder Dialog */}
      <Dialog isOpen={!!moveFolderState} onClose={() => setMoveFolderState(null)} title="Move Folder to parent Folder">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {targetFolderForMove && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', background: 'var(--bg-body)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent)' }}>
              Thư mục đang chọn: <strong>{targetFolderForMove.name}</strong>
            </div>
          )}
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Chọn thư mục cha chứa thư mục này. Chọn "Không có" để đưa ra gốc làm thư mục cao nhất.
          </div>
          <div>
            <select
              className="add-project-input"
              value={moveFolderState?.parentId ?? ''}
              onChange={(e) => setMoveFolderState(prev => prev ? { ...prev, parentId: e.target.value } : null)}
              style={{ width: '100%', margin: 0 }}
            >
              <option value="">Không có (Thư mục gốc)</option>
              {folders
                .filter((f) => f.id !== moveFolderState?.folderId && !isAncestor(folders, moveFolderState?.folderId ?? '', f.id))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="apd-btn apd-btn--cancel" onClick={() => setMoveFolderState(null)}>
              Hủy
            </button>
            <button type="button" className="apd-btn apd-btn--ok" onClick={handleSaveMoveFolder}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ProjectsAndFoldersSettings;
