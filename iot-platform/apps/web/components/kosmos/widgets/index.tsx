'use client';

import type { KosmosWidget, KosmosWidgetType } from '../types';
import { CombustionDlTurbineInfoWidget } from './CombustionDlTurbineInfoWidget';
import {
  CombustionDlAnomalyTrendWidget,
  CombustionDlClassifierOutputsWidget,
  CombustionDlFeatureMatrixWidget,
  CombustionDlFrameworkPipelineWidget,
  CombustionDlFrequencySpectrumWidget,
  CombustionDlHeaderWidget,
  CombustionDlPhysicsMetricsWidget,
  CombustionDlPrecursorClassificationWidget,
  CombustionDlPressureSignalWidget,
  CombustionDlTrainingPerformanceWidget,
} from './combustion';
import {
  OverviewAnomalyMetricWidget,
  OverviewBeAgentStatusWidget,
  OverviewBeSenseWidget,
  OverviewDataFlowWidget,
  OverviewEgtMetricWidget,
  OverviewLoadMetricWidget,
  OverviewRealtimeChartWidget,
} from './overview';

interface RenderWidgetProps {
  widget: KosmosWidget;
  editMode?: boolean;
  pageId?: string;
  onConfigChange?: () => void;
}

export function RenderWidget({ widget, editMode, pageId, onConfigChange }: RenderWidgetProps) {
  const { type } = widget;

  switch (type as KosmosWidgetType) {
    case 'platformArchitecture':
    case 'beAgentTabConfig':
      // These are rendered at tab level, not within the canvas
      return null;
    case 'overviewBeSense':
      return <OverviewBeSenseWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'overviewAnomalyMetric':
      return <OverviewAnomalyMetricWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'overviewLoadMetric':
      return <OverviewLoadMetricWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'overviewEgtMetric':
      return <OverviewEgtMetricWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'overviewRealtimeChart':
      return <OverviewRealtimeChartWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'overviewDataFlow':
      return <OverviewDataFlowWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'overviewBeAgentStatus':
      return <OverviewBeAgentStatusWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlHeader':
      return <CombustionDlHeaderWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlPressureSignal':
      return <CombustionDlPressureSignalWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlFrequencySpectrum':
      return <CombustionDlFrequencySpectrumWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlFeatureMatrix':
      return <CombustionDlFeatureMatrixWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlFrameworkPipeline':
      return <CombustionDlFrameworkPipelineWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlAnomalyTrend':
      return <CombustionDlAnomalyTrendWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlPhysicsMetrics':
      return <CombustionDlPhysicsMetricsWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlPrecursorClassification':
      return <CombustionDlPrecursorClassificationWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlClassifierOutputs':
      return <CombustionDlClassifierOutputsWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlTrainingPerformance':
      return <CombustionDlTrainingPerformanceWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;
    case 'combustionDlTurbineInfo':
      return <CombustionDlTurbineInfoWidget widget={widget} editMode={editMode} pageId={pageId} onConfigChange={onConfigChange} />;

    default:
      return null;
  }
}
