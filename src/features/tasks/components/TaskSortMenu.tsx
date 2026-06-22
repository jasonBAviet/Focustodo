import React from 'react';
import ContextMenu from '@/shared/components/ContextMenu';
import './TaskSortMenu.css';

type SortOption = 'project' | 'createdAt' | 'startDate' | 'dueDate' | 'priority' | null;
type SortDirection = 'asc' | 'desc';

export const IconSort = ({ direction }: { direction?: SortDirection }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {direction === 'asc' ? (
      <path d="M8 16l-2-2h2V4M16 4v10h2l-2 2M4 20h16"/>
    ) : direction === 'desc' ? (
      <path d="M8 4l-2 2h2v10M16 20v-10h2l-2-2M4 4h16"/>
    ) : (
      <path d="M8 8l-2 2h2v10M16 4v16M12 16l4 4 4-4"/>
    )}
  </svg>
);

const IconProject = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const IconCalendarAdd = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconAlertCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const IconFlag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
    <line x1="4" y1="22" x2="4" y2="15"></line>
  </svg>
);

const IconRotateCcw = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
  </svg>
);

const IconArrow = ({ direction }: { direction: SortDirection }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: direction === 'desc' ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--transition-normal)'
    }}
  >
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

interface TaskSortMenuProps {
  sortMenu: {
    x: number;
    y: number;
    isOpen: boolean;
    close: () => void;
  };
  sortBy: SortOption;
  sortDirection: SortDirection;
  setSortBy: (field: SortOption) => void;
  setSortDirection: (dir: SortDirection) => void;
}

export const TaskSortMenu: React.FC<TaskSortMenuProps> = ({
  sortMenu, sortBy, sortDirection, setSortBy, setSortDirection
}) => {
  const handleSortClick = (field: SortOption) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const handleClear = () => {
    setSortBy(null);
    setSortDirection('asc');
    sortMenu.close();
  };

  return (
    <ContextMenu
      x={sortMenu.x}
      y={sortMenu.y}
      isOpen={sortMenu.isOpen}
      onClose={sortMenu.close}
    >
      <div className="tsm-menu">
        <div className="tsm-header">Sort Tasks By</div>
        
        <button
          className={`tsm-item ${sortBy === 'project' ? 'active' : ''}`}
          onClick={() => handleSortClick('project')}
        >
          <span className="tsm-icon-left"><IconProject /></span>
          <span className="tsm-text">Project</span>
          {sortBy === 'project' && (
            <span className="tsm-arrow-right">
              <IconArrow direction={sortDirection} />
            </span>
          )}
        </button>

        <button
          className={`tsm-item ${sortBy === 'createdAt' ? 'active' : ''}`}
          onClick={() => handleSortClick('createdAt')}
        >
          <span className="tsm-icon-left"><IconCalendarAdd /></span>
          <span className="tsm-text">Creation Date</span>
          {sortBy === 'createdAt' && (
            <span className="tsm-arrow-right">
              <IconArrow direction={sortDirection} />
            </span>
          )}
        </button>

        <button
          className={`tsm-item ${sortBy === 'startDate' ? 'active' : ''}`}
          onClick={() => handleSortClick('startDate')}
        >
          <span className="tsm-icon-left"><IconPlay /></span>
          <span className="tsm-text">Start Date</span>
          {sortBy === 'startDate' && (
            <span className="tsm-arrow-right">
              <IconArrow direction={sortDirection} />
            </span>
          )}
        </button>

        <button
          className={`tsm-item ${sortBy === 'dueDate' ? 'active' : ''}`}
          onClick={() => handleSortClick('dueDate')}
        >
          <span className="tsm-icon-left"><IconAlertCircle /></span>
          <span className="tsm-text">Due Date</span>
          {sortBy === 'dueDate' && (
            <span className="tsm-arrow-right">
              <IconArrow direction={sortDirection} />
            </span>
          )}
        </button>

        <button
          className={`tsm-item ${sortBy === 'priority' ? 'active' : ''}`}
          onClick={() => handleSortClick('priority')}
        >
          <span className="tsm-icon-left"><IconFlag /></span>
          <span className="tsm-text">Priority</span>
          {sortBy === 'priority' && (
            <span className="tsm-arrow-right">
              <IconArrow direction={sortDirection} />
            </span>
          )}
        </button>

        {sortBy && (
          <>
            <div className="tsm-divider"></div>
            <button className="tsm-clear-btn" onClick={handleClear}>
              <IconRotateCcw />
              <span>Clear Sorting</span>
            </button>
          </>
        )}
      </div>
    </ContextMenu>
  );
};
