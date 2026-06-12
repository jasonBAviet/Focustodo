// ============================================================
// FOCUS TO-DO - FocusTimeChart
// Biểu đồ cột Focus Time vẽ bằng Canvas API
// ============================================================
import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';
import type { ChartPeriod, BarData } from './focusTimeChartHelpers';
import {
  buildBarData,
  drawChart
} from './focusTimeChartHelpers';

interface FocusTimeChartProps {
  period: ChartPeriod;
  currentDate: Date;
  accentColor?: string;
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
}

const FocusTimeChart: React.FC<FocusTimeChartProps> = ({
  period,
  currentDate,
  accentColor = '#f25f5c',
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
}) => {
  const { pomodoroSessions, tasks, projects } = useTaskContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(560);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const barsRef = useRef<BarData[]>([]);

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

  // Lọc các session dựa trên Folder/Project/Tag được chọn
  const focusSessions = useMemo(() => {
    return pomodoroSessions
      .filter((s) => s.type === 'focus')
      .filter((s) => {
        const task = tasks.find((t) => t.id === s.taskId);
        if (!task) return false;

        if (selectedFolderId !== 'all') {
          if (!task.projectId) return false;
          const project = projects.find((p) => p.id === task.projectId);
          if (!project || project.folderId !== selectedFolderId) return false;
        }

        if (selectedProjectId !== 'all') {
          if (task.projectId !== selectedProjectId) return false;
        }

        if (selectedTagId !== 'all') {
          if (!task.tags || !task.tags.includes(selectedTagId)) return false;
        }

        return true;
      });
  }, [pomodoroSessions, tasks, projects, selectedFolderId, selectedProjectId, selectedTagId]);

  const bars = buildBarData(focusSessions, period, currentDate);
  barsRef.current = bars;
  const hasData = bars.some((b) => b.minutes > 0);

  // Vẽ lại khi bars hoặc accentColor thay đổi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawChart(canvas, bars, accentColor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, accentColor, canvasW]);

  // Tooltip khi hover
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const barsData = barsRef.current;
    const paddingLeft = 44;
    const chartW = canvas.width - paddingLeft - 12;
    const gap = 3;
    const barW = Math.max(2, (chartW - gap * (barsData.length - 1)) / barsData.length);

    let found: BarData | null = null;
    let foundX = 0;
    barsData.forEach((bar, i) => {
      const x = paddingLeft + i * (barW + gap);
      if (mx >= x && mx <= x + barW) {
        found = bar;
        foundX = x + barW / 2;
      }
    });

    if (found) {
      setTooltip({
        x: foundX,
        y: my,
        text: `${(found as BarData).label}: ${Math.round((found as BarData).minutes)}m`,
      });
    } else {
      setTooltip(null);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Canvas area */}
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
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
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
            <span style={{ fontSize: 32 }}>📭</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Không có dữ liệu tập trung</span>
          </div>
        )}
      </div>
    </div>
  );
};

export type { ChartPeriod };
export default FocusTimeChart;
