import React, { useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import { getPeakHoursData } from './peakHoursHelpers';

interface PeakHoursHeatmapProps {
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
}

const PeakHoursHeatmap: React.FC<PeakHoursHeatmapProps> = ({
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
}) => {
  const { tasks, pomodoroSessions, projects } = useTaskContext();

  const hoursData = useMemo(() => {
    return getPeakHoursData(
      tasks,
      pomodoroSessions,
      { selectedFolderId, selectedProjectId, selectedTagId },
      projects
    );
  }, [tasks, pomodoroSessions, selectedFolderId, selectedProjectId, selectedTagId, projects]);

  const maxMinutes = Math.max(...hoursData, 1); // Avoid div by zero

  const hasData = hoursData.some(m => m > 0);

  if (!hasData) {
    return (
      <div className="report-empty">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="4" width="32" height="32" rx="4" stroke="var(--border-strong)" strokeWidth="1.5" />
          <path d="M12 20h4v8h-4zM18 14h4v14h-4zM24 17h4v11h-4z" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>No Data</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '4px',
        marginTop: '10px'
      }}>
        {hoursData.map((minutes, hour) => {
          const intensity = minutes / maxMinutes; // 0.0 to 1.0
          
          // Use primary accent color, e.g. #f25f5c or #06d6a0
          // Convert to rgb for opacity, or use HSL
          let bg = 'var(--glass-bg)';
          if (intensity > 0) {
            // Using a nice green/blue or accent color. Let's use accent:
            // Since we don't have the exact accent here easily as rgb, let's use a nice teal
            const alpha = 0.2 + (0.8 * intensity); // 0.2 to 1.0 opacity
            bg = `rgba(6, 214, 160, ${alpha})`;
          }

          return (
            <div key={hour} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                title={`${hour}:00 - ${minutes} phút`}
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  background: bg,
                  borderRadius: '4px',
                  border: intensity > 0 ? '1px solid rgba(6, 214, 160, 0.4)' : '1px solid var(--border)',
                  transition: 'background 0.3s'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {hour}h
              </span>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Ít</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--glass-bg)', border: '1px solid var(--border)' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(6, 214, 160, 0.4)' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(6, 214, 160, 0.7)' }} />
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(6, 214, 160, 1)' }} />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Nhiều</span>
      </div>
    </div>
  );
};

export default PeakHoursHeatmap;
