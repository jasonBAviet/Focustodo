import React, { useState, useMemo } from 'react';
import type { ActivityData } from '@/features/reports/components/taskActivityChartHelpers';

interface TaskActivityTableProps {
  data: ActivityData[];
}

const TaskActivityTable: React.FC<TaskActivityTableProps> = ({ data }) => {
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Lọc dữ liệu hiển thị dựa trên tuỳ chọn
  const filteredData = useMemo(() => {
    if (!showActiveOnly) return data;
    return data.filter(
      (d) => d.createdCount > 0 || d.completedCount > 0 || d.overdueCount > 0
    );
  }, [data, showActiveOnly]);

  // Tính tổng số lượng trong chu kỳ hiện tại
  const totals = useMemo(() => {
    return data.reduce(
      (acc, curr) => {
        acc.created += curr.createdCount;
        acc.completed += curr.completedCount;
        acc.overdue += curr.overdueCount;
        return acc;
      },
      { created: 0, completed: 0, overdue: 0 }
    );
  }, [data]);

  return (
    <div className="task-activity-table-container">
      <div className="table-header-actions">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
          />
          Only show dates/times with activity
        </label>
      </div>

      <div className="table-scroll-container">
        {filteredData.length > 0 ? (
          <table className="activity-table">
            <thead>
              <tr>
                <th>Time</th>
                <th style={{ textAlign: 'center' }}>Created</th>
                <th style={{ textAlign: 'center' }}>Completed</th>
                <th style={{ textAlign: 'center' }}>Overdue</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx} className={row.overdueCount > 0 ? 'row-has-overdue' : ''}>
                  <td className="time-cell">
                    <span className="time-label">{row.label}</span>
                    <span className="date-subtext">({row.dateLabel})</span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: row.createdCount > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                    {row.createdCount || '-'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: row.completedCount > 0 ? '#4361ee' : 'var(--text-tertiary)' }}>
                    {row.completedCount || '-'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500, color: row.overdueCount > 0 ? '#f25f5c' : 'var(--text-tertiary)' }}>
                    {row.overdueCount || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>{totals.created}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#4361ee' }}>{totals.completed}</td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#f25f5c' }}>{totals.overdue}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div className="empty-table-state">
            No activity recorded.
          </div>
        )}
      </div>

      <style>{`
        .task-activity-table-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .table-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: var(--text-xs);
          color: var(--text-secondary);
          cursor: pointer;
          user-select: none;
          font-weight: 500;
        }
        .toggle-label input {
          cursor: pointer;
        }
        .table-scroll-container {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-main);
        }
        .activity-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        .activity-table th {
          position: sticky;
          top: 0;
          background: var(--bg-card);
          padding: 10px 14px;
          text-align: left;
          font-weight: 600;
          font-size: var(--text-xs);
          color: var(--text-secondary);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
          z-index: 1;
        }
        .activity-table td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
        }
        .activity-table tbody tr:hover {
          background: var(--glass-bg-hover);
        }
        .activity-table tfoot {
          position: sticky;
          bottom: 0;
          background: var(--bg-card);
          font-weight: 600;
          border-top: 2px solid var(--border);
          z-index: 1;
        }
        .activity-table tfoot td {
          border-bottom: none;
        }
        .time-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .time-label {
          font-weight: 500;
        }
        .date-subtext {
          font-size: 10px;
          color: var(--text-tertiary);
        }
        .row-has-overdue {
          background: rgba(242, 95, 92, 0.02);
        }
        .empty-table-state {
          padding: 30px;
          text-align: center;
          color: var(--text-tertiary);
          font-size: var(--text-sm);
        }
      `}</style>
    </div>
  );
};

export default TaskActivityTable;
