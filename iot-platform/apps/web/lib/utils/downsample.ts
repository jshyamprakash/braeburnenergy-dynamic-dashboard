/**
 * Largest Triangle Three Buckets (LTTB) Downsampling Algorithm
 *
 * Reduces the number of data points in a time series while preserving visual shape.
 * More effective than simple nth-point sampling as it identifies the most visually
 * significant points.
 *
 * Based on: Sveinn Steinarsson's 2013 paper
 * "Downsampling Time Series for Visual Representation"
 */

export interface DataPoint {
  timestamp: string | Date;
  [key: string]: any;
}

/**
 * Calculate area of triangle formed by three points
 */
function triangleArea(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  return Math.abs(
    (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2
  );
}

/**
 * Downsample time-series data using LTTB algorithm
 *
 * @param data - Array of data points with timestamp and numeric fields
 * @param threshold - Target number of points to return (must be >= 3)
 * @param valueKey - The field to use for downsampling calculation (default: first numeric field)
 * @returns Downsampled array preserving visual shape
 *
 * @example
 * const data = [
 *   { timestamp: '2026-01-01T00:00:00Z', temperature: 20 },
 *   { timestamp: '2026-01-01T00:01:00Z', temperature: 21 },
 *   // ... 1000 more points
 * ];
 *
 * const downsampled = downsampleLTTB(data, 100, 'temperature');
 * // Returns 100 most visually significant points
 */
export function downsampleLTTB<T extends DataPoint>(
  data: T[],
  threshold: number,
  valueKey?: keyof T
): T[] {
  // Edge cases
  if (threshold >= data.length || threshold < 3) {
    return data;
  }

  if (data.length <= 2) {
    return data;
  }

  // Auto-detect value key if not provided
  let key: keyof T;
  if (valueKey) {
    key = valueKey;
  } else {
    // Find first numeric field
    const firstPoint = data[0];
    const numericKey = Object.keys(firstPoint).find(
      (k) => k !== 'timestamp' && typeof firstPoint[k as keyof T] === 'number'
    );
    if (!numericKey) {
      return data; // No numeric fields found
    }
    key = numericKey as keyof T;
  }

  const sampled: T[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  // Always include first point
  sampled.push(data[0]);

  let a = 0; // Index of last selected point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (for area calculation)
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < avgRangeEnd && j < data.length; j++) {
      avgX += new Date(data[j].timestamp).getTime();
      avgY += Number(data[j][key]) || 0;
    }

    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a (last selected point)
    const pointA = {
      x: new Date(data[a].timestamp).getTime(),
      y: Number(data[a][key]) || 0,
    };

    // Point b (bucket average)
    const pointB = { x: avgX, y: avgY };

    let maxArea = -1;
    let maxAreaPoint = rangeOffs;

    // Select point with largest triangle area
    for (let j = rangeOffs; j < rangeTo && j < data.length; j++) {
      const pointC = {
        x: new Date(data[j].timestamp).getTime(),
        y: Number(data[j][key]) || 0,
      };

      const area = triangleArea(pointA, pointB, pointC);

      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }

    sampled.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }

  // Always include last point
  sampled.push(data[data.length - 1]);

  return sampled;
}

/**
 * Simple nth-point downsampling (faster but less sophisticated)
 *
 * @param data - Array of data points
 * @param threshold - Target number of points
 * @returns Every nth point
 */
export function downsampleNth<T>(data: T[], threshold: number): T[] {
  if (threshold >= data.length) {
    return data;
  }

  const every = Math.ceil(data.length / threshold);
  return data.filter((_, index) => index % every === 0);
}

/**
 * Auto-select downsampling threshold based on chart width
 *
 * @param chartWidth - Width of chart in pixels
 * @param dataLength - Number of data points
 * @returns Optimal threshold (1-2 points per pixel)
 */
export function getOptimalThreshold(chartWidth: number, dataLength: number): number {
  // Target 1.5 points per pixel for smooth curves
  const targetPoints = Math.floor(chartWidth * 1.5);

  // Only downsample if we have significantly more points
  if (dataLength <= targetPoints) {
    return dataLength;
  }

  return Math.max(50, targetPoints); // Minimum 50 points for visual quality
}
