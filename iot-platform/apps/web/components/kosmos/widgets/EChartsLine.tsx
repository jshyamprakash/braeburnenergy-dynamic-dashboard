'use client';

import ReactECharts from 'echarts-for-react';
import type { TimeSeriesPoint } from '@/lib/types';

interface EChartsLineProps {
  points: TimeSeriesPoint[];
  color?: string;
  label?: string;
  height?: number;
  min?: number;
  max?: number;
  threshold?: number;
  fill?: boolean;
}

/**
 * EChartsLine — Shared time-series line chart component
 * Renders [timestamp, value] points with ECharts time-axis
 */
export function EChartsLine({
  points,
  color = '#00B050',
  label = 'Data',
  height = 250,
  min,
  max,
  threshold,
  fill = false,
}: EChartsLineProps) {
  // Transform TimeSeriesPoint[] to ECharts format
  const chartData = points.map(([timestamp, value]) => [timestamp, value]);

  const option = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    backgroundColor: 'transparent',
    grid: {
      left: 30,
      right: 20,
      top: 20,
      bottom: 30,
      containLabel: false,
    },
    xAxis: {
      type: 'time',
      splitLine: {
        show: false,
      },
      axisLabel: {
        fontSize: 9,
        color: '#FFFFFF',
        fontFamily: 'var(--k-font-tech)',
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(21,96,189,0.35)',
        },
      },
    },
    yAxis: {
      type: 'value',
      min: min ?? 'dataMin',
      max: max ?? 'dataMax',
      splitLine: {
        lineStyle: {
          color: 'rgba(255,255,255,0.05)',
        },
      },
      axisLabel: {
        fontSize: 9,
        color: '#FFFFFF',
        fontFamily: 'var(--k-font-tech)',
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(21,96,189,0.35)',
        },
      },
    },
    series: [
      {
        name: label,
        data: chartData,
        type: 'line',
        smooth: true,
        lineStyle: {
          color,
          width: 2,
        },
        areaStyle: fill
          ? {
              color: color.replace(/[\d.]+\)$/g, '0.1)'), // e.g. rgba(0,176,80,1) → rgba(0,176,80,0.1)
            }
          : undefined,
        itemStyle: {
          color,
        },
        symbol: 'none',
        sampling: 'lttb', // Largest-Triangle-Three-Buckets for smooth downsampling
        markLine:
          threshold !== undefined
            ? {
                data: [{ yAxis: threshold, lineStyle: { color: '#FFB800', type: 'dashed' } }],
              }
            : undefined,
      },
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'var(--k-deep)',
      borderColor: 'var(--k-border-bright)',
      textStyle: {
        color: 'var(--k-text-primary)',
        fontFamily: 'var(--k-font-tech)',
        fontSize: 10,
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const p = params[0];
        const date = new Date(p.value[0]).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return `${date}<br/>${p.seriesName}: ${p.value[1].toFixed(4)}`;
      },
    },
  };

  if (!points || points.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: 12,
          fontFamily: 'var(--k-font-tech)',
        }}
      >
        No data available
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      notMerge={false}
    />
  );
}
