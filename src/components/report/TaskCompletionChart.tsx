// ============================================================
// FOCUS TO-DO - TaskCompletionChart
// Biểu đồ cột kép và Line tăng trưởng lũy kế của Task/Subtask
// vẽ bằng Canvas API
// ============================================================
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { ChartPeriod, CompletionBarData } from './taskCompletionChartHelpers';
import {
  buildDailyData,
  buildWeeklyData,
  buildMonthlyData,
  buildYearlyData,
  drawChart
} from './taskCompletionChartHelpers';

interface TaskCompletionChartProps {
  period: ChartPeriod;
  currentDate: Date;
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
}

const TaskCompletionChart: React.FC<TaskCompletionChartProps> = ({
  period,
  currentDate,
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
}) => {
  const { tasks, projects } = useTaskContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(560);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const barsRef = useRef<CompletionBarData[]>([]);

  // Canvas vẽ đúng theo bề ngang container (tránh bị CSS kéo méo trên mobile)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setCanvasW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 1. Filter completed tasks and subtasks within selected folder/project/tag
  const filteredData = useMemo(() => {
    // Filter tasks
    const matchedTasks = tasks.filter((t) => {
      if (selectedFolderId !== 'all') {
        if (!t.projectId) return false;
        const project = projects.find((p) => p.id === t.projectId);
        if (!project || project.folderId !== selectedFolderId) return false;
      }
      if (selectedProjectId !== 'all') {
        if (t.projectId !== selectedProjectId) return false;
      }
      if (selectedTagId !== 'all') {
        if (!t.tags || !t.tags.includes(selectedTagId)) return false;
      }
      return true;
    });

    const completedTasks = matchedTasks.filter(t => t.completed && t.completedAt);
    
    // Collect and filter completed subtasks
    const completedSubtasks: { completedAt: string }[] = [];
    matchedTasks.forEach(t => {
      if (t.subtasks && Array.isArray(t.subtasks)) {
        t.subtasks.forEach(s => {
          if (s.completed && s.completedAt) {
            completedSubtasks.push({ completedAt: s.completedAt });
          }
        });
      }
    });

    return { completedTasks, completedSubtasks };
  }, [tasks, projects, selectedFolderId, selectedProjectId, selectedTagId]);

  // 2. Build bars data
  const bars = useMemo(() => {
    const { completedTasks, completedSubtasks } = filteredData;
    switch (period) {
      case 'daily':   return buildDailyData(completedTasks, completedSubtasks, currentDate);
      case 'weekly':  return buildWeeklyData(completedTasks, completedSubtasks, currentDate);
      case 'monthly': return buildMonthlyData(completedTasks, completedSubtasks, currentDate);
      case 'yearly':  return buildYearlyData(completedTasks, completedSubtasks, currentDate);
    }
  }, [filteredData, period, currentDate]);

  barsRef.current = bars;
  const hasData = bars.some(b => b.tasksCompleted > 0 || b.subtasksCompleted > 0);

  // Redraw when bars change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawChart(canvas, bars);
  }, [bars, canvasW]);

  // Tooltip mouse move handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const barsData = barsRef.current;
    const paddingLeft = 44;
    const paddingRight = 44;
    const chartW = canvas.width - paddingLeft - paddingRight;
    const slotW = chartW / barsData.length;

    let idx = Math.floor((mx - paddingLeft) / slotW);
    if (idx >= 0 && idx < barsData.length) {
      const bar = barsData[idx];
      const xPoint = paddingLeft + idx * slotW + slotW / 2;
      setTooltip({
        x: xPoint,
        y: my,
        text: `${bar.label} - Task: ${bar.tasksCompleted}, Subtask: ${bar.subtasksCompleted}, Lũy kế: ${bar.cumulativeGrowth}`,
      });
    } else {
      setTooltip(null);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Canvas Area */}
      <div ref={containerRef} style={{
        position: 'relative',
        background: 'var(--glass-bg)',
        borderRadius: 12,
        overflow: 'hidden',
        height: 200,
      }}>
        {hasData ? (
          <>
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={200}
              style={{ width: '100%', height: '100%', display: 'block' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setTooltip(null)}
            />
            {tooltip && (
              <div style={{
                position: 'absolute',
                left: tooltip.x,
                top: Math.max(4, tooltip.y - 32),
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 10,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}>
                {tooltip.text}
              </div>
            )}
          </>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 8,
          }}>
            <span style={{ fontSize: 32 }}>📈</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Không có dữ liệu hoàn thành</span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 10, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: '#4361ee', borderRadius: 2 }} />
          Task đã xong
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: '#90e0ef', borderRadius: 2 }} />
          Subtask đã xong
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 2, background: '#06d6a0' }} />
          Đường tăng trưởng lũy kế
        </span>
      </div>
    </div>
  );
};

export type { ChartPeriod };
export default TaskCompletionChart;
