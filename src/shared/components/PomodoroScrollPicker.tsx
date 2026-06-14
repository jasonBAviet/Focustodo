import React, { useRef, useEffect, useCallback } from 'react';

interface ScrollColumnProps {
  items: number[];
  value: number;
  onChange: (val: number) => void;
  label: string;
  formatItem?: (v: number) => string;
}

const ITEM_HEIGHT = 44;
const VISIBLE = 5;

const ScrollColumn: React.FC<ScrollColumnProps> = ({ items, value, onChange, label, formatItem }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startScrollTop = useRef(0);

  const selectedIndex = items.indexOf(value);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    const target = index * ITEM_HEIGHT;
    if (smooth) {
      el.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      el.scrollTop = target;
    }
  }, []);

  useEffect(() => {
    if (selectedIndex >= 0) {
      scrollToIndex(selectedIndex, false);
    }
  }, [selectedIndex, scrollToIndex]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rawIndex, items.length - 1));
    if (items[clampedIndex] !== value) {
      onChange(items[clampedIndex]);
    }
  }, [items, value, onChange]);

  const handleScrollEnd = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rawIndex, items.length - 1));
    scrollToIndex(clampedIndex, true);
    onChange(items[clampedIndex]);
  }, [items, onChange, scrollToIndex]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startScrollTop.current = containerRef.current?.scrollTop ?? 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const delta = startY.current - e.clientY;
    containerRef.current.scrollTop = startScrollTop.current + delta;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    handleScrollEnd();
  };

  const handleItemClick = (index: number) => {
    scrollToIndex(index, true);
    onChange(items[index]);
  };

  const pad = Math.floor(VISIBLE / 2);
  const paddedItems = [
    ...Array(pad).fill(null),
    ...items,
    ...Array(pad).fill(null),
  ];

  return (
    <div className="psp-column">
      <div
        ref={containerRef}
        className="psp-scroll"
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {paddedItems.map((item, i) => {
          if (item === null) {
            return <div key={`pad-${i}`} className="psp-item psp-pad" />;
          }
          const realIndex = i - pad;
          const isSelected = item === value;
          return (
            <div
              key={item}
              className={`psp-item${isSelected ? ' psp-item--selected' : ''}`}
              onClick={() => handleItemClick(realIndex)}
            >
              {formatItem ? formatItem(item) : item}
            </div>
          );
        })}
      </div>
      <div className="psp-label">{label}</div>
      <style>{`
        .psp-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 0;
        }
        .psp-scroll {
          width: 100%;
          height: ${ITEM_HEIGHT * VISIBLE}px;
          overflow-y: scroll;
          scroll-snap-type: y mandatory;
          -ms-overflow-style: none;
          scrollbar-width: none;
          cursor: grab;
          user-select: none;
          position: relative;
        }
        .psp-scroll::-webkit-scrollbar { display: none; }
        .psp-scroll:active { cursor: grabbing; }
        .psp-item {
          height: ${ITEM_HEIGHT}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 400;
          color: var(--text-tertiary);
          scroll-snap-align: start;
          transition: color 0.15s, font-size 0.15s, font-weight 0.15s, opacity 0.15s;
          cursor: pointer;
          opacity: 0.45;
        }
        .psp-pad { cursor: default; }
        .psp-item--selected {
          color: var(--text-primary);
          font-size: 20px;
          font-weight: 600;
          opacity: 1;
        }
        .psp-label {
          font-size: 11px;
          color: var(--accent);
          font-weight: 500;
          margin-top: 6px;
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  );
};

interface PomodoroScrollPickerProps {
  estimate: number;
  onEstimateChange: (val: number) => void;
  pomoDuration: number;
  onClose: () => void;
}

const POMO_COUNTS = Array.from({ length: 21 }, (_, i) => i);
const POMO_LENGTHS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

const PomodoroScrollPicker: React.FC<PomodoroScrollPickerProps> = ({
  estimate,
  onEstimateChange,
  pomoDuration,
  onClose,
}) => {
  const [localEstimate, setLocalEstimate] = React.useState(estimate);
  const [localDuration, setLocalDuration] = React.useState(pomoDuration);
  const backdropRef = useRef<HTMLDivElement>(null);

  const totalMinutes = localEstimate * localDuration;

  const handleOk = () => {
    onEstimateChange(localEstimate);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      className="psp-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="psp-modal">
        <h3 className="psp-title">Estimated Pomodoro Time</h3>
        <p className="psp-subtitle">
          {localEstimate} x {localDuration}m = {totalMinutes}m
        </p>

        <div className="psp-columns-wrapper">
          <div className="psp-highlight-bar" />
          <ScrollColumn
            items={POMO_COUNTS}
            value={localEstimate}
            onChange={setLocalEstimate}
            label="Estimated Pomodoros"
          />
          <div className="psp-divider" />
          <ScrollColumn
            items={POMO_LENGTHS}
            value={localDuration}
            onChange={setLocalDuration}
            label="Pomodoro Length"
            formatItem={(v) => String(v)}
          />
        </div>

        <div className="psp-actions">
          <button className="psp-btn psp-btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="psp-btn psp-btn--ok" onClick={handleOk}>
            OK
          </button>
        </div>
      </div>

      <style>{`
        .psp-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(3px);
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: psp-fade-in 0.18s ease;
        }
        .psp-modal {
          background: var(--bg-dialog, #fff);
          border-radius: 20px;
          padding: 24px 20px 18px;
          width: 300px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.22);
          animation: psp-slide-up 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }
        .psp-title {
          text-align: center;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px;
        }
        .psp-subtitle {
          text-align: center;
          font-size: 12px;
          color: var(--text-tertiary);
          margin: 0 0 16px;
        }
        .psp-columns-wrapper {
          display: flex;
          align-items: stretch;
          gap: 0;
          position: relative;
          background: var(--bg-card, #f8f8f8);
          border-radius: 14px;
          overflow: hidden;
          padding: 0 8px;
        }
        .psp-highlight-bar {
          position: absolute;
          left: 8px;
          right: 8px;
          top: 50%;
          height: ${ITEM_HEIGHT}px;
          transform: translateY(-50%);
          background: var(--bg-card-hover, rgba(0,0,0,0.06));
          border-radius: 10px;
          pointer-events: none;
          z-index: 0;
        }
        .psp-divider {
          width: 1px;
          background: var(--border, #e5e7eb);
          margin: 12px 0;
          flex-shrink: 0;
        }
        .psp-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .psp-btn {
          flex: 1;
          height: 40px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s, transform 0.1s;
          font-family: var(--font-main);
        }
        .psp-btn:active { transform: scale(0.97); }
        .psp-btn--cancel {
          background: var(--bg-card, #f0f0f0);
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }
        .psp-btn--cancel:hover { background: var(--bg-card-hover); }
        .psp-btn--ok {
          background: var(--accent, #f25f5c);
          color: #fff;
        }
        .psp-btn--ok:hover { opacity: 0.88; }
        @keyframes psp-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes psp-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default PomodoroScrollPicker;
