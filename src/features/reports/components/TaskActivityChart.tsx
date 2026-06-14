import React, { useMemo, useEffect } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useECharts } from '@/shared/hooks/useECharts';
import type { ChartPeriod, ActivityData } from '@/features/reports/components/taskActivityChartHelpers';
import {
  buildActivityDailyData,
  buildActivityWeeklyData,
  buildActivityMonthlyData,
  buildActivityYearlyData,
} from '@/features/reports/components/taskActivityChartHelpers';
import type { EChartsOption } from 'echarts';

const COLOR_CREATED = '#f4a261';
const COLOR_COMPLETED = '#4361ee';
const COLOR_OVERDUE = '#f25f5c';

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

  const chartData = useMemo<ActivityData[]>(() => {
    switch (period) {
      case 'daily':   return buildActivityDailyData(filteredTasks, currentDate);
      case 'weekly':  return buildActivityWeeklyData(filteredTasks, currentDate);
      case 'monthly': return buildActivityMonthlyData(filteredTasks, currentDate);
      case 'yearly':  return buildActivityYearlyData(filteredTasks, currentDate);
    }
  }, [filteredTasks, period, currentDate]);

  useEffect(() => {
    onDataCalculated?.(chartData);
  }, [chartData, onDataCalculated]);

  const hasData = chartData.some(
    (d) => d.createdCount > 0 || d.completedCount > 0 || d.overdueCount > 0,
  );

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    grid: { top: 20, right: 16, bottom: 52, left: 40, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20,20,30,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: { color: '#e0e0e0', fontSize: 12 },
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const label = list[0]?.name ?? '';
        const created = list.find((p: any) => p.seriesName === 'Tạo mới');
        const done = list.find((p: any) => p.seriesName === 'Hoàn thành');
        const overdue = list.find((p: any) => p.seriesName === 'Trễ hạn');
        return [
          `<b>${label}</b>`,
          created ? `🟠 Created: ${created.value}` : '',
          done ? `🔵 Completed: ${done.value}` : '',
          overdue ? `🔴 Overdue: ${overdue.value}` : '',
        ].filter(Boolean).join('<br/>');
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#999', fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
      icon: 'roundRect',
    },
    xAxis: {
      type: 'category',
      data: chartData.map((d) => d.label),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#777',
        fontSize: 10,
        interval: chartData.length > 20 ? Math.ceil(chartData.length / 12) - 1 : 0,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#777', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      minInterval: 1,
    },
    series: [
      {
        name: 'Created',
        type: 'bar',
        data: chartData.map((d) => d.createdCount),
        barMaxWidth: 20,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: COLOR_CREATED },
      },
      {
        name: 'Completed',
        type: 'bar',
        data: chartData.map((d) => d.completedCount),
        barMaxWidth: 20,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: COLOR_COMPLETED },
      },
      {
        name: 'Overdue',
        type: 'bar',
        data: chartData.map((d) => d.overdueCount),
        barMaxWidth: 20,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: COLOR_OVERDUE },
      },
    ],
  }), [chartData]);

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
          <span style={{ fontSize: 32 }}>📊</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No activity in this period</span>
        </div>
      )}
    </div>
  );
};

export default TaskActivityChart;
