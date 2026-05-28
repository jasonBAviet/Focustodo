import React, { useEffect, useRef, useState } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, isOpen, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: y, left: x });

  useEffect(() => {
    if (isOpen) {
      const handleOutsideClick = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      };
      
      const handleScroll = () => {
        onClose();
      };

      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('scroll', handleScroll, true);
      
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newTop = y;
      let newLeft = x;
      
      // Ensure menu doesn't flow off screen
      if (y + rect.height > window.innerHeight) {
        newTop = Math.max(10, window.innerHeight - rect.height - 10);
      }
      if (x + rect.width > window.innerWidth) {
        newLeft = Math.max(10, window.innerWidth - rect.width - 10);
      }
      
      setPosition({ top: newTop, left: newLeft });
    }
  }, [isOpen, x, y, children]); // Re-calculate if children changes (submenus might expand)

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        background: 'var(--bg-dialog, #fff)',
        boxShadow: 'var(--shadow-xl, 0 10px 25px rgba(0,0,0,0.1))',
        border: '1px solid var(--border-strong, #ddd)',
        borderRadius: 'var(--radius-md, 8px)',
        minWidth: '220px',
        padding: '8px 0',
        color: 'var(--text-primary)',
        fontSize: 'var(--text-sm)',
        fontFamily: 'var(--font-main)'
      }}
      className="context-menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

export default ContextMenu;
