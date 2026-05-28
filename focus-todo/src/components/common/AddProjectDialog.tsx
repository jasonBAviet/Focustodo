import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAppContext } from '../../contexts/AppContext';
import ColorPicker from '../common/ColorPicker';

const AddProjectDialog: React.FC = () => {
  const { addProject } = useTaskContext();
  const { openModal, setOpenModal } = useAppContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#4361ee');

  const isOpen = openModal === 'add-project';

  const handleClose = () => {
    setOpenModal(null);
    setName('');
    setColor('#4361ee');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addProject(name.trim(), color);
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
        <ColorPicker value={color} onChange={setColor} />
        <div className="add-project-footer">
          <button className="apd-btn apd-btn--cancel" onClick={handleClose}>Cancel</button>
          <button className="apd-btn apd-btn--ok" onClick={handleSubmit} disabled={!name.trim()}>OK</button>
        </div>
      </div>

      <style>{`
        .dialog-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: var(--bg-overlay);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          animation: fade-in 150ms ease both;
        }
        .add-project-dialog {
          background: var(--bg-dialog);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--space-6);
          width: 360px;
          box-shadow: var(--shadow-lg);
        }
        .add-project-title {
          font-size: var(--text-lg); font-weight: 600;
          color: var(--text-primary); text-align: center;
          margin-bottom: var(--space-4);
        }
        .add-project-input {
          width: 100%; background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px 12px; color: var(--text-primary);
          font-size: var(--text-base); font-family: var(--font-main);
          outline: none; margin-bottom: var(--space-4);
          transition: border-color var(--transition-fast);
        }
        .add-project-input:focus { border-color: var(--accent); }
        .add-project-input::placeholder { color: var(--text-tertiary); }
        .add-project-footer {
          display: flex; gap: var(--space-3); justify-content: flex-end;
          margin-top: var(--space-4);
        }
        .apd-btn {
          padding: 8px 24px; border-radius: var(--radius-md);
          border: 1px solid var(--border); cursor: pointer;
          font-size: var(--text-sm); font-family: var(--font-main);
          font-weight: 500; transition: all var(--transition-fast);
        }
        .apd-btn--cancel {
          background: none; color: var(--text-secondary);
        }
        .apd-btn--cancel:hover { background: var(--glass-bg-hover); }
        .apd-btn--ok {
          background: var(--accent); color: white; border-color: var(--accent);
        }
        .apd-btn--ok:hover:not(:disabled) { background: var(--accent-hover); }
        .apd-btn--ok:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default AddProjectDialog;
