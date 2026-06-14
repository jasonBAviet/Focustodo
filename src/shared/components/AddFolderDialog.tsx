import React, { useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import ColorPicker from '@/shared/components/ColorPicker';

const AddFolderDialog: React.FC = () => {
  const { addFolder, folders } = useTaskContext();
  const { openModal, setOpenModal } = useAppContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7ec8e3');
  const [parentId, setParentId] = useState<string>('');

  const isOpen = openModal === 'add-folder';

  const handleClose = () => {
    setOpenModal(null);
    setName('');
    setColor('#7ec8e3');
    setParentId('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addFolder(name.trim(), color, parentId || null);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="add-project-dialog animate-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-project-title">New Folder</h3>
        <input
          autoFocus
          className="add-project-input"
          placeholder="Folder name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleClose(); }}
        />
        <select
          className="add-project-input"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          style={{ cursor: 'pointer' }}
          aria-label="Parent folder"
        >
          <option value="">Top level (no parent)</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
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

export default AddFolderDialog;
