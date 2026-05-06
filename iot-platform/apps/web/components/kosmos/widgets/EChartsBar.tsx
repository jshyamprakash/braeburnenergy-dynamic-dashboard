'use client';

import ReactECharts from 'echarts-for-react';

interface EChartsBarProps {
  categories: string[];
  values: number[];
  color?: string;
  label?: string;
  height?: number;
}

/**
 * EChartsBar — Shared bar chart component for snapshots
 * Renders category/value pairs as bars
 */
export function EChartsBar({
  categories,
  values,
  color = '#1560BD',
  label = 'Data',
  height = 250,
}: EChartsBarProps) {
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
      type: 'category',
      data: categories,
      splitLine: {
        show: false,
      },
      axisLabel: {
        fontSize: 9,
        color: '#FFFFFF',
        fontFamily: 'var(--k-font-tech)',
        rotate: categories.length > 10 ? 45 : 0,
      },
      axisLine: {
        lineStyle: {
          color: 'rgba(21,96,189,0.35)',
        },
      },
    },
    yAxis: {
      type: 'value',
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
        data: values,
        type: 'bar',
        itemStyle: {
          color,
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: {
          itemStyle: {
            color: color.replace(/[\d.]+\)$/g, '0.8)'),
          },
        },
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
        return `${p.name}<br/>${p.seriesName}: ${p.value.toFixed(4)}`;
      },
    },
  };

  if (!categories || categories.length === 0 || !values || values.length === 0) {
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
