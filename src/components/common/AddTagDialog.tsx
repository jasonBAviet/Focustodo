import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { useAppContext } from '../../contexts/AppContext';
import ColorPicker from '../common/ColorPicker';

const AddTagDialog: React.FC = () => {
  const { addTag } = useTaskContext();
  const { openModal, setOpenModal } = useAppContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#f4a261');

  const isOpen = openModal === 'add-tag';

  const handleClose = () => {
    setOpenModal(null);
    setName('');
    setColor('#f4a261');
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    addTag(name.trim(), color);
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
