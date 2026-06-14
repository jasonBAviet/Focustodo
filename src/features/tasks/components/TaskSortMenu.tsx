import React from 'react';
import ContextMenu from '@/shared/components/ContextMenu';

type SortOption = 'project' | 'createdAt' | 'dueDate' | 'priority' | null;
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

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--stat-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
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
    sortMenu.close();
  };

  return (
    <ContextMenu
      x={sortMenu.x}
      y={sortMenu.y}
      isOpen={sortMenu.isOpen}
      onClose={sortMenu.close}
    >
      <div className="cm-menu" style={{ width: 240 }}>
        <div className="cm-item" onClick={() => handleSortClick('project')}>
          <span className="cm-item-text">
            Sort by project {sortBy === 'project' && `(${sortDirection === 'asc' ? 'Asc' : 'Desc'})`}
          </span>
          {sortBy === 'project' && <IconCheck />}
        </div>
        <div className="cm-item" onClick={() => handleSortClick('createdAt')}>
          <span className="cm-item-text">
            Sort by creation date {sortBy === 'createdAt' && `(${sortDirection === 'asc' ? 'Asc' : 'Desc'})`}
          </span>
          {sortBy === 'createdAt' && <IconCheck />}
        </div>
        <div className="cm-item" onClick={() => handleSortClick('dueDate')}>
          <span className="cm-item-text">
            Sort by due date {sortBy === 'dueDate' && `(${sortDirection === 'asc' ? 'Asc' : 'Desc'})`}
          </span>
          {sortBy === 'dueDate' && <IconCheck />}
        </div>
        <div className="cm-item" onClick={() => handleSortClick('priority')}>
          <span className="cm-item-text">
            Sort by priority {sortBy === 'priority' && `(${sortDirection === 'asc' ? 'Asc' : 'Desc'})`}
          </span>
          {sortBy === 'priority' && <IconCheck />}
        </div>
        {sortBy && (
          <>
            <div className="cm-divider"></div>
            <div className="cm-item" onClick={() => { setSortBy(null); setSortDirection('asc'); sortMenu.close(); }}>
              <span className="cm-item-text">Clear sorting</span>
            </div>
          </>
        )}
      </div>
    </ContextMenu>
  );
};
