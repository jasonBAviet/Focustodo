import React, { useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useECharts } from '@/shared/hooks/useECharts';
import { buildBarData } from '@/features/reports/components/focusTimeChartHelpers';
import type { EChartsOption } from 'echarts';

export type ChartPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface FocusTimeChartProps {
  period: ChartPeriod;
  currentDate: Date;
  accentColor?: string;
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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

  const bars = useMemo(
    () => buildBarData(focusSessions, period, currentDate),
    [focusSessions, period, currentDate],
  );

  const hasData = bars.some((b) => b.minutes > 0);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    grid: { top: 20, right: 16, bottom: 36, left: 52, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20,20,30,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: { color: '#e0e0e0', fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `<b>${p.name}</b><br/>Focus: ${formatDuration(p.value as number)}`;
      },
    },
    xAxis: {
      type: 'category',
      data: bars.map((b) => b.label),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#777',
        fontSize: 10,
        interval: bars.length > 20 ? Math.ceil(bars.length / 12) - 1 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#777',
        fontSize: 10,
        formatter: (v: number) => (v === 0 ? '0' : formatDuration(v)),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: bars.map((b) => b.minutes),
        barMaxWidth: 32,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: accentColor },
              { offset: 1, color: accentColor + '40' },
            ],
          },
        },
        emphasis: {
          itemStyle: { color: accentColor, opacity: 0.9 },
        },
      },
    ],
  }), [bars, accentColor]);

  const containerRef = useECharts(hasData ? option : null);

  return (
    <div style={{ position: 'relative', height: 220 }}>
      {hasData ? (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      ) : (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 8,
        }}>
          <span style={{ fontSize: 32 }}>📭</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No focus data</span>
        </div>
      )}
    </div>
  );
};

export default FocusTimeChart;
