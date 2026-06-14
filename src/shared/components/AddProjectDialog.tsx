import React, { useState } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useAppContext } from '@/core/contexts/AppContext';
import ColorPicker from '@/shared/components/ColorPicker';

const AddProjectDialog: React.FC = () => {
  const { addProject, folders } = useTaskContext();
  const { openModal, setOpenModal } = useAppContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4361ee');
  const [folderId, setFolderId] = useState<string>('');

  const isOpen = openModal === 'add-project';

  const handleClose = () => {
    setOpenModal(null);
    setName('');
    setColor('#4361ee');
    setFolderId('');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addProject(name.trim(), color, folderId || null);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="add-project-dialog animate-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="add-project-title">Add Project</h3>
        <input
          autoFocus
          className="add-project-input"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') handleClose(); }}
        />
        <select
          className="add-project-input"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          style={{ cursor: 'pointer' }}
          aria-label="Folder"
        >
          <option value="">Folder: None</option>
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

export default AddProjectDialog;
