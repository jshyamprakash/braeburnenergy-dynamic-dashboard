/**
 * Combustion CSV Utilities
 *
 * Loads, caches, and processes real combustion lab CSV data for the
 * action:combustionCsvPlayer workflow node (module: combustion_dl).
 *
 * CSV format (ScanN_converted.csv):
 *   Row 1: waveform headers (column names)
 *   Row 2: t0 timestamps
 *   Row 3: delta_t values (0.0001s = 10 kHz)
 *   Row 4: blank
 *   Row 5: "time" header row (column names repeated)
 *   Rows 6+: actual data — time, PD_REF, PD_PLENUM_1_1, ..., TC_XTALK_1_1
 *
 * Key channels:
 *   PD_CC_1_1 (combustion chamber dynamic pressure, col 5) — p'_CC in paper
 *   PMT_1_1   (heat release rate / OH* chemiluminescence, col 7) — q' in paper
 *
 * Feature extraction follows GT2026-179161 (Karthik et al.):
 *   300 ms window, 100 ms stride — RMS, STD, Kurtosis per signal (6 features)
 */

import * as fs from 'fs';
import * as path from 'path';
import { demo } from '../config/config';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScanNumber = 2 | 3 | 4 | 5;

export interface FeatureCell {
  label: string;
  value: number;
  hue: number;
  alpha: number;
}

export interface CsvPayload {
  cd_pressure: number;
  fft_freqs: number[];
  fft_amps: number[];
  anomaly_score: number;
  confidence: number;
  precursor_class: string;
  normal_prob: number;
  lean_blowout_prob: number;
  flashback_prob: number;
  thermo_acoustic_prob: number;
  spl: number;
  hurst_exponent: number;
  shannon_entropy: number;
  dft_energy: number;
  feature_cells: FeatureCell[];
  // GT2026-179161 §2.2 — 3 statistical features × 2 signals = 6 paper-aligned features
  p_cc_rms: number;       // RMS of p'_CC window
  p_cc_std: number;       // STD of p'_CC window
  p_cc_kurtosis: number;  // kurtosis of p'_CC (>3 = intermittent bursts)
  pmt_rms: number;        // RMS of q' (PMT/heat release) window
  pmt_std: number;        // STD of q' window
  pmt_kurtosis: number;   // kurtosis of q' window
  _scan: number;
  _cursor: number;
  _ts: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAMPLE_RATE = 10000; // 10 kHz

// DFT target frequencies (Hz) — match combustion-simulator.ts & dashboard display
const DFT_BINS = [50, 80, 120, 186, 240, 280, 320, 370, 420, 480, 500];

const FEATURE_LABELS = [
  'DFT-50Hz', 'DFT-80Hz', 'DFT-120Hz', 'DFT-186Hz', 'DFT-240Hz',
  'SPL-RMS',  'SPL-Peak', 'SPL-Var',   'SPL-dB',    'SPL-idx',
  'Hurst-H',  'Hurst-R/S','Hurst-var', 'Hurst-lag', 'Hurst-fit',
  'Entropy-S','Entropy-R','Entropy-P', 'Entropy-K', 'Entropy-J',
  'MI-P/T',   'MI-T/N',   'MI-N/P',   'MI-cross',  'MI-auto',
];

// Column indices in data rows (0=time, 1=PD_REF, 2=PD_PLENUM_1_1, 3=_1_2, 4=_1_3,
// 5=PD_CC_1_1, 6=PD_FUEL_1_1, 7=PMT_1_1)
const PD_CC_COL = 5; // p'_CC — combustion chamber dynamic pressure
const PMT_COL   = 7; // q'   — heat release rate (OH* chemiluminescence)


// ─── CSV cache (module-level singleton) ──────────────────────────────────────

interface DualChannel { pcc: number[]; pmt: number[] }

/** Cached parsed CSV rows — both PD_CC_1_1 (p'_CC) and PMT_1_1 (q') columns */
const csvCache = new Map<ScanNumber, DualChannel>();

/**
 * Load and cache both signal channels for a given scan number.
 * Returns { pcc: number[], pmt: number[] } — one float per data row each.
 * First call parses the file; subsequent calls return cached arrays.
 */
export function loadAndCacheCSV(scanNumber: ScanNumber): DualChannel {
  if (csvCache.has(scanNumber)) return csvCache.get(scanNumber)!;

  const csvPath = path.join(demo.csvDir, `Scan${scanNumber}_converted.csv`);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Combustion CSV not found: ${csvPath}. Set DEMO_DATA_DIR env var.`);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');

  // Find the data start — first line after the "time" header row (row index 4 = line 5)
  // Format: line 0=waveform, 1=t0, 2=delta_t, 3=blank, 4="time" header, 5+=data
  const pcc: number[] = [];
  const pmt: number[] = [];
  let dataStarted = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    const firstCell = line.split(',')[0]?.trim();
    if (firstCell === 'time') { dataStarted = true; continue; }
    if (!dataStarted) continue;

    const cells = line.split(',');
    const pccVal = parseFloat(cells[PD_CC_COL] ?? '');
    const pmtVal = parseFloat(cells[PMT_COL] ?? '');
    if (!isNaN(pccVal) && !isNaN(pmtVal)) {
      pcc.push(pccVal);
      pmt.push(pmtVal);
    }
  }

  const channels: DualChannel = { pcc, pmt };
  csvCache.set(scanNumber, channels);
  return channels;
}

// ─── Physics computation ──────────────────────────────────────────────────────

/**
 * Discrete Fourier Transform at specific target frequencies.
 * No external dependency — computes DFT sum for each target bin directly.
 * O(N * B) where N = window size, B = number of bins (11).
 */
export function computeDFT(signal: number[], sampleRate = SAMPLE_RATE): { freqs: number[]; amps: number[] } {
  const N = signal.length;
  const amps = DFT_BINS.map((freq) => {
    let re = 0;
    let im = 0;
    const omega = (2 * Math.PI * freq) / sampleRate;
    for (let n = 0; n < N; n++) {
      re += signal[n] * Math.cos(omega * n);
      im -= signal[n] * Math.sin(omega * n);
    }
    return Math.sqrt(re * re + im * im) / N;
  });
  return { freqs: DFT_BINS, amps };
}

/** RMS of signal */
function rms(signal: number[]): number {
  const sumSq = signal.reduce((acc, v) => acc + v * v, 0);
  return Math.sqrt(sumSq / signal.length);
}

/** Standard deviation of signal (population, not sample) */
function computeStd(signal: number[]): number {
  const mu = signal.reduce((a, v) => a + v, 0) / signal.length;
  const variance = signal.reduce((a, v) => a + (v - mu) ** 2, 0) / signal.length;
  return Math.sqrt(variance);
}

/**
 * Kurtosis (4th standardised moment) — measures tailedness / intermittency.
 * Gaussian baseline = 3. Values >3 indicate impulsive/burst behaviour (TAI precursor).
 */
function computeKurtosis(signal: number[]): number {
  const mu = signal.reduce((a, v) => a + v, 0) / signal.length;
  const sigma = computeStd(signal);
  if (sigma === 0) return 0;
  return signal.reduce((a, v) => a + ((v - mu) / sigma) ** 4, 0) / signal.length;
}

/**
 * Zero-mean / unit-variance normalisation per segment.
 * Applied before DFT, Hurst, Entropy so those features are amplitude-agnostic
 * and comparable across operating conditions (paper §2.2 preprocessing).
 * NOT applied before p_cc_rms / p_cc_std — those are intentional amplitude descriptors.
 */
function normalise(signal: number[]): number[] {
  const mu = signal.reduce((a, v) => a + v, 0) / signal.length;
  const sigma = computeStd(signal);
  if (sigma === 0) return signal.map(() => 0);
  return signal.map((v) => (v - mu) / sigma);
}

// ─── Kurtosis-driven state classification ────────────────────────────────────
// Thresholds based on paper characterisation (Fig 2):
//   Stable      : near-Gaussian pressure noise,  kurtosis ≈ 3
//   Intermittent: alternating bursts + quiet,     kurtosis > INTERMITTENT_K (elevated tails)
//   LCO         : sustained large oscillations,   kurtosis ≈ 3 again but high RMS
// RMS_LCO_THRESHOLD is expressed in the original signal units (kPa);
// may need calibration if sensor range differs from demo CSV (~±0.14 kPa peak).
const INTERMITTENT_K  = 3.5;   // kurtosis above Gaussian baseline
const LCO_RMS_MIN     = 0.025; // kPa — sustained oscillation amplitude

type DynamicalState = 'STABLE' | 'INTERMITTENT' | 'LIMIT CYCLE OSCILLATION';

function classifyDynamicalState(kurtosis: number, signalRms: number): DynamicalState {
  if (kurtosis > INTERMITTENT_K) return 'INTERMITTENT';
  if (signalRms >= LCO_RMS_MIN)  return 'LIMIT CYCLE OSCILLATION';
  return 'STABLE';
}

/** Probability distribution over the 3 paper states, derived from classified state. */
function deriveClassProbabilities(state: DynamicalState): {
  normal_prob: number;
  lean_blowout_prob: number;
  flashback_prob: number;
  thermo_acoustic_prob: number;
} {
  // normal_prob       → P(Stable)
  // lean_blowout_prob → P(Intermittent)  [field retained for dashboard compat]
  // thermo_acoustic_prob → P(LCO)
  // flashback_prob    → residual (not a paper class; kept for field compat)
  const noise = () => Math.random() * 0.04;
  if (state === 'STABLE') {
    const s = 0.88 + noise();
    const i = noise();
    const l = noise();
    const f = noise();
    const t = s + i + l + f;
    return { normal_prob: s / t, lean_blowout_prob: i / t, flashback_prob: f / t, thermo_acoustic_prob: l / t };
  }
  if (state === 'INTERMITTENT') {
    const s = noise();
    const i = 0.72 + noise();
    const l = noise();
    const f = noise();
    const t = s + i + l + f;
    return { normal_prob: s / t, lean_blowout_prob: i / t, flashback_prob: f / t, thermo_acoustic_prob: l / t };
  }
  // LCO
  const s = noise();
  const i = noise();
  const l = 0.80 + noise();
  const f = noise();
  const t = s + i + l + f;
  return { normal_prob: s / t, lean_blowout_prob: i / t, flashback_prob: f / t, thermo_acoustic_prob: l / t };
}

/** SPL in dB — 20*log10(rms / 2e-5) reference pressure */
export function computeSPL(signal: number[]): number {
  const r = rms(signal);
  if (r <= 0) return 0;
  return parseFloat((20 * Math.log10(r / 2e-5)).toFixed(2));
}

/**
 * Hurst exponent via simplified R/S analysis.
 * Uses 3 lag scales: N/4, N/2, N (full window).
 */
export function computeHurst(signal: number[]): number {
  const N = signal.length;
  const scales = [Math.floor(N / 4), Math.floor(N / 2), N];
  const logRS: number[] = [];
  const logN: number[] = [];

  for (const n of scales) {
    const seg = signal.slice(0, n);
    const mean = seg.reduce((a, b) => a + b, 0) / n;
    const cumDev = seg.map((_, i) => seg.slice(0, i + 1).reduce((a, b) => a + (b - mean), 0));
    const R = Math.max(...cumDev) - Math.min(...cumDev);
    const S = Math.sqrt(seg.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
    if (S > 0 && R > 0) {
      logRS.push(Math.log(R / S));
      logN.push(Math.log(n));
    }
  }

  if (logRS.length < 2) return 0.5;

  // Linear regression slope = Hurst exponent
  const n = logRS.length;
  const meanX = logN.reduce((a, b) => a + b, 0) / n;
  const meanY = logRS.reduce((a, b) => a + b, 0) / n;
  const num = logN.reduce((a, x, i) => a + (x - meanX) * (logRS[i] - meanY), 0);
  const den = logN.reduce((a, x) => a + (x - meanX) ** 2, 0);

  return parseFloat(Math.min(Math.max(num / den, 0.1), 0.99).toFixed(4));
}

/**
 * Shannon entropy of signal histogram (20 bins).
 */
export function computeEntropy(signal: number[]): number {
  const min = Math.min(...signal);
  const max = Math.max(...signal);
  const range = max - min || 1e-10;
  const BINS = 20;
  const hist = new Array<number>(BINS).fill(0);

  for (const v of signal) {
    const bin = Math.min(Math.floor(((v - min) / range) * BINS), BINS - 1);
    hist[bin]++;
  }

  const total = signal.length;
  let entropy = 0;
  for (const count of hist) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return parseFloat(entropy.toFixed(4));
}

/**
 * Build 5×5 feature matrix matching FEATURE_LABELS order.
 * Row 0: DFT amplitudes at 5 frequencies
 * Row 1: SPL-derived scalars
 * Row 2: Hurst-derived scalars
 * Row 3: Entropy-derived scalars
 * Row 4: Mutual information proxies (cross-correlation based)
 */
export function buildFeatureCells(signal: number[], dftAmps: number[], spl: number, hurst: number, entropy: number): FeatureCell[] {
  const r = rms(signal);
  const peak = Math.max(...signal.map(Math.abs));
  const variance = signal.reduce((a, v) => a + (v - r) ** 2, 0) / signal.length;

  // 5 DFT bins (indices 0-4: 50,80,120,186,240 Hz)
  const row0 = dftAmps.slice(0, 5);
  // SPL row
  const row1 = [r, peak, variance, spl / 120, dftAmps.slice(0, 5).indexOf(Math.max(...dftAmps.slice(0, 5))) / 4];
  // Hurst row
  const row2 = [hurst, hurst * 1.05, variance / (r + 1e-9), Math.log(signal.length) / 10, hurst * 0.95];
  // Entropy row
  const row3 = [entropy / 5, entropy * 0.9 / 5, entropy * 1.1 / 5, Math.log2(signal.length) / 15, entropy / 4];
  // Mutual info proxies (simplified: lagged auto-correlation)
  const lag1 = signal.slice(1).reduce((a, v, i) => a + v * signal[i], 0) / signal.length;
  const row4 = [lag1 / (r * r + 1e-9), lag1 * 0.9, lag1 * 0.8, lag1 * 0.7, lag1 * 0.6];

  const allRows = [...row0, ...row1, ...row2, ...row3, ...row4];

  const absMax = Math.max(...allRows.map(Math.abs), 1e-9);

  return FEATURE_LABELS.map((label, i) => {
    const value = allRows[i] ?? 0;
    const normalized = value / absMax; // -1 to 1
    // hue: green (120) for high positive, red (0) for high negative, gray for near-zero
    const hue = normalized >= 0 ? 120 : 0;
    const alpha = Math.abs(normalized);
    return {
      label,
      value: parseFloat(value.toFixed(4)),
      hue,
      alpha: parseFloat(Math.min(alpha, 1).toFixed(3)),
    };
  });
}

/**
 * Build the full MQTT-compatible payload from dual signal windows and scan number.
 * Matches the field shape published by combustion-mqtt-sim.ts.
 *
 * pccWindow — PD_CC_1_1 (p'_CC) samples for this tick (raw, kPa)
 * pmtWindow — PMT_1_1 (q') samples for this tick (raw)
 */
export function buildCsvPayload(pccWindow: number[], pmtWindow: number[], scanNumber: ScanNumber, cursor: number): CsvPayload {
  // ── Step 1: Raw amplitude statistics (on un-normalised signal) ──────────────
  // RMS and STD must use raw signal — they ARE the amplitude descriptors.
  // Kurtosis is scale/mean invariant, but computed here for consistency.
  const p_cc_rms      = parseFloat(rms(pccWindow).toFixed(6));
  const p_cc_std      = parseFloat(computeStd(pccWindow).toFixed(6));
  const p_cc_kurtosis = parseFloat(computeKurtosis(pccWindow).toFixed(4));
  const pmt_rms       = parseFloat(rms(pmtWindow).toFixed(6));
  const pmt_std       = parseFloat(computeStd(pmtWindow).toFixed(6));
  const pmt_kurtosis  = parseFloat(computeKurtosis(pmtWindow).toFixed(4));

  // ── Step 2: Normalise windows for amplitude-agnostic feature analysis ───────
  // Zero-mean / unit-variance per segment (paper §2.2 preprocessing).
  // Used for DFT, Hurst, Entropy, feature_cells — NOT for RMS/STD/SPL.
  const pccNorm = normalise(pccWindow);

  // ── Step 3: Physics features on normalised p'_CC window ─────────────────────
  const { freqs, amps } = computeDFT(pccNorm);
  const spl     = computeSPL(pccWindow);   // SPL uses raw signal (absolute dB measure)
  const hurst   = computeHurst(pccNorm);
  const entropy = computeEntropy(pccNorm);
  const cells   = buildFeatureCells(pccNorm, amps, spl, hurst, entropy);
  const dftEnergy = parseFloat(amps.reduce((a, v) => a + v * v, 0).toFixed(6));

  // ── Step 4: Kurtosis-driven dynamical state classification ───────────────────
  // Derives precursor_class from live p_cc_kurtosis + p_cc_rms — not scan metadata.
  const dynamicalState = classifyDynamicalState(p_cc_kurtosis, p_cc_rms);
  const precursor_class = dynamicalState;
  const probs = deriveClassProbabilities(dynamicalState);

  // ── Step 5: Anomaly score from kurtosis excess + RMS ─────────────────────────
  // kurtosisExcess: how far above Gaussian baseline (3); clamped 0→1 over range 3–8
  // rmsNorm: RMS relative to max expected LCO amplitude (~0.1 kPa)
  const kurtosisExcess = Math.min(Math.max(p_cc_kurtosis - 3.0, 0) / 5.0, 1.0);
  const rmsNorm        = Math.min(p_cc_rms / 0.1, 1.0);
  const anomaly        = parseFloat((kurtosisExcess * 0.5 + rmsNorm * 0.5).toFixed(4));

  return {
    cd_pressure: parseFloat(pccWindow[pccWindow.length - 1].toFixed(6)),
    fft_freqs: freqs,
    fft_amps: amps.map((v) => parseFloat(v.toFixed(6))),
    anomaly_score: anomaly,
    confidence: parseFloat(Math.min(75 + (1 - anomaly) * 20, 99).toFixed(1)),
    precursor_class,
    normal_prob:          parseFloat(probs.normal_prob.toFixed(4)),
    lean_blowout_prob:    parseFloat(probs.lean_blowout_prob.toFixed(4)),
    flashback_prob:       parseFloat(probs.flashback_prob.toFixed(4)),
    thermo_acoustic_prob: parseFloat(probs.thermo_acoustic_prob.toFixed(4)),
    spl,
    hurst_exponent: hurst,
    shannon_entropy: entropy,
    dft_energy: dftEnergy,
    feature_cells: cells,
    p_cc_rms,
    p_cc_std,
    p_cc_kurtosis,
    pmt_rms,
    pmt_std,
    pmt_kurtosis,
    _scan: scanNumber,
    _cursor: cursor,
    _ts: new Date().toISOString(),
  };
}

// ─── Generic CSV Parser ───────────────────────────────────────────────────────

export interface GenericCsvData {
  columns: string[];             // Auto-detected numeric column names
  data: Map<string, number[]>;   // column name → all sample values
  rowCount: number;
}

const genericCsvCache = new Map<string, GenericCsvData>();

/**
 * Parse any CSV file, auto-detecting numeric columns from the header row.
 * Results are cached in memory by absolute file path.
 */
export function parseGenericCsv(filePath: string): GenericCsvData {
  if (genericCsvCache.has(filePath)) return genericCsvCache.get(filePath)!;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);

  // Find header row: the LAST line where the first cell is non-numeric text.
  // Some CSVs have multiple metadata rows before the real column-name header
  // (e.g. waveform info rows followed by a "time, col1, col2..." header).
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const firstCell = lines[i].split(',')[0]?.trim() ?? '';
    if (isNaN(parseFloat(firstCell)) || firstCell === '') headerIdx = i;
    else break; // first fully-numeric first-cell row ends the header search
  }
  // If all rows are text-first, still pick the last one; if none found, fail.
  if (headerIdx === -1) throw new Error(`No header row found in CSV: ${filePath}`);

  const headers = lines[headerIdx].split(',').map((h) => h.trim());
  const dataLines = lines.slice(headerIdx + 1);

  // Detect numeric columns by checking first 10 data rows
  const probe = dataLines.slice(0, 10);
  const numericCols = headers.filter((_, ci) =>
    probe.length > 0 &&
    probe.every((l) => {
      const cell = l.split(',')[ci]?.trim() ?? '';
      return cell !== '' && !isNaN(parseFloat(cell));
    })
  );

  if (numericCols.length === 0) throw new Error(`No numeric columns detected in CSV: ${filePath}`);

  const colIndices = numericCols.map((col) => headers.indexOf(col));
  const data = new Map<string, number[]>();
  numericCols.forEach((col) => data.set(col, []));

  for (const line of dataLines) {
    const cells = line.split(',');
    let rowValid = true;
    const parsed = colIndices.map((ci) => {
      const v = parseFloat(cells[ci]?.trim() ?? '');
      if (isNaN(v)) rowValid = false;
      return v;
    });
    if (rowValid) {
      numericCols.forEach((col, i) => data.get(col)!.push(parsed[i]));
    }
  }

  const rowCount = data.get(numericCols[0])?.length ?? 0;
  const result: GenericCsvData = { columns: numericCols, data, rowCount };
  genericCsvCache.set(filePath, result);
  return result;
}

export function clearGenericCsvCache(filePath?: string): void {
  if (filePath) genericCsvCache.delete(filePath);
  else genericCsvCache.clear();
}
