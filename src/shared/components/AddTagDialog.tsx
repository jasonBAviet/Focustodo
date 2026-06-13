import React, { useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import ColorPicker from '@/shared/components/ColorPicker';

const AddTagDialog: React.FC = () => {
  const { addTag, folders, projects } = useTaskContext();
  const { openModal, setOpenModal } = useAppContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f4a261');
  const [folderId, setFolderId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  const isOpen = openModal === 'add-tag';

  const handleClose = () => {
    setOpenModal(null);
    setName('');
    setColor('#f4a261');
    setFolderId('');
    setProjectId('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addTag(name.trim(), color, { projectId: projectId || null, folderId: folderId || null });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="add-project-dialog animate-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-project-title">New Tag</h3>
        <input
          autoFocus
          className="add-project-input"
          placeholder="Tag name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleClose(); }}
        />
        <select
          className="add-project-input"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          style={{ cursor: 'pointer' }}
          aria-label="Thư mục (dùng chung nếu để trống)"
        >
          <option value="">Thư mục: Không có (dùng chung)</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select
          className="add-project-input"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          style={{ cursor: 'pointer' }}
          aria-label="Dự án (dùng chung nếu để trống)"
        >
          <option value="">Dự án: Không có (dùng chung)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ColorPicker value={color} onChange={setColor} />
        <div className="add-project-footer">
          <button className="apd-btn apd-btn--cancel" onClick={handleClose}>Cancel</button>
          <button className="apd-btn apd-btn--ok" onClick={handleSubmit} disabled={!name.trim()}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default AddTagDialog;
