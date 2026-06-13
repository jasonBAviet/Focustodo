import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import type { ChartPeriod, ActivityData } from '@/features/reports/components/taskActivityChartHelpers';
import {
  buildActivityDailyData,
  buildActivityWeeklyData,
  buildActivityMonthlyData,
  buildActivityYearlyData,
  drawActivityChart
} from '@/features/reports/components/taskActivityChartHelpers';

interface TaskActivityChartProps {
  period: ChartPeriod;
  currentDate: Date;
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
  onDataCalculated?: (data: ActivityData[]) => void;
}

const TaskActivityChart: React.FC<TaskActivityChartProps> = ({
  period,
  currentDate,
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
  onDataCalculated,
}) => {
  const { tasks, projects } = useTaskContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasW, setCanvasW] = useState(560);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const dataRef = useRef<ActivityData[]>([]);

  // Tinh chỉnh kích thước canvas theo container
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

  // Lọc task theo các tiêu chí đã chọn
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
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
  }, [tasks, projects, selectedFolderId, selectedProjectId, selectedTagId]);

  // Xây dựng dữ liệu hoạt động task
  const chartData = useMemo(() => {
    let result: ActivityData[] = [];
    switch (period) {
      case 'daily':
        result = buildActivityDailyData(filteredTasks, currentDate);
        break;
      case 'weekly':
        result = buildActivityWeeklyData(filteredTasks, currentDate);
        break;
      case 'monthly':
        result = buildActivityMonthlyData(filteredTasks, currentDate);
        break;
      case 'yearly':
        result = buildActivityYearlyData(filteredTasks, currentDate);
        break;
    }
    return result;
  }, [filteredTasks, period, currentDate]);

  // Lưu trữ dữ liệu vào ref và bắn callback về component cha để render bảng chi tiết
  dataRef.current = chartData;
  useEffect(() => {
    onDataCalculated?.(chartData);
  }, [chartData, onDataCalculated]);

  const hasData = chartData.some(
    (d) => d.createdCount > 0 || d.completedCount > 0 || d.overdueCount > 0
  );

  // Vẽ biểu đồ khi dữ liệu thay đổi
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawActivityChart(canvas, chartData);
  }, [chartData, canvasW]);

  // Xử lý tooltip khi hover qua biểu đồ
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const barsData = dataRef.current;
    const paddingLeft = 44;
    const paddingRight = 24;
    const chartW = canvas.width - paddingLeft - paddingRight;
    const slotW = chartW / barsData.length;

    let idx = Math.floor((mx - paddingLeft) / slotW);
    if (idx >= 0 && idx < barsData.length) {
      const bar = barsData[idx];
      const xPoint = paddingLeft + idx * slotW + slotW / 2;
      setTooltip({
        x: xPoint,
        y: my,
        text: `${bar.label} - Tạo: ${bar.createdCount}, Xong: ${bar.completedCount}, Trễ: ${bar.overdueCount}`,
      });
    } else {
      setTooltip(null);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <span style={{ fontSize: 32 }}>📊</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Không có hoạt động nào trong thời gian này</span>
          </div>
        )}
      </div>

      {/* Chú thích màu sắc */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 10, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: '#f4a261', borderRadius: 2 }} />
          Tạo mới
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: '#4361ee', borderRadius: 2 }} />
          Đã hoàn thành
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: '#f25f5c', borderRadius: 2 }} />
          Trễ hạn
        </span>
      </div>
    </div>
  );
};

export default TaskActivityChart;
