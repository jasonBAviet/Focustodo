import React, { useMemo } from 'react';
import { useTaskContext } from '@/features/tasks/TaskContext';
import { useECharts } from '@/shared/hooks/useECharts';
import { getPeakHoursData } from '@/features/reports/components/peakHoursHelpers';
import type { EChartsOption } from 'echarts';

interface PeakHoursHeatmapProps {
  selectedFolderId?: string;
  selectedProjectId?: string;
  selectedTagId?: string;
  startDate: Date;
  endDate: Date;
}

const HOURS = Array.from({ length: 24 }, (_, i) => `${i}h`);
const ACCENT = '#06d6a0';

const PeakHoursHeatmap: React.FC<PeakHoursHeatmapProps> = ({
  selectedFolderId = 'all',
  selectedProjectId = 'all',
  selectedTagId = 'all',
  startDate,
  endDate,
}) => {
  const { tasks, pomodoroSessions, projects } = useTaskContext();

  const hoursData = useMemo(() => {
    return getPeakHoursData(
      tasks,
      pomodoroSessions,
      { selectedFolderId, selectedProjectId, selectedTagId, startDate, endDate },
      projects,
    );
  }, [tasks, pomodoroSessions, selectedFolderId, selectedProjectId, selectedTagId, projects, startDate, endDate]);

  const hasData = hoursData.some((m) => m > 0);
  const maxMinutes = Math.max(...hoursData, 1);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    grid: { top: 28, right: 16, bottom: 40, left: 56 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20,20,30,0.92)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      textStyle: { color: '#e0e0e0', fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const mins = p.value as number;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
        return `<b>${p.name}</b><br/>Focus: ${dur}`;
      },
    },
    visualMap: {
      show: true,
      min: 0,
      max: maxMinutes,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      itemWidth: 12,
      itemHeight: 100,
      text: ['High', 'Low'],
      textStyle: { color: '#777', fontSize: 10 },
      inRange: {
        color: ['#1a1a2e', ACCENT],
      },
      calculable: false,
    },
    xAxis: {
      type: 'category',
      data: HOURS,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisTick: { show: false },
      axisLabel: { color: '#777', fontSize: 9, interval: 1 },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.02)'],
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'minutes',
      nameTextStyle: { color: '#555', fontSize: 9 },
      axisLabel: { color: '#777', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: hoursData.map((mins) => ({
          value: mins,
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            // groups: 0-5 sáng sớm, 6-11 buổi sáng, 12-17 buổi chiều, 18-23 buổi tối
          },
        })),
        barCategoryGap: '20%',
        label: { show: false },
        emphasis: {
          focus: 'self',
          itemStyle: { opacity: 0.85 },
        },
      },
    ],
  }), [hoursData, maxMinutes]);

  const containerRef = useECharts(hasData ? option : null);

  if (!hasData) {
    return (
      <div className="report-empty">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="4" width="32" height="32" rx="4" stroke="var(--border-strong)" strokeWidth="1.5" />
          <path d="M12 20h4v8h-4zM18 14h4v14h-4zM24 17h4v11h-4z" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>No data</span>
      </div>
    );
  }

  return (
    <div>
      {/* Group labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
        marginBottom: 4,
        paddingLeft: 56,
        paddingRight: 16,
      }}>
        {[
          { label: 'Early morning', range: '0-5h' },
          { label: 'Morning', range: '6-11h' },
          { label: 'Afternoon', range: '12-17h' },
          { label: 'Evening', range: '18-23h' },
        ].map((g) => (
          <div key={g.range} style={{
            textAlign: 'center',
            fontSize: 9,
            color: '#555',
            padding: '2px 0',
            borderTop: '2px solid rgba(255,255,255,0.06)',
          }}>
            {g.label}
          </div>
        ))}
      </div>
      <div ref={containerRef} style={{ width: '100%', height: 240 }} />
    </div>
  );
};

export default PeakHoursHeatmap;
