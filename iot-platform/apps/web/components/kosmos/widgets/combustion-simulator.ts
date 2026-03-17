'use client';

import { useSyncExternalStore } from 'react';

const FFT_FREQS = [50, 80, 120, 186, 240, 280, 320, 370, 420, 480, 500];
const FEATURE_LABELS = [
  'DFT-50Hz',
  'DFT-80Hz',
  'DFT-120Hz',
  'DFT-186Hz',
  'DFT-240Hz',
  'SPL-RMS',
  'SPL-Peak',
  'SPL-Var',
  'SPL-dB',
  'SPL-idx',
  'Hurst-H',
  'Hurst-R/S',
  'Hurst-var',
  'Hurst-lag',
  'Hurst-fit',
  'Entropy-S',
  'Entropy-R',
  'Entropy-P',
  'Entropy-K',
  'Entropy-J',
  'MI-P/T',
  'MI-T/N',
  'MI-N/P',
  'MI-cross',
  'MI-auto',
];

type FeatureCell = {
  label: string;
  value: number;
  hue: number;
  alpha: number;
};

type CombustionSimulatorSnapshot = {
  tick: number;
  cdBuf: number[];
  cdBuf2: number[];
  anomBuf: number[];
  fftFreqs: number[];
  fftAmps: number[];
  featureCells: FeatureCell[];
  anomalyDisplay: string;
  reconErrorDisplay: string;
};

const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function genCDPoint(prev: number, tick: number) {
  const base = 0.6 * Math.sin((2 * Math.PI * 186 * tick) / 50000);
  const noise = (Math.random() - 0.5) * 0.4;
  return 0.7 * prev + 0.3 * (base + noise);
}

function genFFT() {
  const amps = [0.3, 0.2, 0.4, 1.0, 0.3, 0.15, 0.25, 0.18, 0.12, 0.08, 0.06];
  return amps.map((amp) => amp + (Math.random() - 0.5) * 0.05);
}

function buildFeatureCells(): FeatureCell[] {
  return FEATURE_LABELS.map((label) => {
    const value = Math.random();
    const hue = value < 0.3 ? 210 : value < 0.7 ? 140 : 35;
    const alpha = 0.2 + value * 0.5;
    return {
      label,
      value,
      hue,
      alpha,
    };
  });
}

function buildInitialSnapshot(): CombustionSimulatorSnapshot {
  const cdBuf = Array.from({ length: 200 }, () => (Math.random() - 0.5) * 2);
  return {
    tick: 0,
    cdBuf,
    cdBuf2: [...cdBuf],
    anomBuf: Array.from({ length: 60 }, (_, index) => 0.1 + 0.05 * Math.sin(index * 0.3) + Math.random() * 0.04),
    fftFreqs: FFT_FREQS,
    fftAmps: genFFT(),
    featureCells: buildFeatureCells(),
    anomalyDisplay: '0.14',
    reconErrorDisplay: '0.14',
  };
}

let snapshot = buildInitialSnapshot();

function emit() {
  listeners.forEach((listener) => listener());
}

function updateRealtime() {
  const tick = snapshot.tick + 1;

  const nextCdBuf = [...snapshot.cdBuf];
  nextCdBuf.push(genCDPoint(nextCdBuf[nextCdBuf.length - 1], tick));
  nextCdBuf.shift();

  const nextCdBuf2 = [...snapshot.cdBuf2];
  nextCdBuf2.push(genCDPoint(nextCdBuf2[nextCdBuf2.length - 1], tick));
  nextCdBuf2.shift();

  const nextAnomBuf = [...snapshot.anomBuf];
  const newAnomaly = 0.1 + 0.04 * Math.sin(tick * 0.05) + Math.random() * 0.03;
  nextAnomBuf.push(newAnomaly);
  nextAnomBuf.shift();

  let fftAmps = snapshot.fftAmps;
  if (tick % 15 === 0) {
    fftAmps = genFFT();
  }

  let anomalyDisplay = snapshot.anomalyDisplay;
  let reconErrorDisplay = snapshot.reconErrorDisplay;
  if (tick % 10 === 0) {
    const display = (0.1 + 0.04 * Math.sin(tick * 0.05) + Math.random() * 0.02).toFixed(2);
    anomalyDisplay = display;
    reconErrorDisplay = display;
  }

  snapshot = {
    ...snapshot,
    tick,
    cdBuf: nextCdBuf,
    cdBuf2: nextCdBuf2,
    anomBuf: nextAnomBuf,
    fftAmps,
    anomalyDisplay,
    reconErrorDisplay,
  };

  emit();
}

function ensureStarted() {
  if (intervalId || typeof window === 'undefined') {
    return;
  }
  intervalId = setInterval(updateRealtime, 80);
}

function maybeStop() {
  if (listeners.size > 0 || !intervalId) {
    return;
  }
  clearInterval(intervalId);
  intervalId = null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureStarted();
  return () => {
    listeners.delete(listener);
    maybeStop();
  };
}

function getSnapshot() {
  return snapshot;
}

export function useCombustionSimulator() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
