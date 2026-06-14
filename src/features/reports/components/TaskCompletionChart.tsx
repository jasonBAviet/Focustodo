import React, { useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useECharts } from '@/shared/hooks/useECharts';
import type { ChartPeriod, CompletionBarData } from '@/features/reports/components/taskCompletionChartHelpers';
import {
  buildDailyData,
  buildWeeklyData,
  buildMonthlyData,
  buildYearlyData,
} from '@/features/reports/components/taskCompletionChartHelpers';
import type { EChartsOption } from 'echarts';

const TASK_COLOR = '#4361ee';
const SUBTASK_COLOR = '#90e0ef';
const GROWTH_COLOR = '#06d6a0';

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

  const filteredData = useMemo(() => {
    const matchedTasks = tasks.filter((t) => {
      if (t.isKnowledge) return false;
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

    const completedTasks = matchedTasks.filter((t) => t.completed && t.completedAt);
    const completedSubtasks: { completedAt: string }[] = [];
    matchedTasks.forEach((t) => {
      if (t.subtasks && Array.isArray(t.subtasks)) {
        t.subtasks.forEach((s) => {
          if (s.completed && s.completedAt) completedSubtasks.push({ completedAt: s.completedAt });
        });
      }
    });
    return { completedTasks, completedSubtasks };
  }, [tasks, projects, selectedFolderId, selectedProjectId, selectedTagId]);

  const bars = useMemo<CompletionBarData[]>(() => {
    const { completedTasks, completedSubtasks } = filteredData;
    switch (period) {
      case 'daily':   return buildDailyData(completedTasks, completedSubtasks, currentDate);
      case 'weekly':  return buildWeeklyData(completedTasks, completedSubtasks, currentDate);
      case 'monthly': return buildMonthlyData(completedTasks, completedSubtasks, currentDate);
      case 'yearly':  return buildYearlyData(completedTasks, completedSubtasks, currentDate);
    }
  }, [filteredData, period, currentDate]);

  const hasData = bars.some((b) => b.tasksCompleted > 0 || b.subtasksCompleted > 0);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    grid: { top: 20, right: 52, bottom: 36, left: 40, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20,20,30,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: { color: '#e0e0e0', fontSize: 12 },
      formatter: (params: any) => {
        const list = Array.isArray(params) ? params : [params];
        const label = list[0]?.name ?? '';
        const task = list.find((p: any) => p.seriesName === 'Task');
        const sub = list.find((p: any) => p.seriesName === 'Subtask');
        const growth = list.find((p: any) => p.seriesName === 'Lũy kế');
        return [
          `<b>${label}</b>`,
          task ? `Task: ${task.value}` : '',
          sub ? `Subtask: ${sub.value}` : '',
          growth ? `Lũy kế: ${growth.value}` : '',
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
      data: bars.map((b) => b.label),
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#777',
        fontSize: 10,
        interval: bars.length > 20 ? Math.ceil(bars.length / 12) - 1 : 0,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '',
        axisLabel: { color: '#777', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
        minInterval: 1,
      },
      {
        type: 'value',
        name: '',
        position: 'right',
        axisLabel: { color: '#777', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        minInterval: 1,
      },
    ],
    series: [
      {
        name: 'Task',
        type: 'bar',
        stack: 'completion',
        data: bars.map((b) => b.tasksCompleted),
        barMaxWidth: 28,
        itemStyle: {
          borderRadius: [0, 0, 0, 0],
          color: TASK_COLOR,
        },
      },
      {
        name: 'Subtask',
        type: 'bar',
        stack: 'completion',
        data: bars.map((b) => b.subtasksCompleted),
        barMaxWidth: 28,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: SUBTASK_COLOR,
        },
      },
      {
        name: 'Lũy kế',
        type: 'line',
        yAxisIndex: 1,
        data: bars.map((b) => b.cumulativeGrowth),
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: GROWTH_COLOR, width: 2 },
        itemStyle: { color: GROWTH_COLOR, borderColor: '#1a1a2e', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: GROWTH_COLOR + '30' },
              { offset: 1, color: GROWTH_COLOR + '00' },
            ],
          },
        },
      },
    ],
  }), [bars]);

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
          <span style={{ fontSize: 32 }}>📈</span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Không có dữ liệu hoàn thành</span>
        </div>
      )}
    </div>
  );
};

export type { ChartPeriod };
export default TaskCompletionChart;
