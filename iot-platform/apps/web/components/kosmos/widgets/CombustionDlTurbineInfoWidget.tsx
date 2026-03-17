'use client';

import type { CSSProperties } from 'react';
import { useAppDispatch } from '@/lib/store';
import { updateKosmosWidgetConfig } from '@/lib/store/slices/dashboardSlice';
import type { KosmosWidget } from '../types';

interface CombustionDlTurbineInfoWidgetProps {
  config?: {
    unit?: string;
    oem?: string;
    combustor?: string;
    fuel?: string;
  };
  widget?: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
}

const rowLabelStyle: CSSProperties = {
  fontFamily: 'var(--k-font-tech)',
  fontSize: 10,
  color: 'var(--k-text-dim)',
};

const rowValueStyle: CSSProperties = {
  fontFamily: 'var(--k-font-tech)',
  fontSize: 10,
  color: 'var(--k-pale)',
};

export function CombustionDlTurbineInfoWidget({ config, widget, editMode, pageId, onConfigChange }: CombustionDlTurbineInfoWidgetProps) {
  const dispatch = useAppDispatch();
  const unit = config?.unit ?? widget?.config?.unit ?? 'GT-DLE Frame 6B';
  const oem = config?.oem ?? widget?.config?.oem ?? 'OEM-Agnostic';
  const combustor = config?.combustor ?? widget?.config?.combustor ?? 'DLE / Lean Pre-mix';
  const fuel = config?.fuel ?? widget?.config?.fuel ?? 'NG + H2 blend';

  const handleFieldChange = (field: string, value: string) => {
    if (widget && pageId) {
      dispatch(updateKosmosWidgetConfig({ pageId, widgetId: widget.id, config: { [field]: value } }));
      onConfigChange?.();
    }
  };

  return (
    <div className="k-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="k-card-header">
        <div className="k-card-title">◈ TURBINE INFO</div>
      </div>

      <div className="k-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={rowLabelStyle}>UNIT</span>
          {editMode ? (
            <input
              defaultValue={unit}
              onBlur={(e) => handleFieldChange('unit', e.target.value)}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'var(--k-pale)', fontFamily: 'var(--k-font-tech)', fontSize: 10, outline: 'none', maxWidth: 100, textAlign: 'right' }}
            />
          ) : (
            <span style={rowValueStyle}>{unit}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={rowLabelStyle}>OEM</span>
          {editMode ? (
            <input
              defaultValue={oem}
              onBlur={(e) => handleFieldChange('oem', e.target.value)}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'var(--k-pale)', fontFamily: 'var(--k-font-tech)', fontSize: 10, outline: 'none', maxWidth: 100, textAlign: 'right' }}
            />
          ) : (
            <span style={rowValueStyle}>{oem}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={rowLabelStyle}>COMBUSTOR</span>
          {editMode ? (
            <input
              defaultValue={combustor}
              onBlur={(e) => handleFieldChange('combustor', e.target.value)}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'var(--k-pale)', fontFamily: 'var(--k-font-tech)', fontSize: 10, outline: 'none', maxWidth: 100, textAlign: 'right' }}
            />
          ) : (
            <span style={rowValueStyle}>{combustor}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={rowLabelStyle}>FUEL</span>
          {editMode ? (
            <input
              defaultValue={fuel}
              onBlur={(e) => handleFieldChange('fuel', e.target.value)}
              style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--k-green)', color: 'var(--k-pale)', fontFamily: 'var(--k-font-tech)', fontSize: 10, outline: 'none', maxWidth: 100, textAlign: 'right' }}
            />
          ) : (
            <span style={rowValueStyle}>{fuel}</span>
          )}
        </div>
      </div>
    </div>
  );
}
