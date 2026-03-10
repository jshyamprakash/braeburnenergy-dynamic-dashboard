/**
 * Kosmos Dashboard Data Types
 *
 * ADR-044: Unified free-canvas layout — KosmosPage.widgets[] replaces columns{left,middle,right}.
 * All widgets share a single react-grid-layout canvas; layout is always required.
 */

export type KosmosWidgetType =
  // Kosmos-native widgets (dark-themed, showcase-matched)
  | 'kpiCard'
  | 'sensorValueList'
  | 'realTimeChart'
  | 'featureMatrix'
  | 'alertList'
  | 'moduleStatusList'
  | 'healthRing'
  | 'archDiagram'
  // Platform widgets (re-skinned to Kosmos theme)
  | 'gauge'
  | 'chart'
  | 'activeAlarms'
  | 'statusText'
  // New showcase widgets (ADR-044)
  | 'confidenceBars'
  | 'keyValueTable'
  | 'frequencyChart'
  | 'platformDiagram'
  | 'agentChat'
  // Showcase-exact panel widgets (plan: Showcase-Exact Widget Components)
  | 'beSensePanel'
  | 'beAgentPanel'
  | 'combustionHeader'
  | 'dlFrameworkPipeline'
  | 'precursorClassification'
  | 'agentModules'
  | 'platformStatus'
  | 'vsOemPlatforms'
  | 'deploymentModes'
  | 'conferenceInfo';

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

export interface KosmosPage {
  id: string;
  name: string;
  order: number;
  /** Flat widget list — replaces columns{left,middle,right} (ADR-044) */
  widgets: KosmosWidget[];
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
}

export const PALETTE_ENTRIES: PaletteEntry[] = [
  {
    type: 'kpiCard',
    label: 'KPI Card',
    icon: '◆',
    description: 'Single value with label, unit and trend',
    defaultConfig: { label: 'KPI', value: '—', unit: '', trend: 'flat', trendLabel: '' },
    defaultLayout: { x: 0, y: 0, w: 3, h: 2 },
  },
  {
    type: 'sensorValueList',
    label: 'Sensor List',
    icon: '≡',
    description: 'Tag:value list with status indicators',
    defaultConfig: { title: 'Sensors', deviceId: '', fields: [] },
    defaultLayout: { x: 0, y: 0, w: 3, h: 4 },
  },
  {
    type: 'realTimeChart',
    label: 'Real-Time Chart',
    icon: '〜',
    description: 'Live waveform or time-series chart',
    defaultConfig: { title: 'Real-Time', deviceId: '', field: '', chartType: 'line' },
    defaultLayout: { x: 0, y: 0, w: 6, h: 4 },
  },
  {
    type: 'featureMatrix',
    label: 'Feature Matrix',
    icon: '⬡',
    description: '5×5 heatmap grid for multi-dimensional data',
    defaultConfig: { title: 'Features', data: [] },
    defaultLayout: { x: 0, y: 0, w: 4, h: 4 },
  },
  {
    type: 'alertList',
    label: 'Alert List',
    icon: '⚠',
    description: 'Alert feed with severity colour coding',
    defaultConfig: { title: 'Alerts', deviceId: '', maxItems: 5 },
    defaultLayout: { x: 0, y: 0, w: 3, h: 4 },
  },
  {
    type: 'moduleStatusList',
    label: 'Module Status',
    icon: '●',
    description: 'Module list with online/offline status dots',
    defaultConfig: { title: 'Modules', modules: [] },
    defaultLayout: { x: 0, y: 0, w: 3, h: 5 },
  },
  {
    type: 'healthRing',
    label: 'Health Ring',
    icon: '◎',
    description: 'Circular gauge showing a health index',
    defaultConfig: { title: 'Health Index', deviceId: '', field: '', max: 100 },
    defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
  },
  {
    type: 'archDiagram',
    label: 'Architecture Diagram',
    icon: '⬡',
    description: 'Embeds the platform architecture image',
    defaultConfig: { title: 'Architecture', showLightbox: true },
    defaultLayout: { x: 0, y: 0, w: 6, h: 5 },
  },
  {
    type: 'gauge',
    label: 'Gauge',
    icon: '◉',
    description: 'Radial gauge for a sensor value',
    defaultConfig: { title: 'Gauge', deviceId: '', field: '', min: 0, max: 100, unit: '' },
    defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
  },
  {
    type: 'activeAlarms',
    label: 'Active Alarms',
    icon: '🔔',
    description: 'ISA-18.2 active alarm feed',
    defaultConfig: { title: 'Active Alarms', deviceId: '' },
    defaultLayout: { x: 0, y: 0, w: 6, h: 4 },
  },
  {
    type: 'statusText',
    label: 'Status Text',
    icon: '▣',
    description: 'Device field value with status badge',
    defaultConfig: { title: 'Status', deviceId: '', field: '', goodValues: [], warningValues: [] },
    defaultLayout: { x: 0, y: 0, w: 4, h: 2 },
  },
  // New showcase widgets (ADR-044)
  {
    type: 'confidenceBars',
    label: 'Confidence Bars',
    icon: '▌',
    description: 'Labeled progress bars showing confidence or percentage values',
    defaultConfig: {
      title: 'Classifier Outputs',
      items: [
        { label: 'Normal Operation', value: 86, color: 'green' },
        { label: 'Lean Blowout Risk', value: 9, color: 'amber' },
        { label: 'Flashback Risk', value: 3, color: 'blue' },
        { label: 'Thermo-acoustic', value: 2, color: 'red' },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 4 },
  },
  {
    type: 'keyValueTable',
    label: 'Key-Value Table',
    icon: '⊟',
    description: 'Two-column key/value rows for status or fleet data',
    defaultConfig: {
      title: 'Fleet Overview',
      items: [
        { key: 'TOTAL UNITS', value: '12' },
        { key: 'ONLINE', value: '10' },
        { key: 'ALERTS ACTIVE', value: '2' },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 3 },
  },
  {
    type: 'frequencyChart',
    label: 'Frequency Chart',
    icon: '≋',
    description: 'Bar chart for frequency spectrum or histogram data',
    defaultConfig: { title: 'Frequency Spectrum', deviceId: '', field: '' },
    defaultLayout: { x: 0, y: 0, w: 5, h: 4 },
  },
  {
    type: 'platformDiagram',
    label: 'Platform Diagram',
    icon: '⬡',
    description: 'Vertical layered platform architecture diagram',
    defaultConfig: {
      title: 'Platform Architecture',
      layers: [
        { label: 'Physical Assets', color: 'base', items: ['Gas Turbine', 'Balance of Plant'] },
        { label: 'BE SENSE™', color: 'soft', items: ['Sensor Fusion', 'CalorieSense™'] },
        { label: 'BE AGENT™', color: 'green', items: ['CD Precursor', 'Thermo Perf.'] },
        { label: 'KOSMOS™', color: 'teal', items: ['Edge Node', 'Fleet Dashboard'] },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 6, h: 6 },
  },
  {
    type: 'agentChat',
    label: 'Agent Chat',
    icon: '⟳',
    description: 'BE Agent™ AI chat interface (display only)',
    defaultConfig: {
      title: 'BE AGENT™',
      messages: [
        { role: 'system', text: 'BE Agent™ online. Kosmos platform active. All modules nominal.' },
        { role: 'agent', text: 'CD precursor score: 0.14 — Normal operation. No intervention required.' },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 5, h: 6 },
  },
  // Showcase-exact panel widgets
  {
    type: 'beSensePanel',
    label: 'BE SENSE™ Panel',
    icon: '◈',
    description: 'Sensor fusion panel: sensor grid, acquisition settings, CalorieSense link',
    defaultConfig: {
      title: 'BE SENSE™',
      sensors: [
        { name: 'CD-P01', value: '4.2 kPa', status: 'ok' },
        { name: 'CD-P02', value: '4.1 kPa', status: 'ok' },
        { name: 'T-EGT', value: '612°C', status: 'ok' },
        { name: 'VIB-X', value: '2.1 mm/s', status: 'warn' },
        { name: 'NOx', value: '18.4 ppm', status: 'ok' },
        { name: 'CO', value: '12.1 ppm', status: 'ok' },
        { name: 'CV', value: '38.2 MJ/m³', status: 'ok' },
        { name: 'H₂%', value: '3.2%', status: 'ok' },
      ],
      acquisition: {
        sampleRate: '50 kHz',
        channels: '16 Active',
        latency: '< 8 ms',
        edgeNode: 'ACTIVE',
      },
      calorieSense: {
        value: '38.2 MJ/m³',
        sub: '1024.7 BTU/SCF',
        tags: ['CV ✓', 'H2F ✓', 'CARI'],
      },
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 8 },
  },
  {
    type: 'beAgentPanel',
    label: 'BE AGENT™ Panel',
    icon: '⟳',
    description: 'Agent status panel: module list, alerts, and health ring score',
    defaultConfig: {
      title: 'BE AGENT™',
      modules: [
        { name: 'CD Precursor', desc: 'RUN', status: 'active' },
        { name: 'Thermo Perf.', desc: 'RUN', status: 'active' },
        { name: 'Vibration', desc: 'IDLE', status: 'idle' },
        { name: 'Emissions Opt.', desc: 'IDLE', status: 'idle' },
        { name: 'Fuel Quality', desc: 'RUN', status: 'active' },
        { name: 'Asset Life', desc: 'IDLE', status: 'idle' },
      ],
      alerts: [
        { time: '14:58:02', msg: 'Combustion stable', sub: 'CD anomaly score nominal', severity: 'ok' },
        { time: '14:52:17', msg: 'VIB-X elevated', sub: '2.1 mm/s — monitor bearing', severity: 'warning' },
        { time: '14:40:00', msg: 'CV shift detected', sub: 'H₂ fraction +0.4% — adapting', severity: 'info' },
      ],
      healthScore: 86,
      healthLabel: 'TURBINE HEALTH INDEX',
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 7 },
  },
  {
    type: 'combustionHeader',
    label: 'Combustion Header',
    icon: '◈',
    description: 'Full-width paper info card with description and tag cluster',
    defaultConfig: {
      title: 'FEATURE-DRIVEN DEEP LEARNING — GT2026 PAPER DEMO',
      paperRef: 'GT2026-179161',
      description:
        'Agentic AI framework applying physics-informed feature extraction from high-speed combustion dynamics pressure signals. Autoencoder + LSTM network detects thermoacoustic precursors prior to visible lean blowout or flashback events.',
      tags: ['GT2026-179161', 'LIVE INFERENCE', 'AUTOENCODER', 'LSTM', 'DFT FEATURES', 'THERMO-ACOUSTIC'],
    },
    defaultLayout: { x: 0, y: 0, w: 12, h: 3 },
  },
  {
    type: 'dlFrameworkPipeline',
    label: 'DL Framework Pipeline',
    icon: '▥',
    description: 'Deep learning architecture pipeline with shimmer animation',
    defaultConfig: {
      title: 'DL FRAMEWORK PIPELINE',
      layers: [
        { label: 'INPUT', name: 'Raw CD Signal [N×1]', val: '50 kHz', color: 'rgba(13,60,122,0.5)', border: 'var(--k-mid)', text: 'var(--k-pale)' },
        { label: 'FEATURE EXT.', name: 'Physics-Informed Features', val: 'DFT·SPL·H·S', color: 'rgba(21,96,189,0.25)', border: 'var(--k-soft)', text: 'var(--k-ultra-light)' },
        { label: 'ENCODER', name: 'Conv1D Autoencoder', val: '128→32', color: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', text: 'var(--k-green)' },
        { label: 'TEMPORAL', name: 'Bi-LSTM Sequence', val: '32→64', color: 'rgba(0,176,80,0.12)', border: 'var(--k-green)', text: 'var(--k-green)' },
        { label: 'DECODER', name: 'Reconstruction', val: '64→128', color: 'rgba(21,96,189,0.2)', border: 'var(--k-mid)', text: 'var(--k-soft)' },
        { label: 'ANOMALY', name: 'Reconstruction Error → Score', val: '0.14', color: 'rgba(255,184,0,0.1)', border: 'var(--k-amber)', text: 'var(--k-amber)' },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 5, h: 5 },
  },
  {
    type: 'precursorClassification',
    label: 'Precursor Classification',
    icon: '◎',
    description: 'Score ring with classification label',
    defaultConfig: {
      confidence: 86,
      classification: 'NORMAL OPERATION',
      subLabel: 'No precursor signature detected',
      color: 'var(--k-green)',
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 4 },
  },
  {
    type: 'agentModules',
    label: 'Agent Modules',
    icon: '⟳',
    description: '9 clickable modules with inline module detail panel',
    defaultConfig: {
      title: 'BE AGENT™ MODULES',
      modules: [
        { name: 'CD Precursor Detection', desc: 'GT2026 — Autoencoder·LSTM·DFT features', status: 'active', detailDesc: 'Physics-informed DL framework for combustion instability precursor identification. Autoencoder-LSTM pipeline with 45-second advance warning on lean blowout and flashback events.', metrics: [{ label: 'ANOMALY SCORE', value: '0.14', color: 'var(--k-green)' }, { label: 'LEAD TIME', value: '~45s', color: 'var(--k-soft)' }, { label: 'F1 SCORE', value: '0.94', color: 'var(--k-amber)' }] },
        { name: 'Thermodynamic Performance', desc: 'Compressor map · efficiency tracking', status: 'active', detailDesc: 'Monitors compressor efficiency, turbine inlet temperature, and heat rate trends to detect performance degradation and fouling.', metrics: [{ label: 'EFFICIENCY', value: '91.2%', color: 'var(--k-green)' }, { label: 'HEAT RATE', value: '9.82 MJ/kWh', color: 'var(--k-soft)' }, { label: 'DELTA T', value: '12.4°C', color: 'var(--k-amber)' }] },
        { name: 'Fuel Quality Adaptation', desc: 'CalorieSense™ link · CV · H₂ adaptive', status: 'active', detailDesc: 'Real-time fuel calorific value monitoring with adaptive control. CalorieSense™ integration ensures safe combustion across variable H₂ blends.', metrics: [{ label: 'CV', value: '38.2 MJ/m³', color: 'var(--k-green)' }, { label: 'H₂%', value: '3.2%', color: 'var(--k-soft)' }, { label: 'ADAPT.', value: 'ACTIVE', color: 'var(--k-green)' }] },
        { name: 'Vibration & Rotor Dynamics', desc: 'Blade pass · sub-sync · bearing', status: 'idle', detailDesc: 'Vibration spectral analysis for blade pass frequencies, sub-synchronous instabilities, and bearing health assessment.', metrics: [{ label: 'VIB-X', value: '2.1 mm/s', color: 'var(--k-amber)' }, { label: 'BLADE PASS', value: '186 Hz', color: 'var(--k-soft)' }, { label: 'BEARING', value: 'MONITOR', color: 'var(--k-amber)' }] },
        { name: 'Emissions Optimisation', desc: 'NOx · CO · CEMS closed-loop', status: 'idle', detailDesc: 'Closed-loop emissions control targeting regulatory NOx and CO limits. CEMS integration with real-time trim adjustments.', metrics: [{ label: 'NOx', value: '18.4 ppm', color: 'var(--k-green)' }, { label: 'CO', value: '12.1 ppm', color: 'var(--k-green)' }, { label: 'LIMIT', value: '25 ppm', color: 'var(--k-soft)' }] },
        { name: 'Asset Life Management', desc: 'Creep · LCF · RUL · hot section', status: 'idle', detailDesc: 'Remaining useful life prediction for hot section components using creep and low-cycle fatigue models.', metrics: [{ label: 'RUL', value: '4,200 h', color: 'var(--k-green)' }, { label: 'LCF', value: '78%', color: 'var(--k-soft)' }, { label: 'CREEP', value: 'LOW', color: 'var(--k-green)' }] },
        { name: 'Inlet Conditioning', desc: 'Evap cooler · chiller · fogging', status: 'idle', detailDesc: 'Inlet air temperature and humidity management for power augmentation and stable combustion at varying ambient conditions.', metrics: [{ label: 'INLET T', value: '18.2°C', color: 'var(--k-soft)' }, { label: 'POWER AUG', value: '+2.1%', color: 'var(--k-green)' }, { label: 'STATUS', value: 'IDLE', color: 'var(--k-text-dim)' }] },
        { name: 'Balance of Plant', desc: 'HRSG · FGC · electrical systems', status: 'idle', detailDesc: 'Balance of plant monitoring including HRSG performance, fuel gas conditioning, and auxiliary electrical systems.', metrics: [{ label: 'HRSG EFF.', value: '88.4%', color: 'var(--k-soft)' }, { label: 'FGC', value: 'NORMAL', color: 'var(--k-green)' }, { label: 'ELEC.', value: 'OK', color: 'var(--k-green)' }] },
        { name: 'Multi-fleet Benchmarking', desc: 'OEM-agnostic KPI normalisation', status: 'idle', detailDesc: 'Cross-OEM fleet performance normalisation and benchmarking. Identifies best-in-fleet practices and outlier units.', metrics: [{ label: 'FLEET SIZE', value: '12 units', color: 'var(--k-soft)' }, { label: 'ONLINE', value: '10', color: 'var(--k-green)' }, { label: 'OEMs', value: '3', color: 'var(--k-pale)' }] },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 4, h: 9 },
  },
  {
    type: 'platformStatus',
    label: 'Platform Status',
    icon: '▣',
    description: 'Key-value rows with colored tag badges',
    defaultConfig: {
      title: 'PLATFORM STATUS',
      rows: [
        { label: 'EDGE NODE', value: 'ONLINE', tagColor: 'green' },
        { label: 'CLOUD SYNC', value: 'LIVE', tagColor: 'green' },
        { label: 'BE SENSE™', value: 'FUSED', tagColor: 'green' },
        { label: 'CALORIESENSE™', value: 'LINKED', tagColor: 'green' },
        { label: 'CMMS BRIDGE', value: 'STANDBY', tagColor: 'amber' },
        { label: 'DATA OWNER', value: 'OPERATOR', tagColor: 'blue' },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 4 },
  },
  {
    type: 'vsOemPlatforms',
    label: 'VS OEM Platforms',
    icon: '✓',
    description: 'Kosmos™ advantage checkmark list (USP points)',
    defaultConfig: {
      title: 'KOSMOS™ vs OEM PLATFORMS',
      points: [
        'OEM-agnostic — GE, Siemens, MHI, Solar',
        'Full data ownership — operator retained',
        'Transparent models — no black box',
        'Rapid deployment — weeks not years',
        'No LTSA conflict of interest',
        '50 kHz high-speed combustion data',
        'Cross-OEM fleet benchmarking',
        'Edge + cloud / on-prem deployment',
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 6 },
  },
  {
    type: 'deploymentModes',
    label: 'Deployment Modes',
    icon: '⬡',
    description: '3-tier deployment options: Edge / Private Cloud / On-Premises',
    defaultConfig: {
      title: 'DEPLOYMENT MODES',
      modes: [
        { title: 'EDGE', description: 'Sub-8ms latency · on-site compute · no cloud dependency', color: 'var(--k-soft)' },
        { title: 'PRIVATE CLOUD', description: 'Fleet-wide analytics · historian · dashboards', color: 'var(--k-mid)' },
        { title: 'ON-PREMISES', description: 'Air-gapped · operator data sovereignty', color: 'var(--k-deep)' },
      ],
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 5 },
  },
  {
    type: 'conferenceInfo',
    label: 'Conference Info',
    icon: '◆',
    description: 'Paper reference card with conference name and tags',
    defaultConfig: {
      conference: 'ASME TURBO EXPO 2026',
      paperTitle: 'Paper GT2026-179161: Feature-Driven Deep Learning Framework for Combustion Dynamics Precursor Detection in Gas Turbines',
      paperRef: 'GT2026-179161',
      org: 'BRAEBURN ENERGY',
    },
    defaultLayout: { x: 0, y: 0, w: 3, h: 4 },
  },
];
