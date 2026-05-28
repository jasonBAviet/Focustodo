import React from 'react';
import { PROJECT_COLORS } from '../../types';

// ============================================================
// COLOR PICKER COMPONENT
// ============================================================

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  colors = PROJECT_COLORS,
}) => {
  return (
    <>
      <style>{`
        .color-picker-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: var(--space-2);
          padding: var(--space-1);
        }
        .color-swatch {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            transform var(--transition-fast),
            border-color var(--transition-fast),
            box-shadow var(--transition-fast);
          outline: none;
          flex-shrink: 0;
        }
        .color-swatch:hover {
          transform: scale(1.15);
        }
        .color-swatch:focus-visible {
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .color-swatch.color-swatch--active {
          border-color: #fff;
          box-shadow:
            0 0 0 3px rgba(255,255,255,0.3),
            var(--shadow-sm);
          transform: scale(1.1);
        }
        .color-swatch-check {
          display: none;
          color: #fff;
          font-size: 14px;
          line-height: 1;
          font-weight: 700;
        }
        .color-swatch--active .color-swatch-check {
          display: block;
        }
      `}</style>
      <div className="color-picker-grid" role="listbox" aria-label="Chon mau">
        {colors.map((color) => {
          const isActive = color.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={color}
              role="option"
              aria-selected={isActive}
              aria-label={`Mau ${color}`}
              className={`color-swatch${isActive ? ' color-swatch--active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
              type="button"
            >
              <span className="color-swatch-check">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7l3.5 3.5L12 3"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

export default ColorPicker;
