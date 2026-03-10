'use client';

import type { KosmosWidget, KosmosWidgetType } from '../types';
import { KpiCard } from './KpiCard';
import { SensorValueList } from './SensorValueList';
import { RealTimeChart } from './RealTimeChart';
import { FeatureMatrix } from './FeatureMatrix';
import { AlertList } from './AlertList';
import { ModuleStatusList } from './ModuleStatusList';
import { HealthRing } from './HealthRing';
import { ArchDiagram } from './ArchDiagram';
import { ConfidenceBars } from './ConfidenceBars';
import { KeyValueTable } from './KeyValueTable';
import { FrequencyChart } from './FrequencyChart';
import { PlatformDiagram } from './PlatformDiagram';
import { AgentChat } from './AgentChat';
import { BeSensePanel } from './BeSensePanel';
import { BeAgentPanel } from './BeAgentPanel';
import { CombustionHeader } from './CombustionHeader';
import { DlFrameworkPipeline } from './DlFrameworkPipeline';
import { PrecursorClassification } from './PrecursorClassification';
import { AgentModules } from './AgentModules';
import { PlatformStatus } from './PlatformStatus';
import { VsOemPlatforms } from './VsOemPlatforms';
import { DeploymentModes } from './DeploymentModes';
import { ConferenceInfo } from './ConferenceInfo';
import { RealTimeGaugeBlock } from '@/components/dashboard/RealTimeGaugeBlock';
import { RealTimeChartBlock } from '@/components/dashboard/RealTimeChartBlock';
import { ActiveAlarmsBlock } from '@/components/dashboard/ActiveAlarmsBlock';
import { StatusTextBlock } from '@/components/dashboard/StatusTextBlock';
import type { DashboardBlock } from '@/components/dashboard/DashboardBuilder';

interface RenderWidgetProps {
  widget: KosmosWidget;
  editMode?: boolean;
}

/**
 * Renders any KosmosWidget type into its corresponding component.
 * Existing platform blocks are wrapped with Kosmos card styling.
 */
export function RenderWidget({ widget, editMode = false }: RenderWidgetProps) {
  const { type, config } = widget;

  switch (type as KosmosWidgetType) {
    case 'kpiCard':
      return <KpiCard config={config} />;

    case 'sensorValueList':
      return <SensorValueList config={config} />;

    case 'realTimeChart':
      return <RealTimeChart config={config} />;

    case 'featureMatrix':
      return <FeatureMatrix config={config} />;

    case 'alertList':
      return <AlertList config={config} />;

    case 'moduleStatusList':
      return <ModuleStatusList config={config} />;

    case 'healthRing':
      return <HealthRing config={config} />;

    case 'archDiagram':
      return <ArchDiagram config={config} />;

    case 'gauge':
      return (
        <div style={{ height: '100%' }}>
          <RealTimeGaugeBlock
            deviceId={config.deviceId}
            field={config.field}
            label={config.title || config.label}
            min={config.min}
            max={config.max}
            unit={config.unit}
            warningThreshold={config.warningThreshold}
            criticalThreshold={config.criticalThreshold}
          />
        </div>
      );

    case 'chart':
      return (
        <div style={{ height: '100%' }}>
          <RealTimeChartBlock
            deviceId={config.deviceId}
            field={config.field}
            title={config.title}
            chartType={config.chartType}
          />
        </div>
      );

    case 'activeAlarms': {
      const alarmBlock: DashboardBlock = {
        id: widget.id,
        type: 'activeAlarms',
        layouts: { lg: { i: widget.id, x: 0, y: 0, w: 6, h: 4 }, md: { i: widget.id, x: 0, y: 0, w: 6, h: 4 }, sm: { i: widget.id, x: 0, y: 0, w: 6, h: 4 } },
        config,
      };
      return (
        <div style={{ height: '100%' }}>
          <ActiveAlarmsBlock block={alarmBlock} isEditMode={editMode} />
        </div>
      );
    }

    case 'statusText': {
      const statusBlock: DashboardBlock = {
        id: widget.id,
        type: 'statusText',
        layouts: { lg: { i: widget.id, x: 0, y: 0, w: 4, h: 2 }, md: { i: widget.id, x: 0, y: 0, w: 4, h: 2 }, sm: { i: widget.id, x: 0, y: 0, w: 4, h: 2 } },
        config,
      };
      return (
        <div style={{ height: '100%' }}>
          <StatusTextBlock block={statusBlock} isEditMode={editMode} />
        </div>
      );
    }

    case 'confidenceBars':
      return <ConfidenceBars config={config} />;

    case 'keyValueTable':
      return <KeyValueTable config={config} />;

    case 'frequencyChart':
      return <FrequencyChart config={config} />;

    case 'platformDiagram':
      return <PlatformDiagram config={config} />;

    case 'agentChat':
      return <AgentChat config={config} />;

    case 'beSensePanel':
      return <BeSensePanel config={config} />;

    case 'beAgentPanel':
      return <BeAgentPanel config={config} />;

    case 'combustionHeader':
      return <CombustionHeader config={config} />;

    case 'dlFrameworkPipeline':
      return <DlFrameworkPipeline config={config} />;

    case 'precursorClassification':
      return <PrecursorClassification config={config} />;

    case 'agentModules':
      return <AgentModules config={config} />;

    case 'platformStatus':
      return <PlatformStatus config={config} />;

    case 'vsOemPlatforms':
      return <VsOemPlatforms config={config} />;

    case 'deploymentModes':
      return <DeploymentModes config={config} />;

    case 'conferenceInfo':
      return <ConferenceInfo config={config} />;

    default:
      return (
        <div style={{ padding: 12, fontFamily: 'var(--k-font-tech)', fontSize: 11, color: 'var(--k-text-dim)' }}>
          Unknown widget type: {type}
        </div>
      );
  }
}
