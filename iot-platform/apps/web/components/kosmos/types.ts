/**
 * Kosmos Dashboard Data Types
 *
 * ADR-044: Unified free-canvas layout — KosmosPage.widgets[] replaces columns{left,middle,right}.
 * All widgets share a single react-grid-layout canvas; layout is always required.
 */

export type KosmosWidgetType =
  // Mandatory tab widgets
  | 'platformArchitecture'
  | 'beAgentTabConfig'
  // Overview widgets
  | 'overviewBeSense'
  | 'overviewAnomalyMetric'
  | 'overviewLoadMetric'
  | 'overviewEgtMetric'
  | 'overviewRealtimeChart'
  | 'overviewDataFlow'
  | 'overviewBeAgentStatus'
  // Combustion DL widgets
  | 'combustionDlHeader'
  | 'combustionDlPressureSignal'
  | 'combustionDlFrequencySpectrum'
  | 'combustionDlFeatureMatrix'
  | 'combustionDlFrameworkPipeline'
  | 'combustionDlAnomalyTrend'
  | 'combustionDlPhysicsMetrics'
  | 'combustionDlPrecursorClassification'
  | 'combustionDlClassifierOutputs'
  | 'combustionDlTrainingPerformance'
  | 'combustionDlTurbineInfo';

export interface BeAgentModule {
  id: string;
  name: string;
  desc: string;
  status: 'ACTIVE' | 'IDLE';
  detailDesc: string;
  metrics: { label: string; value: string; color: string }[];
}

export interface BeAgentStatusRow {
  id: string;
  label: string;
  value: string;
  tagType: 'green' | 'amber' | 'blue' | 'red';
}

export interface BeAgentFleetMetric {
  id: string;
  label: string;
  value: string;
  color: string;
}

export interface BeAgentAction {
  id: string;
  time: string;
  msg: string;
  level: 'ok' | 'info' | 'warn';
}

export interface BeAgentTabConfig {
  modules: BeAgentModule[];
  platformStatus: BeAgentStatusRow[];
  fleetOverview: BeAgentFleetMetric[];
  recentActions: BeAgentAction[];
  cannedResponses: string[];
  deviceId?: string;
}

export interface KosmosWidget {
  id: string;
  type: KosmosWidgetType;
  config: Record<string, any>;
  /** Grid position — always required in unified canvas model (ADR-044) */
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

/** Platform Architecture card — text label */
export interface PlatCard {
  id: string;
  text: string;
}

/** Platform Architecture subsection layer (e.g., Physical Assets, BE SENSE™, etc.) */
export interface PlatSubsection {
  id: string;
  title: string;
  style: 'pb-deep' | 'pb-blue' | 'pb-green' | 'pb-teal';
  borderColor: string;
  labelColor?: string;
  cards: PlatCard[];
}

/** Platform Architecture widget configuration */
export interface PlatformArchitectureConfig {
  subsections: PlatSubsection[];
}

/** Data Flow widget — block configuration */
export interface DataFlowBlockConfig {
  id: string;
  label: string;
  color: 'sensor' | 'fusion' | 'agent' | 'cloud' | 'output';
}

/** Data Flow widget — layer configuration */
export interface DataFlowLayerConfig {
  id: string;
  label: string;
  blocks: DataFlowBlockConfig[];
  arrowAfter: 'forward' | 'backward' | 'bidirectional' | 'none';
}

/** Data Flow widget — complete configuration */
export interface DataFlowWidgetConfig {
  title: string;
  layers: DataFlowLayerConfig[];
}

/** Canonical 5-layer data flow seed (from kosmos_showcase.html) */
export const DATAFLOW_DEFAULT_CONFIG: DataFlowWidgetConfig = {
  title: 'DATA FLOW — KOSMOS PLATFORM',
  layers: [
    {
      id: 'physical',
      label: 'Physical Layer',
      blocks: [
        { id: 'b1', label: 'Gas Turbine\nGE / Siemens / MHI', color: 'sensor' },
        { id: 'b2', label: 'Balance of Plant', color: 'sensor' },
      ],
      arrowAfter: 'none', // first layer — no incoming arrow
    },
    {
      id: 'be_sense',
      label: 'BE Sense™',
      blocks: [
        { id: 'b3', label: 'Multimodal\nSensor Fusion', color: 'fusion' },
        { id: 'b4', label: 'CalorieSense™\nEdge', color: 'fusion' },
      ],
      arrowAfter: 'bidirectional', // ⇄ from Physical → BE Sense
    },
    {
      id: 'be_agent',
      label: 'BE Agent™',
      blocks: [
        { id: 'b5', label: 'Agentic AI\nFramework', color: 'agent' },
        { id: 'b6', label: 'CD Precursor\nDetection', color: 'agent' },
      ],
      arrowAfter: 'forward', // → from BE Sense → BE Agent
    },
    {
      id: 'cloud_onprem',
      label: 'Cloud / On-Prem',
      blocks: [
        { id: 'b7', label: 'Fleet\nAnalytics', color: 'cloud' },
        { id: 'b8', label: 'Asset Life\nManagement', color: 'cloud' },
      ],
      arrowAfter: 'bidirectional', // ⇄ from BE Agent → Cloud
    },
    {
      id: 'outputs',
      label: 'Outputs',
      blocks: [
        { id: 'b9', label: 'CMMS\nIntegration', color: 'output' },
        { id: 'b10', label: 'Operator\nDashboard', color: 'output' },
      ],
      arrowAfter: 'forward', // → from Cloud → Outputs
    },
  ],
};

export interface KosmosPage {
  id: string;
  name: string;
  order: number;
  /** Flat widget list — replaces columns{left,middle,right} (ADR-044) */
  widgets: KosmosWidget[];
  /** Mark as mandatory page (e.g., Overview, Architecture) */
  isMandatory?: boolean;
  /** Type of mandatory page: overview, combustionDl, beAgent, kosmosArchitecture */
  mandatoryType?: 'overview' | 'combustionDl' | 'beAgent' | 'kosmosArchitecture';
  /** Layout format version — pages with layoutVersion >= 2 skip legacy migration */
  layoutVersion?: number;
  /** Schema version — pages without this field (or with older version) are re-seeded on load */
  layoutSchemaVersion?: number;
}

/** Dashboard entity returned by API (ADR-045: user-based sharing) */
export interface Dashboard {
  id: string;
  dashboardId: string;
  applicationId: string;
  orgId?: string;
  name: string;
  description?: string;
  blocks?: any[];
  layouts?: Record<string, any>;
  pages?: KosmosPage[];
  sharedWithUsers: string[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Metadata returned by share endpoint */
export interface ShareInfo {
  shareToken: string;
  shareEnabled: boolean;
  shareUrl: string;
}

/** Palette entry shown in WidgetPalette */
export interface PaletteEntry {
  type: KosmosWidgetType;
  label: string;
  icon: string;
  description: string;
  defaultConfig: Record<string, any>;
  defaultLayout: { x: number; y: number; w: number; h: number };
  tabScope?: 'overview' | 'combustionDl' | 'any';
  module?: 'combustion_dl' | 'asset_life' | 'be_agent';
}

export const PALETTE_ENTRIES: PaletteEntry[] = [
  {
    type: 'overviewBeSense',
    label: 'BE Sense',
    icon: '◈',
    description: 'Sensor fusion, acquisition and CalorieSense link.',
    defaultConfig: {
      deviceId: '',
      cvFieldName: '',
      sampleRate: '50 kHz',
      channels: '16 Active',
      latency: '< 8 ms',
      cvValue: '38.2 MJ/m³',
      sensors: [
        { name: 'CD-P01', fieldName: '', value: '4.2 kPa', active: true, status: 's-ok' },
        { name: 'CD-P02', fieldName: '', value: '4.1 kPa', active: true, status: 's-ok' },
        { name: 'T-EGT', fieldName: '', value: '612°C', active: true, status: 's-ok' },
        { name: 'VIB-X', fieldName: '', value: '2.1 mm/s', active: false, status: 's-warn' },
        { name: 'NOx', fieldName: '', value: '18.4 ppm', active: true, status: 's-ok' },
        { name: 'CO', fieldName: '', value: '12.1 ppm', active: true, status: 's-ok' },
        { name: 'CV', fieldName: '', value: '38.2 MJ/m³', active: true, status: 's-ok' },
        { name: 'H₂%', fieldName: '', value: '3.2 %', active: true, status: 's-ok' },
      ],
    },
    defaultLayout: { x: 1, y: 1, w: 10, h: 38 },
    tabScope: 'overview',
  },
  {
    type: 'overviewAnomalyMetric',
    label: 'Anomaly Score',
    icon: '◈',
    description: 'Overview anomaly score metric card.',
    defaultConfig: { deviceId: '', fieldName: 'anomaly_score' },
    defaultLayout: { x: 11, y: 1, w: 8, h: 8 },
    tabScope: 'overview',
  },
  {
    type: 'overviewLoadMetric',
    label: 'Turbine Load',
    icon: '◈',
    description: 'Overview turbine load metric card.',
    defaultConfig: { deviceId: '', fieldName: 'turbine_load', label: 'TURBINE LOAD', unit: '% MCR', value: '84.2', trend: '◆ STEADY' },
    defaultLayout: { x: 20, y: 1, w: 8, h: 8 },
    tabScope: 'overview',
  },
  {
    type: 'overviewEgtMetric',
    label: 'EGT Spread',
    icon: '◈',
    description: 'Overview EGT spread metric card.',
    defaultConfig: { deviceId: '', fieldName: 'egt_spread', label: 'EGT SPREAD', unit: '°C Δ', value: '12.4', trend: '▲ MONITOR' },
    defaultLayout: { x: 29, y: 1, w: 8, h: 8 },
    tabScope: 'overview',
  },
  {
    type: 'overviewRealtimeChart',
    label: 'Realtime Chart',
    icon: '〜',
    description: 'Combustion dynamics realtime signal chart.',
    defaultConfig: { deviceId: '', fieldName: 'temperature' },
    defaultLayout: { x: 11, y: 9, w: 26, h: 12 },
    tabScope: 'overview',
  },
  {
    type: 'overviewDataFlow',
    label: 'Data Flow',
    icon: '⬡',
    description: 'Kosmos platform data flow architecture.',
    defaultConfig: DATAFLOW_DEFAULT_CONFIG,
    defaultLayout: { x: 11, y: 22, w: 26, h: 17 },
    tabScope: 'overview',
  },
  {
    type: 'overviewBeAgentStatus',
    label: 'BE Agent',
    icon: '⟳',
    description: 'Agent status, alerts and health index.',
    defaultConfig: {
      deviceId: '',
      healthScore: 86,
      modules: [
        { name: 'CD Precursor', desc: 'Feature-driven DL anomaly detection', status: 'RUN' },
        { name: 'Thermo Perf.', desc: 'Compressor / turbine efficiency', status: 'RUN' },
        { name: 'Vibration', desc: 'Rotor dynamics & blade health', status: 'IDLE' },
        { name: 'Emissions Opt.', desc: 'NOx/CO optimisation loop', status: 'IDLE' },
        { name: 'Fuel Quality', desc: 'CalorieSense™ adaptive tuning', status: 'RUN' },
        { name: 'Asset Life', desc: 'Creep / LCF remaining life', status: 'IDLE' },
      ],
      alerts: [
        { time: '14:58:02', msg: 'Combustion stable', sub: 'CD anomaly score nominal', level: 'ok' },
        { time: '14:52:17', msg: 'VIB-X elevated', sub: '2.1 mm/s — monitor bearing', level: 'warning' },
        { time: '14:40:00', msg: 'CV shift detected', sub: 'H₂ fraction +0.4% — adapting', level: 'info' },
      ],
    },
    defaultLayout: { x: 37, y: 1, w: 11, h: 38 },
    tabScope: 'overview',
    module: 'be_agent',
  },
  {
    type: 'combustionDlHeader',
    label: 'DL Header',
    icon: '◈',
    description: 'Paper demo heading and method summary.',
    defaultConfig: {
      title: 'FEATURE-DRIVEN DEEP LEARNING — GT2026 PAPER DEMO',
      description: `Agentic AI framework applying physics-informed feature extraction from high-speed combustion dynamics pressure signals.
Autoencoder + LSTM network detects thermoacoustic precursors prior to visible lean blowout or flashback events.
Features: DFT amplitude spectra, SPL, Hurst exponent, Shannon entropy, mutual information.`,
      tags: [
        { text: 'AUTOENCODER', color: 'green' },
        { text: 'LSTM', color: '' },
        { text: 'DFT FEATURES', color: '' },
        { text: 'THERMO-ACOUSTIC', color: 'amber' },
      ],
    },
    defaultLayout: { x: 1, y: 1, w: 38, h: 6 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlPressureSignal',
    label: 'CD Pressure',
    icon: '◈',
    description: 'Live CD pressure signal card.',
    defaultConfig: { title: 'CD PRESSURE SIGNAL', deviceId: '', fieldName: 'cd_pressure' },
    defaultLayout: { x: 1, y: 8, w: 12, h: 11 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlFrequencySpectrum',
    label: 'FFT Spectrum',
    icon: '◈',
    description: 'Frequency spectrum DFT card.',
    defaultConfig: { title: 'FREQUENCY SPECTRUM (DFT)', deviceId: '', fieldName: 'dft_energy' },
    defaultLayout: { x: 1, y: 19, w: 12, h: 11 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlFeatureMatrix',
    label: 'Feature Matrix',
    icon: '◈',
    description: 'Extracted physics-informed feature grid.',
    defaultConfig: {
      deviceId: '',
      fieldName: 'feature_cells',
      title: 'EXTRACTED FEATURES',
      featureCells: [
        { label: 'DFT-50Hz', value: '0.42' },
        { label: 'DFT-80Hz', value: '0.35' },
        { label: 'DFT-120Hz', value: '0.68' },
        { label: 'DFT-186Hz', value: '0.85' },
        { label: 'DFT-240Hz', value: '0.52' },
        { label: 'SPL-RMS', value: '0.61' },
        { label: 'SPL-Peak', value: '0.73' },
        { label: 'SPL-Var', value: '0.45' },
        { label: 'SPL-dB', value: '0.58' },
        { label: 'SPL-idx', value: '0.64' },
        { label: 'Hurst-H', value: '0.48' },
        { label: 'Hurst-R/S', value: '0.55' },
        { label: 'Hurst-var', value: '0.72' },
        { label: 'Hurst-lag', value: '0.39' },
        { label: 'Hurst-fit', value: '0.67' },
        { label: 'Entropy-S', value: '0.51' },
        { label: 'Entropy-R', value: '0.58' },
        { label: 'Entropy-P', value: '0.74' },
        { label: 'Entropy-K', value: '0.43' },
        { label: 'Entropy-J', value: '0.62' },
        { label: 'MI-P/T', value: '0.47' },
        { label: 'MI-T/N', value: '0.65' },
        { label: 'MI-N/P', value: '0.53' },
        { label: 'MI-cross', value: '0.76' },
        { label: 'MI-auto', value: '0.44' },
      ],
    },
    defaultLayout: { x: 1, y: 31, w: 12, h: 18 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlFrameworkPipeline',
    label: 'DL Pipeline',
    icon: '⬡',
    description: 'Autoencoder and LSTM framework pipeline.',
    defaultConfig: {
      title: 'DL FRAMEWORK PIPELINE',
      pipelineLayers: [
        { label: 'INPUT', name: 'Raw CD Signal [N×1]', value: '50 kHz', background: 'rgba(13,60,122,0.5)', border: 'var(--k-mid)', color: 'var(--k-pale)' },
        { label: 'FEATURE EXT.', name: 'Physics-Informed Features', value: 'DFT·SPL·H·S', background: 'rgba(21,96,189,0.25)', border: 'var(--k-soft)', color: 'var(--k-ultra-light)' },
        { label: 'ENCODER', name: 'Conv1D Autoencoder', value: '128→32', background: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', color: 'var(--k-green)' },
        { label: 'TEMPORAL', name: 'Bi-LSTM Sequence', value: '32→64', background: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', color: 'var(--k-green)' },
        { label: 'DECODER', name: 'Reconstruction', value: '64→128', background: 'rgba(21,96,189,0.2)', border: 'var(--k-mid)', color: 'var(--k-soft)' },
      ],
    },
    defaultLayout: { x: 13, y: 8, w: 13, h: 17 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlAnomalyTrend',
    label: 'Anomaly Trend',
    icon: '◈',
    description: 'Anomaly score trend chart.',
    defaultConfig: { title: 'ANOMALY SCORE TREND', deviceId: '', fieldName: 'anomaly_score' },
    defaultLayout: { x: 13, y: 25, w: 13, h: 10 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlPhysicsMetrics',
    label: 'Physics Metrics',
    icon: '◈',
    description: 'SPL, Hurst, entropy and other physics metrics.',
    defaultConfig: {
      title: 'PHYSICS FEATURE METRICS',
      metrics: [
        { label: 'SPL (Overall)', value: '142.3 dB', width: 72 },
        { label: 'Hurst Exponent', value: '0.63', width: 63 },
        { label: 'Shannon Entropy', value: '4.21 nats', width: 55 },
        { label: 'Mutual Info (P·T)', value: '0.38', width: 38 },
        { label: 'DFT Dominant Freq.', value: '186 Hz', width: 45 },
      ],
    },
    defaultLayout: { x: 13, y: 35, w: 13, h: 10 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlPrecursorClassification',
    label: 'Classification',
    icon: '⟳',
    description: 'Precursor classification score ring.',
    defaultConfig: {
      title: 'PRECURSOR CLASSIFICATION',
      confidence: 86,
      classLabel: 'NORMAL OPERATION',
      subText: 'No precursor signature detected',
    },
    defaultLayout: { x: 26, y: 8, w: 10, h: 11 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlClassifierOutputs',
    label: 'Classifier Outputs',
    icon: '◈',
    description: 'Class probability output bars.',
    defaultConfig: {
      title: 'CLASSIFIER OUTPUTS',
      outputs: [
        { label: 'Normal Operation', value: '86%', width: 86 },
        { label: 'Lean Blowout Risk', value: '9%', width: 9 },
        { label: 'Flashback Risk', value: '3%', width: 3 },
        { label: 'Thermo-acoustic Instb.', value: '2%', width: 2 },
      ],
    },
    defaultLayout: { x: 26, y: 19, w: 10, h: 9 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlTrainingPerformance',
    label: 'Training Perf',
    icon: '◈',
    description: 'Training and model quality metrics.',
    defaultConfig: {
      title: 'TRAINING PERFORMANCE',
      rows: [
        { label: 'DETECTION F1', value: '0.94' },
        { label: 'PRECISION', value: '0.92' },
        { label: 'RECALL', value: '0.96' },
        { label: 'LEAD TIME', value: '~45 sec' },
        { label: 'TRAIN DATA', value: '8,400 windows' },
      ],
    },
    defaultLayout: { x: 26, y: 29, w: 10, h: 9 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
  {
    type: 'combustionDlTurbineInfo',
    label: 'Turbine Info',
    icon: '◈',
    description: 'Unit/OEM/combustor/fuel summary card for Combustion DL.',
    defaultConfig: {
      unit: 'GT-DLE Frame 6B',
      oem: 'OEM-Agnostic',
      combustor: 'DLE / Lean Pre-mix',
      fuel: 'NG + H2 blend',
    },
    defaultLayout: { x: 1, y: 1, w: 14, h: 12 },
    tabScope: 'combustionDl',
    module: 'combustion_dl',
  },
];
