'use client';

import type { KosmosPage, KosmosWidgetType } from '../types';
import { KosmosPixelTabPanel } from './KosmosPixelTabPanel';

const WIDGET_LIMITS: Record<KosmosWidgetType, { minW: number; maxW: number; minH: number; maxH: number }> = {
  platformArchitecture: { minW: 280, maxW: 10000, minH: 180, maxH: 10000 },
  beAgentTabConfig: { minW: 280, maxW: 10000, minH: 180, maxH: 10000 },
  overviewBeSense: { minW: 300, maxW: 10000, minH: 420, maxH: 10000 },
  overviewAnomalyMetric: { minW: 220, maxW: 10000, minH: 130, maxH: 10000 },
  overviewLoadMetric: { minW: 220, maxW: 10000, minH: 130, maxH: 10000 },
  overviewEgtMetric: { minW: 220, maxW: 10000, minH: 130, maxH: 10000 },
  overviewRealtimeChart: { minW: 420, maxW: 10000, minH: 220, maxH: 10000 },
  overviewDataFlow: { minW: 520, maxW: 10000, minH: 220, maxH: 10000 },
  overviewBeAgentStatus: { minW: 320, maxW: 10000, minH: 520, maxH: 10000 },
  combustionDlHeader: { minW: 720, maxW: 10000, minH: 100, maxH: 10000 },
  combustionDlPressureSignal: { minW: 280, maxW: 10000, minH: 180, maxH: 10000 },
  combustionDlFrequencySpectrum: { minW: 280, maxW: 10000, minH: 180, maxH: 10000 },
  combustionDlFeatureMatrix: { minW: 280, maxW: 10000, minH: 320, maxH: 10000 },
  combustionDlFrameworkPipeline: { minW: 340, maxW: 10000, minH: 260, maxH: 10000 },
  combustionDlAnomalyTrend: { minW: 320, maxW: 10000, minH: 170, maxH: 10000 },
  combustionDlPhysicsMetrics: { minW: 320, maxW: 10000, minH: 180, maxH: 10000 },
  combustionDlPrecursorClassification: { minW: 260, maxW: 10000, minH: 180, maxH: 10000 },
  combustionDlClassifierOutputs: { minW: 260, maxW: 10000, minH: 150, maxH: 10000 },
  combustionDlTrainingPerformance: { minW: 260, maxW: 10000, minH: 150, maxH: 10000 },
  combustionDlTurbineInfo: { minW: 240, maxW: 10000, minH: 140, maxH: 10000 },
};

interface Props {
  page: KosmosPage;
  editMode: boolean;
  onLayoutChange?: (
    pageId: string,
    layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ) => void;
  onRemoveWidget?: (widgetId: string) => void;
  onDrop?: (widgetType: string) => void;
  onConfigChange?: () => void;
  onSelect?: (widgetId: string) => void;
  selectedWidgetId?: string | null;
}

export function KosmosOverviewTabPanel(props: Props) {
  return <KosmosPixelTabPanel {...props} widgetLimits={WIDGET_LIMITS} />;
}
