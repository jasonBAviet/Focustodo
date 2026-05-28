import React, { useId } from 'react';

// ============================================================
// TOGGLE SWITCH COMPONENT
// ============================================================

export type ToggleSize = 'sm' | 'md';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: ToggleSize;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}) => {
  const id = useId();

  const handleChange = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange();
    }
  };

  return (
    <>
      <style>{`
        .toggle-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          cursor: pointer;
          user-select: none;
        }
        .toggle-wrapper.toggle--disabled {
          opacity: 0.45;
          cursor: not-allowed;
          pointer-events: none;
        }
        .toggle-label {
          font-size: var(--text-sm);
          color: var(--text-primary);
          flex: 1;
        }
        /* Track */
        .toggle-track {
          position: relative;
          border-radius: var(--radius-full);
          background: var(--bg-input);
          border: 1px solid var(--border);
          transition:
            background var(--transition-normal),
            border-color var(--transition-normal);
          flex-shrink: 0;
          outline: none;
        }
        .toggle-track:focus-visible {
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .toggle-track.toggle--md {
          width: 40px;
          height: 22px;
        }
        .toggle-track.toggle--sm {
          width: 32px;
          height: 18px;
        }
        .toggle-track.toggle--checked {
          background: var(--accent);
          border-color: var(--accent);
        }
        /* Thumb */
        .toggle-thumb {
          position: absolute;
          top: 50%;
          border-radius: 50%;
          background: #fff;
          box-shadow: var(--shadow-sm);
          transform: translateY(-50%) translateX(var(--thumb-x, 2px));
          transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .toggle--md .toggle-thumb {
          width: 16px;
          height: 16px;
          --thumb-x: 2px;
        }
        .toggle--sm .toggle-thumb {
          width: 12px;
          height: 12px;
          --thumb-x: 2px;
        }
        .toggle--md.toggle--checked .toggle-thumb {
          --thumb-x: 20px;
          transform: translateY(-50%) translateX(20px);
        }
        .toggle--sm.toggle--checked .toggle-thumb {
          transform: translateY(-50%) translateX(16px);
        }
      `}</style>
      <label
        htmlFor={id}
        className={`toggle-wrapper${disabled ? ' toggle--disabled' : ''}`}
      >
        {label && (
          <span className="toggle-label">{label}</span>
        )}
        <div
          id={id}
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          className={[
            'toggle-track',
            `toggle--${size}`,
            checked ? 'toggle--checked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={handleChange}
          onKeyDown={handleKeyDown}
        >
          <span className="toggle-thumb" />
        </div>
      </label>
    </>
  );
};

export default Toggle;
