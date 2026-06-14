import React, { useRef, useCallback } from 'react';

// ============================================================
// BUTTON COMPONENT
// ============================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  leftIcon,
  rightIcon,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      // Ripple effect
      const btn = buttonRef.current;
      if (btn) {
        const ripple = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          animation: ripple 500ms ease-out forwards;
          pointer-events: none;
        `;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
      }

      onClick?.(e);
    },
    [disabled, onClick]
  );

  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    disabled ? 'btn--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{`
        .btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-main);
          font-weight: 500;
          cursor: pointer;
          transition:
            background var(--transition-fast),
            color var(--transition-fast),
            border-color var(--transition-fast),
            box-shadow var(--transition-fast),
            transform var(--transition-fast);
          user-select: none;
          white-space: nowrap;
          text-decoration: none;
          outline: none;
        }
        .btn:active:not(.btn--disabled) {
          transform: scale(0.97);
        }
        /* Size */
        .btn--sm {
          padding: var(--space-1) var(--space-3);
          font-size: var(--text-xs);
          height: 28px;
        }
        .btn--md {
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          height: 34px;
        }
        .btn--lg {
          padding: var(--space-3) var(--space-5);
          font-size: var(--text-base);
          height: 42px;
        }
        /* Full width */
        .btn--full {
          width: 100%;
        }
        /* Variant: primary */
        .btn--primary {
          background: var(--accent);
          color: var(--text-on-accent);
          border: 1px solid transparent;
        }
        .btn--primary:hover:not(.btn--disabled) {
          background: var(--accent-hover);
          box-shadow: var(--shadow-accent);
        }
        /* Variant: secondary */
        .btn--secondary {
          background: transparent;
          color: var(--accent);
          border: 1px solid var(--accent);
        }
        .btn--secondary:hover:not(.btn--disabled) {
          background: var(--accent-soft);
        }
        /* Variant: ghost */
        .btn--ghost {
          background: transparent;
          color: var(--text-secondary);
          border: none;
        }
        .btn--ghost:hover:not(.btn--disabled) {
          background: var(--bg-card-hover);
          color: var(--text-primary);
        }
        /* Variant: danger */
        .btn--danger {
          background: var(--priority-high);
          color: #fff;
          border: 1px solid transparent;
        }
        .btn--danger:hover:not(.btn--disabled) {
          background: #d94e4b;
          box-shadow: 0 4px 16px rgba(242,95,92,0.35);
        }
        /* Disabled */
        .btn--disabled {
          opacity: 0.45;
          cursor: not-allowed;
          pointer-events: none;
        }
        .btn-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
      `}</style>
      <button
        ref={buttonRef}
        type={type}
        className={classes}
        onClick={handleClick}
        disabled={disabled}
      >
        {leftIcon && <span className="btn-icon">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="btn-icon">{rightIcon}</span>}
      </button>
    </>
  );
};

export default Button;
