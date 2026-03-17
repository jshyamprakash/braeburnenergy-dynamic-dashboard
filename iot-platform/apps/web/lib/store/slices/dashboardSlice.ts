import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dashboardConfig } from '@/lib/config';
import { apiClient } from '@/lib/api-client';
import type { KosmosPage, KosmosWidget, Dashboard, BeAgentModule } from '@/components/kosmos/types';

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Layout interface (react-grid-layout)
 */
export interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

/**
 * Responsive layouts
 */
export type Layouts = { [breakpoint: string]: Layout[] };

/**
 * Dashboard block interface
 */
export interface DashboardBlock {
  id: string;
  type: 'gauge' | 'chart' | 'liveStream' | 'activeAlarms' | 'statusText';
  layouts: {
    lg: Layout;
    md: Layout;
    sm: Layout;
  };
  config: {
    title?: string;
    deviceId?: string;
    fields?: string[];
    chartType?: 'line' | 'area' | 'bar';
    gaugeConfig?: {
      min?: number;
      max?: number;
      unit?: string;
      warningThreshold?: number;
      criticalThreshold?: number;
    };
    [key: string]: any;
  };
}

/**
 * Dashboard state interface
 */
export interface DashboardState {
  dashboardId: string;
  applicationId: string;
  name: string;
  description: string;
  blocks: DashboardBlock[];
  layouts: Layouts;
  isEditMode: boolean;
  selectedBlockId: string | null;
  isDirty: boolean;
  lastSaved: number | null;
  // Sync state
  syncStatus: 'idle' | 'loading' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  isOnline: boolean;
  // Kosmos multi-page state
  kosmosPages: KosmosPage[];
  kosmosActivePage: string | null;
  kosmosSharedWithUsers: string[]; // List of User ObjectIds (ADR-045)
  // Viewer dashboards (dashboards shared with current user)
  viewerDashboards: Dashboard[];
}

/* ── Kosmos helpers ── */

/** Bump this when seeded layouts change — forces re-seed of any DB page with an older version */
const CURRENT_LAYOUT_SCHEMA = 3;

function makeDefaultPage(name: string, order: number): KosmosPage {
  return {
    id: `page_${shortId()}`,
    name,
    order,
    widgets: [],
    layoutVersion: 2,
  };
}

/** Create the mandatory Overview page (order: 0) */
function makeOverviewPage(): KosmosPage {
  const widgets: KosmosWidget[] = [
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewBeSense',
      config: {},
      layout: { x: 16, y: 16, w: 300, h: 760 },
    },
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewAnomalyMetric',
      config: {},
      layout: { x: 332, y: 16, w: 248, h: 150 },
    },
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewLoadMetric',
      config: {},
      layout: { x: 596, y: 16, w: 248, h: 150 },
    },
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewEgtMetric',
      config: {},
      layout: { x: 860, y: 16, w: 248, h: 150 },
    },
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewRealtimeChart',
      config: {},
      layout: { x: 332, y: 182, w: 776, h: 248 },
    },
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewDataFlow',
      config: {},
      layout: { x: 332, y: 446, w: 776, h: 330 },
    },
    {
      id: `w_ov_${shortId()}`,
      type: 'overviewBeAgentStatus',
      config: {},
      layout: { x: 1124, y: 16, w: 320, h: 760 },
    },
  ];

  return {
    id: `page_${shortId()}`,
    name: 'OVERVIEW',
    order: 0,
    widgets,
    isMandatory: true,
    mandatoryType: 'overview',
    layoutVersion: 2,
    layoutSchemaVersion: CURRENT_LAYOUT_SCHEMA,
  };
}

/** Create the mandatory Combustion DL page (order: 1) */
function makeCombustionDlPage(): KosmosPage {
  const widgets: KosmosWidget[] = [
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlHeader',
      config: {},
      layout: { x: 16, y: 16, w: 1168, h: 120 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlPressureSignal',
      config: {},
      layout: { x: 16, y: 152, w: 360, h: 220 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlFrequencySpectrum',
      config: {},
      layout: { x: 16, y: 388, w: 360, h: 220 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlFeatureMatrix',
      config: {},
      layout: { x: 16, y: 624, w: 360, h: 360 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlFrameworkPipeline',
      config: {},
      layout: { x: 392, y: 152, w: 390, h: 330 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlAnomalyTrend',
      config: {},
      layout: { x: 392, y: 498, w: 390, h: 190 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlPhysicsMetrics',
      config: {},
      layout: { x: 392, y: 704, w: 390, h: 200 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlPrecursorClassification',
      config: {},
      layout: { x: 798, y: 152, w: 320, h: 220 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlClassifierOutputs',
      config: {},
      layout: { x: 798, y: 388, w: 320, h: 180 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlTrainingPerformance',
      config: {},
      layout: { x: 798, y: 584, w: 320, h: 170 },
    },
    {
      id: `w_cdl_${shortId()}`,
      type: 'combustionDlTurbineInfo',
      config: {
        unit: 'GT-DLE Frame 6B',
        oem: 'OEM-Agnostic',
        combustor: 'DLE / Lean Pre-mix',
        fuel: 'NG + H2 blend',
      },
      layout: { x: 798, y: 770, w: 320, h: 160 },
    },
  ];

  return {
    id: `page_${shortId()}`,
    name: 'COMBUSTION DL',
    order: 1,
    widgets,
    isMandatory: true,
    mandatoryType: 'combustionDl',
    layoutVersion: 2,
    layoutSchemaVersion: CURRENT_LAYOUT_SCHEMA,
  };
}

/** Create the mandatory Kosmos Architecture page with seeded subsections */
function makeArchitecturePage(): KosmosPage {
  const archWidget: KosmosWidget = {
    id: `w_arch_${shortId()}`,
    type: 'platformArchitecture',
    config: {
      subsections: [
        {
          id: `sub_${shortId()}`,
          title: 'PHYSICAL ASSETS — OEM-AGNOSTIC',
          style: 'pb-deep',
          borderColor: 'rgba(60,140,211,0.3)',
          cards: [
            { id: `card_${shortId()}`, text: 'GE Frame 6B / 7FA' },
            { id: `card_${shortId()}`, text: 'Siemens SGT-700/800' },
            { id: `card_${shortId()}`, text: 'MHI M501 / H-Class' },
            { id: `card_${shortId()}`, text: 'Solar Taurus / Titan' },
            { id: `card_${shortId()}`, text: 'Balance of Plant' },
            { id: `card_${shortId()}`, text: 'HRSG / Aux Systems' },
          ],
        },
        {
          id: `sub_${shortId()}`,
          title: 'BE SENSE™ — MULTIMODAL SENSOR FUSION',
          style: 'pb-blue',
          borderColor: 'rgba(21,96,189,0.5)',
          labelColor: 'var(--k-soft)',
          cards: [
            { id: `card_${shortId()}`, text: 'CalorieSense™ CV/H₂' },
            { id: `card_${shortId()}`, text: 'CD Pressure (50 kHz)' },
            { id: `card_${shortId()}`, text: 'Vibration / Rotor' },
            { id: `card_${shortId()}`, text: 'Thermocouples / EGT' },
            { id: `card_${shortId()}`, text: 'CEMS Emissions' },
            { id: `card_${shortId()}`, text: 'Inlet / Ambient' },
            { id: `card_${shortId()}`, text: 'Performance KPIs' },
            { id: `card_${shortId()}`, text: 'Controls / DCS Feed' },
          ],
        },
        {
          id: `sub_${shortId()}`,
          title: 'BE AGENT™ — AGENTIC AI FRAMEWORK',
          style: 'pb-green',
          borderColor: 'rgba(0,176,80,0.5)',
          labelColor: 'var(--k-green)',
          cards: [
            { id: `card_${shortId()}`, text: 'CD Precursor (GT2026)' },
            { id: `card_${shortId()}`, text: 'Thermo Performance' },
            { id: `card_${shortId()}`, text: 'Emissions Optimisation' },
            { id: `card_${shortId()}`, text: 'Asset Life / RUL' },
            { id: `card_${shortId()}`, text: 'Vibration Analytics' },
            { id: `card_${shortId()}`, text: 'Fuel Quality Adapt.' },
            { id: `card_${shortId()}`, text: 'Fleet Benchmarking' },
            { id: `card_${shortId()}`, text: 'NL Agent Interface' },
          ],
        },
        {
          id: `sub_${shortId()}`,
          title: 'KOSMOS CORTEX™ PLATFORM — EDGE + CLOUD / ON-PREM',
          style: 'pb-teal',
          borderColor: 'rgba(0,176,140,0.4)',
          labelColor: '#00D0A8',
          cards: [
            { id: `card_${shortId()}`, text: 'Edge Compute Node' },
            { id: `card_${shortId()}`, text: 'Private Cloud Deploy' },
            { id: `card_${shortId()}`, text: 'On-Prem Server' },
            { id: `card_${shortId()}`, text: 'Fleet Dashboard' },
            { id: `card_${shortId()}`, text: 'Data Historian' },
            { id: `card_${shortId()}`, text: 'REST / OPC-UA APIs' },
          ],
        },
        {
          id: `sub_${shortId()}`,
          title: 'OPERATOR OUTPUTS',
          style: 'pb-deep',
          borderColor: 'rgba(13,60,122,0.6)',
          cards: [
            { id: `card_${shortId()}`, text: 'CMMS / Maximo' },
            { id: `card_${shortId()}`, text: 'Work Order Gen.' },
            { id: `card_${shortId()}`, text: 'Operator Alerts' },
            { id: `card_${shortId()}`, text: 'Performance Reports' },
            { id: `card_${shortId()}`, text: 'Regulatory Filing' },
          ],
        },
      ],
    },
    layout: { x: 0, y: 0, w: 48, h: 80 },
  };

  return {
    id: `page_${shortId()}`,
    name: 'KOSMOS CORTEX™ Architecture',
    order: 3,
    widgets: [archWidget],
    isMandatory: true,
    mandatoryType: 'kosmosArchitecture',
    layoutVersion: 2,
    layoutSchemaVersion: CURRENT_LAYOUT_SCHEMA,
  };
}

const DEFAULT_BE_AGENT_MODULES: Omit<BeAgentModule, 'id'>[] = [
  { name: 'CD Precursor Detection', desc: 'GT2026 — Autoencoder·LSTM·DFT features', status: 'ACTIVE', detailDesc: 'Physics-informed DL framework for combustion instability precursor identification. Autoencoder-LSTM pipeline with 45-second advance warning on lean blowout and flashback events.', metrics: [] },
  { name: 'Thermodynamic Performance', desc: 'Compressor map · efficiency tracking', status: 'ACTIVE', detailDesc: 'Compressor and turbine section efficiency tracking using isentropic analysis. Fouling detection via compressor map deviation.', metrics: [] },
  { name: 'Fuel Quality Adaptation', desc: 'CalorieSense™ link · CV · H₂ adaptive', status: 'ACTIVE', detailDesc: 'Real-time calorific value and H₂ fraction feed from CalorieSense™ edge device. Adaptive combustion tuning to prevent emissions exceedance during fuel quality swings.', metrics: [] },
  { name: 'Vibration & Rotor Dynamics', desc: 'Blade pass · sub-sync · bearing', status: 'IDLE', detailDesc: 'Spectral vibration analysis from shaft-riding probes. Blade pass frequency, sub-synchronous detection, bearing wear trending.', metrics: [] },
  { name: 'Emissions Optimisation', desc: 'NOx · CO · CEMS closed-loop', status: 'IDLE', detailDesc: 'Closed-loop NOx and CO optimisation using CEMS data. Model-based combustion tuning respecting emissions constraints while maximising efficiency.', metrics: [] },
  { name: 'Asset Life Management', desc: 'Creep · LCF · RUL · hot section', status: 'IDLE', detailDesc: 'Creep life consumption modelling for hot section components. Low-cycle fatigue counting, remaining useful life estimation, and maintenance scheduling.', metrics: [] },
  { name: 'Inlet Conditioning', desc: 'Evap cooler · chiller · fogging', status: 'IDLE', detailDesc: 'Inlet temperature and humidity tracking. Evap cooler / chiller optimisation for performance enhancement under high-ambient conditions.', metrics: [] },
  { name: 'Balance of Plant', desc: 'HRSG · FGC · electrical systems', status: 'IDLE', detailDesc: 'HRSG, fuel gas compressor, and electrical balance-of-plant cross-system interaction analytics. True root-cause analysis across boundaries.', metrics: [] },
  { name: 'Multi-fleet Benchmarking', desc: 'OEM-agnostic KPI normalisation', status: 'IDLE', detailDesc: 'Cross-site, cross-OEM benchmarking of KPIs normalised for ambient and duty cycle. Identify best-practice and underperforming units within the fleet.', metrics: [] },
];

/** Create the mandatory BE Agent page with seeded config */
function makeBeAgentPage(): KosmosPage {
  const beAgentWidget: KosmosWidget = {
    id: `w_beagent_${shortId()}`,
    type: 'beAgentTabConfig',
    config: {
      modules: DEFAULT_BE_AGENT_MODULES.map((m) => ({ id: `m_${shortId()}`, ...m })),
      platformStatus: [
        { id: `ps_${shortId()}`, label: 'EDGE NODE', value: 'ONLINE', tagType: 'green' },
        { id: `ps_${shortId()}`, label: 'CLOUD SYNC', value: 'LIVE', tagType: 'green' },
        { id: `ps_${shortId()}`, label: 'BE SENSE™', value: 'FUSED', tagType: 'green' },
        { id: `ps_${shortId()}`, label: 'CALORIESENSE™', value: 'LINKED', tagType: 'green' },
        { id: `ps_${shortId()}`, label: 'CMMS BRIDGE', value: 'STANDBY', tagType: 'amber' },
        { id: `ps_${shortId()}`, label: 'DATA OWNER', value: 'OPERATOR', tagType: 'blue' },
      ],
      fleetOverview: [
        { id: `fo_${shortId()}`, label: 'TOTAL UNITS', value: '12', color: 'var(--k-pale)' },
        { id: `fo_${shortId()}`, label: 'ONLINE', value: '10', color: 'var(--k-green)' },
        { id: `fo_${shortId()}`, label: 'ALERTS ACTIVE', value: '2', color: 'var(--k-amber)' },
        { id: `fo_${shortId()}`, label: 'OEMs MONITORED', value: 'GE / SE / MHI', color: 'var(--k-soft)' },
      ],
      recentActions: [
        { id: `ra_${shortId()}`, time: '14:58:02', msg: 'CD module: nominal state confirmed', level: 'ok' },
        { id: `ra_${shortId()}`, time: '14:52:30', msg: 'Fuel adaptation: CV shift +0.3%', level: 'info' },
        { id: `ra_${shortId()}`, time: '14:48:10', msg: 'VIB-X: maintenance flag raised', level: 'warn' },
      ],
      cannedResponses: [
        'All combustion dynamics parameters are nominal. CD anomaly score 0.14 — well below the 0.5 threshold. DFT spectrum shows stable DLE operation with dominant frequency at 186 Hz.',
        'Fuel quality data from CalorieSense™ edge device: CV = 38.2 MJ/m³, H₂ fraction 3.2%. BE Agent has adapted combustion model accordingly. No emissions exceedance risk.',
        'Thermodynamic performance module indicates compressor efficiency 87.4%, turbine efficiency 91.2%. No fouling signatures in the compressor map deviation analysis.',
        'Fleet benchmarking shows this unit is performing at 94th percentile for fuel efficiency vs comparable DLE units on the Kosmos network.',
        'Health index is 86/100. Primary concern is mildly elevated VIB-X channel (2.1 mm/s). Recommend bearing inspection at next planned outage. No immediate action required.',
      ],
    },
    layout: { x: 0, y: 0, w: 48, h: 80 },
  };

  return {
    id: `page_${shortId()}`,
    name: 'BE AGENT™',
    order: 2,
    widgets: [beAgentWidget],
    isMandatory: true,
    mandatoryType: 'beAgent',
    layoutVersion: 2,
    layoutSchemaVersion: CURRENT_LAYOUT_SCHEMA,
  };
}

/**
 * Read-time scale migration to match the new COL=48/ROW_H=10 grid.
 * Handles two legacy scales:
 *   Old 12-col (COL=12, ROW_H=80): all w ≤ 12 → x,w ×4; y,h ×8
 *   Intermediate (COL=48, ROW_H=20): some w > 12, max(h) > 24 → y,h ×2
 * Non-destructive — returns original page if already at current scale.
 * IMPORTANT: every return path stamps layoutVersion:2 so migration only ever runs once.
 */
function scaleUpPageIfNeeded(page: KosmosPage): KosmosPage {
  if (page.widgets.length === 0) return page;

  // Already at current scale — skip.
  if (page.layoutVersion && page.layoutVersion >= 2) return page;

  // Old 12-col scale: all widgets have w ≤ 12
  const isOld12Col = page.widgets.every((w) => w.layout.w <= 12);
  if (isOld12Col) {
    return {
      ...page,
      layoutVersion: 2,
      widgets: page.widgets.map((w) => ({
        ...w,
        layout: {
          x: w.layout.x * 4,
          y: w.layout.y * 4,
          w: w.layout.w * 4,
          h: w.layout.h * 8,
        },
      })),
    };
  }

  // 120-col tab-panel pages (overview / combustionDl) have widgets wider than 48 cols
  // (e.g. realTimeChart w=68, combustionDlHeader w=120). These are already at the correct
  // scale and must never be doubled. Stamp layoutVersion and return as-is.
  const isCol120Page = page.widgets.some((w) => w.layout.w > 48);
  if (isCol120Page) return { ...page, layoutVersion: 2 };

  // Intermediate 48-col/ROW_H=20 scale: some w > 12 and large h values present → double.
  const hasCol48 = page.widgets.some((w) => w.layout.w > 12);
  const hasLargeH = page.widgets.some((w) => w.layout.h > 24);
  if (hasCol48 && hasLargeH) {
    return {
      ...page,
      layoutVersion: 2,
      widgets: page.widgets.map((w) => ({
        ...w,
        layout: {
          x: w.layout.x,
          y: w.layout.y * 2,
          w: w.layout.w,
          h: w.layout.h * 2,
        },
      })),
    };
  }

  // No migration needed — stamp so we skip on every future load.
  return { ...page, layoutVersion: 2 };
}

/**
 * For mandatory pages, force re-seed if layoutSchemaVersion is missing or outdated.
 * This corrects any corrupted y values written to the DB by old compaction cascades.
 * Secondary guard: h > 55 or y > 100 overflow check retained as a safety net.
 */
function resetMandatoryPageIfCorrupted(page: KosmosPage): KosmosPage {
  if (!page.mandatoryType) return page;

  // Force re-seed if schema version is missing or outdated — but preserve user-edited configs
  if ((page.layoutSchemaVersion ?? 0) < CURRENT_LAYOUT_SCHEMA) {
    let freshPage: KosmosPage | null = null;
    if (page.mandatoryType === 'overview')             freshPage = makeOverviewPage();
    else if (page.mandatoryType === 'combustionDl')    freshPage = makeCombustionDlPage();
    else if (page.mandatoryType === 'kosmosArchitecture') freshPage = makeArchitecturePage();
    else if (page.mandatoryType === 'beAgent')         freshPage = makeBeAgentPage();

    if (freshPage) {
      // Build a lookup of existing user configs keyed by widget type
      const cfgByType: Record<string, Record<string, unknown>> = {};
      for (const w of page.widgets) cfgByType[w.type] = w.config;

      return {
        ...freshPage,
        id: page.id,
        order: page.order ?? 0,
        widgets: freshPage.widgets.map((w) => ({
          ...w,
          config: cfgByType[w.type] ?? w.config,
        })),
      };
    }
  }

  // Re-seed if empty (e.g. DB stored widgets: [] for mandatory page)
  if (page.widgets.length === 0) {
    if (page.mandatoryType === 'overview')             return { ...makeOverviewPage(),      id: page.id, order: page.order ?? 0 };
    if (page.mandatoryType === 'combustionDl')         return { ...makeCombustionDlPage(), id: page.id, order: page.order ?? 1 };
    if (page.mandatoryType === 'kosmosArchitecture') return { ...makeArchitecturePage(), id: page.id, order: page.order ?? 2 };
    if (page.mandatoryType === 'beAgent')            return { ...makeBeAgentPage(),       id: page.id, order: page.order ?? 3 };
  }

  // h/y overflow guard (safety net for corrupted layout values)
  // Tab-panel pages (combustionDl, beAgent, kosmosArchitecture) use h=80 by design — exempt
  if (
    page.mandatoryType === 'combustionDl' ||
    page.mandatoryType === 'kosmosArchitecture'
  ) {
    return page;
  }

  if (page.mandatoryType === 'beAgent') {
    const widget = page.widgets[0];
    if (widget?.config?.modules) {
      const existingNames = new Set((widget.config.modules as BeAgentModule[]).map((m) => m.name));
      const missing = DEFAULT_BE_AGENT_MODULES.filter((m) => !existingNames.has(m.name));
      if (missing.length > 0) {
        const merged = {
          ...widget,
          config: {
            ...widget.config,
            modules: [
              ...(widget.config.modules as BeAgentModule[]),
              ...missing.map((m) => ({ id: `m_${shortId()}`, ...m })),
            ],
          },
        };
        return { ...page, widgets: [merged] };
      }
    }
    return page;
  }

  const maxH = Math.max(...page.widgets.map((w) => w.layout.h));
  const maxY = Math.max(...page.widgets.map((w) => w.layout.y));
  if (maxH > 55 || maxY > 100) {
    // overview is the only remaining mandatoryType that reaches this point
  }

  return page;
}

/** Migrate old 3-column format to unified widgets[] (ADR-044) */
function migratePageFormat(page: any): KosmosPage {
  if (Array.isArray(page.widgets)) return page as KosmosPage;
  // Old format: page.columns.{left,middle,right}
  const left: KosmosWidget[] = (page.columns?.left ?? []).map((w: any) => ({
    ...w,
    layout: w.layout ?? { x: 0, y: 0, w: 12, h: 24 },
  }));
  const middle: KosmosWidget[] = (page.columns?.middle ?? []).map((w: any) => ({
    ...w,
    layout: w.layout ?? { x: 12, y: 0, w: 24, h: 24 },
  }));
  const right: KosmosWidget[] = (page.columns?.right ?? []).map((w: any) => ({
    ...w,
    layout: w.layout ?? { x: 36, y: 0, w: 12, h: 24 },
  }));
  return {
    id: page.id,
    name: page.name,
    order: page.order ?? 0,
    widgets: [...left, ...middle, ...right],
  };
}

/**
 * Load dashboard from localStorage
 */
function loadDashboardFromStorage(dashboardId: string): Partial<DashboardState> {
  if (typeof window === 'undefined') return {};

  try {
    const key = `${dashboardConfig.storageKey}_${dashboardId}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      const data = JSON.parse(saved);
      return {
        blocks: data.blocks || [],
        layouts: data.layouts || {},
        lastSaved: data.timestamp || null,
      };
    }
  } catch (error) {
    console.error('Failed to load dashboard from storage:', error);
  }

  return {};
}

/**
 * Save dashboard to localStorage
 */
function saveDashboardToStorage(state: DashboardState) {
  if (typeof window === 'undefined') return;

  try {
    const key = `${dashboardConfig.storageKey}_${state.dashboardId}`;
    const data = {
      blocks: state.blocks,
      layouts: state.layouts,
      timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save dashboard to storage:', error);
  }
}

/**
 * Async Thunk: Load dashboard from backend
 */
export const loadDashboardFromBackend = createAsyncThunk(
  'dashboard/loadFromBackend',
  async ({ dashboardId, applicationId }: { dashboardId: string; applicationId: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<any>(
        `/dashboards/${dashboardId}?applicationId=${applicationId}`
      );
      return response.data ?? null;
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      return rejectWithValue(error?.message || 'Failed to load dashboard from backend');
    }
  }
);

/**
 * Async Thunk: Save dashboard to backend
 */
export const saveDashboardToBackend = createAsyncThunk(
  'dashboard/saveToBackend',
  async (
    payload: {
      dashboardId: string;
      applicationId: string;
      name: string;
      description: string;
      blocks: DashboardBlock[];
      layouts: Layouts;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<any>('/dashboards', payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to save dashboard to backend');
    }
  }
);

/**
 * Async Thunk: Sync dashboard with backend (hybrid mode)
 * 1. Save to localStorage first (fast, offline-safe)
 * 2. Then sync to backend if online
 */
export const syncDashboardWithBackend = createAsyncThunk(
  'dashboard/syncWithBackend',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as { dashboard: DashboardState };
    const dashboard = state.dashboard;

    // Step 1: Save to localStorage first (always works, even offline)
    saveDashboardToStorage(dashboard);

    // Step 2: If online, sync to backend
    if (!dashboard.isOnline) {
      return { synced: false, reason: 'offline' };
    }

    try {
      const result = await dispatch(
        saveDashboardToBackend({
          dashboardId: dashboard.dashboardId,
          applicationId: dashboard.applicationId,
          name: dashboard.name,
          description: dashboard.description,
          blocks: dashboard.blocks,
          layouts: dashboard.layouts,
        })
      ).unwrap();

      return { synced: true, data: result };
    } catch (error: any) {
      // Even if backend fails, localStorage save succeeded
      return rejectWithValue({
        synced: false,
        reason: 'backend-error',
        error: error.message,
      });
    }
  }
);

/* ── Kosmos async thunks ── */

export const initKosmosFromBackend = createAsyncThunk(
  'dashboard/initKosmosFromBackend',
  async ({ dashboardId, applicationId }: { dashboardId: string; applicationId: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<any>(`/dashboards/${dashboardId}?applicationId=${applicationId}`);
      return res.data ?? null;
    } catch (err: any) {
      if (err?.status === 404) return null;
      return rejectWithValue(err?.message || 'Failed to load dashboard');
    }
  }
);

export const saveKosmosToBackend = createAsyncThunk(
  'dashboard/saveKosmosToBackend',
  async (
    { dashboardId, applicationId }: { dashboardId: string; applicationId: string },
    { getState, rejectWithValue }
  ) => {
    const state = getState() as { dashboard: DashboardState };
    const { kosmosPages, name, description, blocks, layouts } = state.dashboard;
    try {
      const res = await apiClient.post<any>('/dashboards', {
        dashboardId,
        applicationId,
        name,
        description,
        blocks,
        layouts,
        pages: kosmosPages,
      });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to save');
    }
  }
);

/**
 * Async Thunk: Fetch dashboards shared with current user (Viewer kiosk)
 */
export const fetchViewerDashboards = createAsyncThunk<
  Dashboard[],
  void,
  { rejectValue: string }
>(
  'dashboard/fetchViewerDashboards',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<Dashboard[]>('/dashboards/my');
      return res.data ?? [];
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch dashboards');
    }
  }
);

/**
 * Initial state
 */
const initialState: DashboardState = {
  dashboardId: 'default',
  applicationId: '',
  name: 'My Dashboard',
  description: '',
  blocks: [],
  layouts: {},
  isEditMode: false,
  selectedBlockId: null,
  isDirty: false,
  lastSaved: null,
  syncStatus: 'idle',
  syncError: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  // Kosmos
  kosmosPages: [],
  kosmosActivePage: null,
  kosmosSharedWithUsers: [],
  viewerDashboards: [],
};

/**
 * Dashboard slice
 */
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    /**
     * Initialize dashboard (synchronous - loads from localStorage immediately)
     * Use loadDashboardFromBackend async thunk for backend sync
     */
    initializeDashboard: (state, action: PayloadAction<string>) => {
      state.dashboardId = action.payload;
      const saved = loadDashboardFromStorage(action.payload);
      state.blocks = saved.blocks || [];
      state.layouts = saved.layouts || {};
      state.lastSaved = saved.lastSaved || null;
      state.isDirty = false;
      state.syncStatus = 'idle';
    },

    /**
     * Add block
     */
    addBlock: (state, action: PayloadAction<DashboardBlock>) => {
      if (state.blocks.length >= dashboardConfig.maxBlocks) {
        console.warn(`Maximum blocks (${dashboardConfig.maxBlocks}) reached`);
        return;
      }

      state.blocks.push(action.payload);
      state.isDirty = true;
    },

    /**
     * Remove block
     */
    removeBlock: (state, action: PayloadAction<string>) => {
      state.blocks = state.blocks.filter((block) => block.id !== action.payload);

      // Remove from layouts
      Object.keys(state.layouts).forEach((breakpoint) => {
        state.layouts[breakpoint] = state.layouts[breakpoint].filter(
          (layout) => layout.i !== action.payload
        );
      });

      // Clear selection if removed block was selected
      if (state.selectedBlockId === action.payload) {
        state.selectedBlockId = null;
      }

      state.isDirty = true;
    },

    /**
     * Update block config
     */
    updateBlockConfig: (
      state,
      action: PayloadAction<{ id: string; config: Partial<DashboardBlock['config']> }>
    ) => {
      const block = state.blocks.find((b) => b.id === action.payload.id);
      if (block) {
        block.config = { ...block.config, ...action.payload.config };
        state.isDirty = true;
      }
    },

    /**
     * Update layouts (react-grid-layout onChange)
     */
    updateLayouts: (state, action: PayloadAction<Layouts>) => {
      state.layouts = action.payload;

      // Update block layouts
      Object.keys(action.payload).forEach((breakpoint) => {
        action.payload[breakpoint].forEach((layout) => {
          const block = state.blocks.find((b) => b.id === layout.i);
          if (block && block.layouts[breakpoint as 'lg' | 'md' | 'sm']) {
            block.layouts[breakpoint as 'lg' | 'md' | 'sm'] = layout;
          }
        });
      });

      state.isDirty = true;
    },

    /**
     * Set edit mode
     */
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.isEditMode = action.payload;

      // Clear selection when exiting edit mode
      if (!action.payload) {
        state.selectedBlockId = null;
      }
    },

    /**
     * Toggle edit mode
     */
    toggleEditMode: (state) => {
      state.isEditMode = !state.isEditMode;

      if (!state.isEditMode) {
        state.selectedBlockId = null;
      }
    },

    /**
     * Select block
     */
    selectBlock: (state, action: PayloadAction<string | null>) => {
      state.selectedBlockId = action.payload;
    },

    /**
     * Save dashboard (synchronous - saves to localStorage only)
     * Use syncDashboardWithBackend async thunk for backend sync
     */
    saveDashboard: (state) => {
      saveDashboardToStorage(state);
      state.lastSaved = Date.now();
      state.isDirty = false;
    },

    /**
     * Set online status
     */
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    /**
     * Update dashboard metadata
     */
    updateDashboardMetadata: (
      state,
      action: PayloadAction<{ name?: string; description?: string; applicationId?: string }>
    ) => {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.description !== undefined) state.description = action.payload.description;
      if (action.payload.applicationId !== undefined) state.applicationId = action.payload.applicationId;
      state.isDirty = true;
    },

    /**
     * Reset dashboard (clear all blocks)
     */
    resetDashboard: (state) => {
      state.blocks = [];
      state.layouts = {};
      state.selectedBlockId = null;
      state.isDirty = true;
    },

    /**
     * Mark as dirty (unsaved changes)
     */
    markDirty: (state) => {
      state.isDirty = true;
    },

    /* ══ Kosmos Page actions ══ */

    addKosmosPage: (state, action: PayloadAction<{ name: string }>) => {
      const page = makeDefaultPage(action.payload.name, state.kosmosPages.length);
      page.layoutVersion = 2;
      state.kosmosPages.push(page);
      state.kosmosActivePage = page.id;
    },

    removeKosmosPage: (state, action: PayloadAction<string>) => {
      const idx = state.kosmosPages.findIndex((p) => p.id === action.payload);
      if (idx === -1) return;
      state.kosmosPages.splice(idx, 1);
      if (state.kosmosActivePage === action.payload) {
        state.kosmosActivePage = state.kosmosPages[Math.max(0, idx - 1)]?.id ?? null;
      }
    },

    renameKosmosPage: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const page = state.kosmosPages.find((p) => p.id === action.payload.id);
      if (page) page.name = action.payload.name;
    },

    setKosmosActivePage: (state, action: PayloadAction<string>) => {
      state.kosmosActivePage = action.payload;
    },

    reorderKosmosPages: (state, action: PayloadAction<string[]>) => {
      const ordered = action.payload
        .map((id, i) => {
          const p = state.kosmosPages.find((pg) => pg.id === id);
          if (p) p.order = i;
          return p;
        })
        .filter(Boolean) as KosmosPage[];
      state.kosmosPages = ordered;
    },

    /* ══ Kosmos Widget actions (ADR-044: unified canvas, no column param) ══ */

    addKosmosWidget: (
      state,
      action: PayloadAction<{ pageId: string; widget: KosmosWidget }>
    ) => {
      const { pageId, widget } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (page) page.widgets.push(widget);
    },

    removeKosmosWidget: (
      state,
      action: PayloadAction<{ pageId: string; widgetId: string }>
    ) => {
      const { pageId, widgetId } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (page) {
        page.widgets = page.widgets.filter((w) => w.id !== widgetId);
      }
    },

    updateKosmosWidgetLayout: (
      state,
      action: PayloadAction<{
        pageId: string;
        widgetId: string;
        layout: { x: number; y: number; w: number; h: number };
      }>
    ) => {
      const { pageId, widgetId, layout } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (!page) return;
      const widget = page.widgets.find((w) => w.id === widgetId);
      if (widget) widget.layout = layout;
    },

    updateKosmosWidgetConfig: (
      state,
      action: PayloadAction<{
        pageId: string;
        widgetId: string;
        config: Record<string, any>;
      }>
    ) => {
      const { pageId, widgetId, config } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (!page) return;
      const widget = page.widgets.find((w) => w.id === widgetId);
      if (widget) widget.config = { ...widget.config, ...config };
    },

    setKosmosSharedWithUsers: (state, action: PayloadAction<string[]>) => {
      state.kosmosSharedWithUsers = action.payload;
    },

    /** Load pages directly (skip API call) — used by Viewer kiosk (ADR-045) */
    setKosmosFromDashboard: (
      state,
      action: PayloadAction<{ pages: any[]; sharedWithUsers?: string[] }>
    ) => {
      const migrated = action.payload.pages
        .map(migratePageFormat)
        .map(scaleUpPageIfNeeded)
        .map(resetMandatoryPageIfCorrupted);
      state.kosmosPages = migrated;
      state.kosmosActivePage = migrated[0]?.id ?? null;
      if (action.payload.sharedWithUsers) {
        state.kosmosSharedWithUsers = action.payload.sharedWithUsers;
      }
    },
  },
  extraReducers: (builder) => {
    // Load dashboard from backend
    builder
      .addCase(loadDashboardFromBackend.pending, (state) => {
        state.syncStatus = 'loading';
        state.syncError = null;
      })
      .addCase(loadDashboardFromBackend.fulfilled, (state, action) => {
        if (action.payload) {
          // Backend data found, use it
          state.blocks = action.payload.blocks || [];
          state.layouts = action.payload.layouts || {};
          state.name = action.payload.name || 'My Dashboard';
          state.description = action.payload.description || '';
          state.applicationId = action.payload.applicationId || state.applicationId;
          state.lastSaved = action.payload.updatedAt ? new Date(action.payload.updatedAt).getTime() : null;

          // Also save to localStorage for offline access
          saveDashboardToStorage(state);
        } else {
          // Not found in backend, use localStorage (already loaded in initializeDashboard)
        }
        state.syncStatus = 'synced';
        state.isDirty = false;
      })
      .addCase(loadDashboardFromBackend.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.syncError = action.payload as string;
        // Keep localStorage data if backend fails
      });

    // Save dashboard to backend
    builder
      .addCase(saveDashboardToBackend.pending, (state) => {
        state.syncStatus = 'syncing';
        state.syncError = null;
      })
      .addCase(saveDashboardToBackend.fulfilled, (state, action) => {
        state.syncStatus = 'synced';
        state.lastSaved = action.payload.updatedAt ? new Date(action.payload.updatedAt).getTime() : Date.now();
        state.isDirty = false;
      })
      .addCase(saveDashboardToBackend.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.syncError = action.payload as string;
        // Dashboard is still saved in localStorage
      });

    // Sync dashboard with backend (hybrid mode)
    builder
      .addCase(syncDashboardWithBackend.pending, (state) => {
        state.syncStatus = 'syncing';
        state.syncError = null;
      })
      .addCase(syncDashboardWithBackend.fulfilled, (state, action) => {
        if (action.payload.synced) {
          state.syncStatus = 'synced';
          state.lastSaved = Date.now();
          state.isDirty = false;
        } else {
          state.syncStatus = 'idle';
          state.lastSaved = Date.now();
          state.isDirty = false;
        }
      })
      .addCase(syncDashboardWithBackend.rejected, (state, action: any) => {
        state.syncStatus = 'error';
        state.syncError = action.payload?.error || 'Sync failed';
        state.lastSaved = Date.now();
        state.isDirty = false;
      });

    // Kosmos: init from backend (ADR-044: migrate old columns format on load; ADR-045: use sharedWithUsers)
    builder
      .addCase(initKosmosFromBackend.fulfilled, (state, action) => {
        if (!action.payload) {
          // New dashboard: seed default pages (Overview + Combustion DL + BE Agent + Architecture)
          if (state.kosmosPages.length === 0) {
            const overviewPage = makeOverviewPage();
            const combustionDlPage = makeCombustionDlPage();
            const beAgentPage = makeBeAgentPage();
            const archPage = makeArchitecturePage();
            state.kosmosPages = [
              overviewPage,
              combustionDlPage,
              beAgentPage,
              archPage,
            ];
            state.kosmosActivePage = overviewPage.id;
          }
          return;
        }
        const data = action.payload;
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
          // Migrate old column-based pages to unified widgets[] format, then scale up if needed.
          // resetMandatoryPageIfCorrupted re-seeds overview/combustionDl if h or y values are
          // oversized from a previous migration loop bug.
          const migratedPages: KosmosPage[] = data.pages
            .map(migratePageFormat)
            .map(scaleUpPageIfNeeded)
            .map(resetMandatoryPageIfCorrupted);
          // Check if mandatory pages exist; if not, add them
          const hasOverviewPage = migratedPages.some(
            (p: KosmosPage) => p.mandatoryType === 'overview'
          );
          if (!hasOverviewPage) {
            migratedPages.push(makeOverviewPage());
          }
          const hasCombustionDlPage = migratedPages.some(
            (p: KosmosPage) => p.mandatoryType === 'combustionDl'
          );
          if (!hasCombustionDlPage) {
            migratedPages.push(makeCombustionDlPage());
          }
          const hasBeAgentPage = migratedPages.some(
            (p: KosmosPage) => p.mandatoryType === 'beAgent'
          );
          if (!hasBeAgentPage) {
            migratedPages.push(makeBeAgentPage());
          }
          const hasArchPage = migratedPages.some(
            (p: KosmosPage) => p.mandatoryType === 'kosmosArchitecture'
          );
          if (!hasArchPage) {
            migratedPages.push(makeArchitecturePage());
          }
          // Sort by order field to maintain tab order
          migratedPages.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          state.kosmosPages = migratedPages;
          state.kosmosActivePage = state.kosmosPages[0].id;
        } else if (state.kosmosPages.length === 0) {
          const overviewPage = makeOverviewPage();
          const combustionDlPage = makeCombustionDlPage();
          const beAgentPage = makeBeAgentPage();
          const archPage = makeArchitecturePage();
          state.kosmosPages = [
            overviewPage,
            combustionDlPage,
            beAgentPage,
            archPage,
          ];
          state.kosmosActivePage = overviewPage.id;
        }
        if (data.sharedWithUsers) state.kosmosSharedWithUsers = data.sharedWithUsers;
        state.name = data.name || state.name;
      });

    // Kosmos: save to backend
    builder
      .addCase(saveKosmosToBackend.pending, (state) => {
        state.syncStatus = 'syncing';
      })
      .addCase(saveKosmosToBackend.fulfilled, (state, action) => {
        if (action.payload?.sharedWithUsers) {
          state.kosmosSharedWithUsers = action.payload.sharedWithUsers;
        }
        state.lastSaved = Date.now();
        state.syncStatus = 'synced';
      })
      .addCase(saveKosmosToBackend.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.syncError = (action.payload as string) || 'Save failed';
      });

    // Fetch viewer dashboards
    builder
      .addCase(fetchViewerDashboards.fulfilled, (state, action) => {
        state.viewerDashboards = action.payload;
      });
  },
});

/**
 * Export actions
 */
export const {
  initializeDashboard,
  addBlock,
  removeBlock,
  updateBlockConfig,
  updateLayouts,
  setEditMode,
  toggleEditMode,
  selectBlock,
  saveDashboard,
  resetDashboard,
  markDirty,
  setOnlineStatus,
  updateDashboardMetadata,
  // Kosmos actions
  addKosmosPage,
  removeKosmosPage,
  renameKosmosPage,
  setKosmosActivePage,
  reorderKosmosPages,
  addKosmosWidget,
  removeKosmosWidget,
  updateKosmosWidgetLayout,
  updateKosmosWidgetConfig,
  setKosmosSharedWithUsers,
  setKosmosFromDashboard,
} = dashboardSlice.actions;

/**
 * Export reducer
 */
export default dashboardSlice.reducer;

/**
 * Selectors
 */
export const selectDashboard = (state: { dashboard: DashboardState }) =>
  state.dashboard;
export const selectBlocks = (state: { dashboard: DashboardState }) =>
  state.dashboard.blocks;
export const selectLayouts = (state: { dashboard: DashboardState }) =>
  state.dashboard.layouts;
export const selectEditMode = (state: { dashboard: DashboardState }) =>
  state.dashboard.isEditMode;
export const selectSelectedBlockId = (state: { dashboard: DashboardState }) =>
  state.dashboard.selectedBlockId;
export const selectSelectedBlock = (state: { dashboard: DashboardState }) =>
  state.dashboard.blocks.find((b) => b.id === state.dashboard.selectedBlockId);
export const selectIsDirty = (state: { dashboard: DashboardState }) =>
  state.dashboard.isDirty;
export const selectLastSaved = (state: { dashboard: DashboardState }) =>
  state.dashboard.lastSaved;
export const selectSyncStatus = (state: { dashboard: DashboardState }) =>
  state.dashboard.syncStatus;
export const selectSyncError = (state: { dashboard: DashboardState }) =>
  state.dashboard.syncError;
export const selectIsOnline = (state: { dashboard: DashboardState }) =>
  state.dashboard.isOnline;
export const selectDashboardMetadata = (state: { dashboard: DashboardState }) => ({
  name: state.dashboard.name,
  description: state.dashboard.description,
  applicationId: state.dashboard.applicationId,
});

// Kosmos selectors
export const selectKosmosPages = (state: { dashboard: DashboardState }) =>
  state.dashboard.kosmosPages;
export const selectKosmosActivePage = (state: { dashboard: DashboardState }) =>
  state.dashboard.kosmosActivePage;
export const selectKosmosSharedWithUsers = (state: { dashboard: DashboardState }) =>
  state.dashboard.kosmosSharedWithUsers;
export const selectViewerDashboards = (state: { dashboard: DashboardState }) =>
  state.dashboard.viewerDashboards;
