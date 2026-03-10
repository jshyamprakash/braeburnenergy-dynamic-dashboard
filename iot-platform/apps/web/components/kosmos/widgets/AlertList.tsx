'use client';

interface AlertItem {
  time?: string;
  message: string;
  sub?: string;
  severity: 'critical' | 'warning' | 'info' | 'ok';
}

interface AlertListProps {
  config: {
    title?: string;
    items?: AlertItem[];
    maxItems?: number;
  };
}

const SEVERITY_CLASS: Record<string, string> = {
  critical: 'k-alert-critical',
  warning: 'k-alert-warning',
  info: 'k-alert-info',
  ok: 'k-alert-ok',
};

const DEMO_ITEMS: AlertItem[] = [
  { time: '14:02:33', message: 'CD anomaly score elevated', sub: 'Burner #3', severity: 'warning' },
  { time: '13:58:12', message: 'EGT spread within limits', sub: 'T-EGT: 612°C', severity: 'ok' },
  { time: '13:45:07', message: 'NOx threshold exceeded', sub: '18.4 ppm > 15 ppm limit', severity: 'critical' },
  { time: '13:31:55', message: 'Vibration sensor offline', sub: 'VIB-X channel 4', severity: 'info' },
];

export function AlertList({ config }: AlertListProps) {
  const { title = 'Alerts', items = DEMO_ITEMS, maxItems = 5 } = config;
  const displayItems = items.slice(0, maxItems);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="k-section-heading">{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
        {displayItems.map((item, i) => (
          <div key={i} className={`k-alert-item ${SEVERITY_CLASS[item.severity]}`}>
            {item.time && (
              <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 10, color: 'var(--k-text-dim)', marginBottom: 2 }}>
                {item.time}
              </div>
            )}
            <div style={{ color: 'var(--k-text-primary)' }}>{item.message}</div>
            {item.sub && (
              <div style={{ fontSize: 11, color: 'var(--k-text-secondary)', marginTop: 2 }}>{item.sub}</div>
            )}
          </div>
        ))}
        {displayItems.length === 0 && (
          <div style={{ fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-dim)', textAlign: 'center', padding: '16px 0' }}>
            No alerts
          </div>
        )}
      </div>
    </div>
  );
}
