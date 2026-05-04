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
 * Key channels: PD_CC_1_1 (combustion chamber dynamic pressure, col index 5)
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

// Column index for PD_CC_1_1 in the data rows (0=time, 1=PD_REF, 2=PD_PLENUM_1_1,
// 3=PD_PLENUM_1_2, 4=PD_PLENUM_1_3, 5=PD_CC_1_1)
const PD_CC_COL = 5;

// Scan metadata — fuel composition, dynamic state, classifier mapping
const SCAN_META: Record<ScanNumber, {
  fuel: string;
  state: string;
  precursor_class: string;
  normal_prob: () => number;
  lean_blowout_prob: () => number;
  flashback_prob: () => number;
  thermo_acoustic_prob: () => number;
  anomaly_base: number;
}> = {
  5: {
    fuel: '100% CH₄',
    state: 'Stable',
    precursor_class: 'NORMAL OPERATION',
    normal_prob: () => 0.82 + Math.random() * 0.10,
    lean_blowout_prob: () => Math.random() * 0.06,
    flashback_prob: () => Math.random() * 0.06,
    thermo_acoustic_prob: () => Math.random() * 0.06,
    anomaly_base: 0.05,
  },
  2: {
    fuel: '90% CH₄ / 10% H₂',
    state: 'Transient dynamics',
    precursor_class: 'LEAN BLOWOUT PRECURSOR',
    normal_prob: () => Math.random() * 0.18,
    lean_blowout_prob: () => 0.60 + Math.random() * 0.22,
    flashback_prob: () => Math.random() * 0.10,
    thermo_acoustic_prob: () => Math.random() * 0.10,
    anomaly_base: 0.35,
  },
  3: {
    fuel: '80% CH₄ / 20% H₂',
    state: 'Transient dynamics',
    precursor_class: 'LEAN BLOWOUT PRECURSOR',
    normal_prob: () => Math.random() * 0.12,
    lean_blowout_prob: () => 0.68 + Math.random() * 0.20,
    flashback_prob: () => Math.random() * 0.12,
    thermo_acoustic_prob: () => Math.random() * 0.08,
    anomaly_base: 0.45,
  },
  4: {
    fuel: '70% CH₄ / 30% H₂',
    state: 'Limit cycle oscillations',
    precursor_class: 'THERMO-ACOUSTIC INSTABILITY',
    normal_prob: () => Math.random() * 0.08,
    lean_blowout_prob: () => Math.random() * 0.12,
    flashback_prob: () => Math.random() * 0.10,
    thermo_acoustic_prob: () => 0.65 + Math.random() * 0.22,
    anomaly_base: 0.68,
  },
};

// ─── CSV cache (module-level singleton) ──────────────────────────────────────

/** Cached parsed CSV rows — only the PD_CC_1_1 column (float array per row) */
const csvCache = new Map<ScanNumber, number[]>();

/**
 * Load and cache the CSV for a given scan number.
 * Returns array of PD_CC_1_1 values (one float per data row).
 * First call parses the file; subsequent calls return cached array.
 */
export function loadAndCacheCSV(scanNumber: ScanNumber): number[] {
  if (csvCache.has(scanNumber)) return csvCache.get(scanNumber)!;

  const csvPath = path.join(demo.csvDir, `Scan${scanNumber}_converted.csv`);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Combustion CSV not found: ${csvPath}. Set DEMO_DATA_DIR env var.`);
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n');

  // Find the data start — first line after the "time" header row (row index 4 = line 5)
  // Format: line 0=waveform, 1=t0, 2=delta_t, 3=blank, 4="time" header, 5+=data
  const dataLines: number[] = [];
  let dataStarted = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    const firstCell = line.split(',')[0]?.trim();
    if (firstCell === 'time') { dataStarted = true; continue; }
    if (!dataStarted) continue;

    const cells = line.split(',');
    // PD_CC_1_1 is column index 5 (0=time, 1=PD_REF, 2=PD_PLENUM_1_1, 3=_1_2, 4=_1_3, 5=PD_CC_1_1)
    const val = parseFloat(cells[PD_CC_COL] ?? '');
    if (!isNaN(val)) dataLines.push(val);
  }

  csvCache.set(scanNumber, dataLines);
  return dataLines;
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
 * Build the full MQTT-compatible payload from a signal window and scan number.
 * Matches the field shape published by combustion-mqtt-sim.ts.
 */
export function buildCsvPayload(window: number[], scanNumber: ScanNumber, cursor: number): CsvPayload {
  const meta = SCAN_META[scanNumber];
  const { freqs, amps } = computeDFT(window);
  const spl = computeSPL(window);
  const hurst = computeHurst(window);
  const entropy = computeEntropy(window);
  const cells = buildFeatureCells(window, amps, spl, hurst, entropy);

  // Anomaly score: blend signal RMS with scan-specific base
  const r = rms(window);
  // PD_CC_1_1 values are in kPa (range ~±0.14). Normalize to 0-1 using max observed.
  const rmsNormalized = Math.min(r / 0.1, 1.0);
  const anomaly = parseFloat(Math.min(meta.anomaly_base + rmsNormalized * 0.3, 1.0).toFixed(4));

  // Classifier probabilities
  const np = meta.normal_prob();
  const lbp = meta.lean_blowout_prob();
  const fp = meta.flashback_prob();
  const tap = meta.thermo_acoustic_prob();
  const total = np + lbp + fp + tap;

  const dftEnergy = parseFloat(amps.reduce((a, v) => a + v * v, 0).toFixed(6));

  return {
    cd_pressure: parseFloat((101.3 + window[window.length - 1] * 10).toFixed(4)), // map ±0.14kPa → kPa absolute
    fft_freqs: freqs,
    fft_amps: amps.map((v) => parseFloat(v.toFixed(6))),
    anomaly_score: anomaly,
    confidence: parseFloat(Math.min(75 + (1 - anomaly) * 20, 99).toFixed(1)),
    precursor_class: meta.precursor_class,
    normal_prob: parseFloat((np / total).toFixed(4)),
    lean_blowout_prob: parseFloat((lbp / total).toFixed(4)),
    flashback_prob: parseFloat((fp / total).toFixed(4)),
    thermo_acoustic_prob: parseFloat((tap / total).toFixed(4)),
    spl,
    hurst_exponent: hurst,
    shannon_entropy: entropy,
    dft_energy: dftEnergy,
    feature_cells: cells,
    _scan: scanNumber,
    _cursor: cursor,
    _ts: new Date().toISOString(),
  };
}
