'use client';

import type { KosmosPage, KosmosWidgetType } from '../types';
import { KosmosPixelTabPanel } from './KosmosPixelTabPanel';

const WIDGET_LIMITS: Record<KosmosWidgetType, { minW: number; minH: number }> = {
  platformArchitecture: { minW: 9, minH: 9 },
  beAgentTabConfig: { minW: 9, minH: 9 },
  overviewBeSense: { minW: 10, minH: 21 },
  overviewAnomalyMetric: { minW: 8, minH: 7 },
  overviewLoadMetric: { minW: 8, minH: 7 },
  overviewEgtMetric: { minW: 8, minH: 7 },
  overviewRealtimeChart: { minW: 14, minH: 11 },
  overviewDataFlow: { minW: 17, minH: 11 },
  overviewBeAgentStatus: { minW: 11, minH: 26 },
  combustionDlHeader: { minW: 24, minH: 5 },
  combustionDlPressureSignal: { minW: 10, minH: 9 },
  combustionDlFrequencySpectrum: { minW: 10, minH: 9 },
  combustionDlFeatureMatrix: { minW: 10, minH: 16 },
  combustionDlFrameworkPipeline: { minW: 11, minH: 13 },
  combustionDlAnomalyTrend: { minW: 11, minH: 9 },
  combustionDlPhysicsMetrics: { minW: 11, minH: 9 },
  combustionDlPrecursorClassification: { minW: 9, minH: 9 },
  combustionDlClassifierOutputs: { minW: 9, minH: 8 },
  combustionDlTrainingPerformance: { minW: 9, minH: 8 },
  combustionDlTurbineInfo: { minW: 8, minH: 7 },
};

interface Props {
  page: KosmosPage;
  editMode: boolean;
  layoutLocked?: boolean;
  onLayoutChange?: (
    pageId: string,
    layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ) => void;
  onRemoveWidget?: (widgetId: string) => void;
  onDrop?: (widgetType: string) => void;
  onConfigChange?: () => void;
  onSelect?: (widgetId: string | null) => void;
  selectedWidgetId?: string | null;
}

export function KosmosOverviewTabPanel(props: Props) {
  return <KosmosPixelTabPanel {...props} widgetLimits={WIDGET_LIMITS} />;
}
