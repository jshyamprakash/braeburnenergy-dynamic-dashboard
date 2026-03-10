'use client';

import { useDeviceRealtime } from '@/hooks/useDeviceData';

interface SensorValueListProps {
  config: {
    title?: string;
    deviceId?: string;
    fields?: string[];
    staticItems?: Array<{ name: string; value: string; status?: 'ok' | 'warn' | 'off' }>;
  };
}

export function SensorValueList({ config }: SensorValueListProps) {
  const { title = 'Sensors', deviceId, fields = [], staticItems } = config;
  const { state } = useDeviceRealtime(deviceId || '');

  const items: Array<{ name: string; value: string; status: 'ok' | 'warn' | 'off' }> = staticItems
    ? staticItems.map((i) => ({ name: i.name, value: i.value, status: i.status ?? 'ok' }))
    : fields.map((f) => ({
        name: f,
        value: state?.data?.[f] !== undefined ? String(state.data[f]) : '—',
        status: (state?.data?.[f] !== undefined ? 'ok' : 'off') as 'ok' | 'warn' | 'off',
      }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="k-section-heading">{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, flex: 1, overflow: 'auto' }}>
        {items.map((item, i) => (
          <div key={i} className={`k-sensor-item ${item.status === 'ok' ? 'active' : ''}`}>
            <div>
              <div
                style={{
                  fontFamily: 'var(--k-font-display)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: 'var(--k-pale)',
                }}
              >
                {item.name}
              </div>
              <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 12, color: 'var(--k-text-secondary)' }}>
                {item.value}
              </div>
            </div>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                flexShrink: 0,
                marginLeft: 6,
                background:
                  item.status === 'ok'
                    ? 'var(--k-green)'
                    : item.status === 'warn'
                    ? 'var(--k-amber)'
                    : 'var(--k-text-dim)',
                boxShadow:
                  item.status === 'ok'
                    ? '0 0 5px var(--k-green)'
                    : item.status === 'warn'
                    ? '0 0 5px var(--k-amber)'
                    : 'none',
              }}
            />
          </div>
        ))}
        {items.length === 0 && (
          <div
            style={{
              gridColumn: '1/-1',
              fontFamily: 'var(--k-font-tech)',
              fontSize: 11,
              color: 'var(--k-text-dim)',
              textAlign: 'center',
              padding: '16px 0',
            }}
          >
            Configure deviceId and fields
          </div>
        )}
      </div>
    </div>
  );
}
