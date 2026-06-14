import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import type { ECharts, EChartsOption } from 'echarts';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export function useECharts(option: EChartsOption | null) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(el, 'dark', { renderer: 'canvas' });
    }

    const chart = chartRef.current;
    if (option) {
      chart.setOption(option, true);
    }
  }, [option]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  return containerRef;
}
