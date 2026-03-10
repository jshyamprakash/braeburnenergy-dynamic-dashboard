'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FrequencyChartProps {
  config: Record<string, any>;
}

const DEFAULT_DATA = [
  { freq: '50', value: 0.30 },
  { freq: '80', value: 0.50 },
  { freq: '100', value: 0.40 },
  { freq: '125', value: 0.60 },
  { freq: '150', value: 0.70 },
  { freq: '186', value: 1.00 },
  { freq: '250', value: 0.45 },
  { freq: '315', value: 0.35 },
  { freq: '400', value: 0.25 },
  { freq: '500', value: 0.15 },
];

export function FrequencyChart({ config }: FrequencyChartProps) {
  const { title = 'Frequency Spectrum', data = DEFAULT_DATA, dominantIdx = 5 } = config;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="k-card-title">{title}</div>
      <div style={{ flex: 1, minHeight: 0, paddingTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="freq"
              tick={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, fill: 'var(--k-text-dim)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontFamily: 'var(--k-font-tech)', fontSize: 9, fill: 'var(--k-text-dim)' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
              tickFormatter={(v: number) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--k-bg-card)',
                border: '1px solid var(--k-border)',
                fontFamily: 'var(--k-font-tech)',
                fontSize: 10,
              }}
              labelFormatter={(l) => `${l} Hz`}
              formatter={(v: any) => [typeof v === 'number' ? v.toFixed(2) : v, 'Amplitude']}
            />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((_: any, index: number) => (
                <Cell
                  key={index}
                  fill={index === dominantIdx ? 'var(--k-green)' : 'var(--k-base)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
