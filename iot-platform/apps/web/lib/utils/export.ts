/**
 * Data Export Utilities
 *
 * Utilities for exporting device data and charts in various formats
 */

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return '';

  // Determine columns
  const cols = columns || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Create header row
  const header = cols.map((col) => escapeCSV(col.label)).join(',');

  // Create data rows
  const rows = data.map((row) =>
    cols.map((col) => escapeCSV(String(row[col.key] ?? ''))).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export device states to CSV
 */
export interface DeviceStateExport {
  timestamp: string;
  deviceId: string;
  [key: string]: any; // Dynamic data fields
}

export function exportDeviceStatesToCSV(
  states: DeviceStateExport[],
  deviceId?: string
): void {
  if (states.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Flatten data fields into columns
  const allFields = new Set<string>();
  states.forEach((state) => {
    Object.keys(state).forEach((key) => {
      if (key !== 'timestamp' && key !== 'deviceId') {
        allFields.add(key);
      }
    });
  });

  const dataFields = Array.from(allFields).sort();

  // Create columns: timestamp, deviceId, ...data fields
  const columns = [
    { key: 'timestamp' as const, label: 'Timestamp' },
    { key: 'deviceId' as const, label: 'Device ID' },
    ...dataFields.map((field) => ({ key: field, label: field })),
  ];

  const csvContent = arrayToCSV(states, columns);

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = deviceId
    ? `device_${deviceId}_${timestamp}.csv`
    : `device_states_${timestamp}.csv`;

  downloadCSV(csvContent, filename);
}

/**
 * Export chart as PNG image
 */
export async function exportChartAsPNG(
  svgElement: SVGSVGElement,
  filename: string,
  width: number = 1200,
  height: number = 600
): Promise<void> {
  try {
    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // Set dimensions
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    // Serialize SVG to string
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create image and canvas
    const img = new Image();
    img.width = width;
    img.height = height;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill white background (for transparency)
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const link = document.createElement('a');
          link.download = filename;
          link.href = URL.createObjectURL(blob);
          link.click();

          URL.revokeObjectURL(link.href);
          URL.revokeObjectURL(svgUrl);
          resolve();
        }, 'image/png');
      };

      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = svgUrl;
    });
  } catch (error) {
    console.error('Failed to export chart as PNG:', error);
    throw error;
  }
}

/**
 * Export chart as SVG file
 */
export function exportChartAsSVG(svgElement: SVGSVGElement, filename: string): void {
  try {
    // Clone and serialize SVG
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    const svgString = new XMLSerializer().serializeToString(clonedSvg);

    // Create blob and download
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export chart as SVG:', error);
    throw error;
  }
}

/**
 * Format date for filename
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-').split('T')[0];
}

/**
 * Export time-series data to CSV with formatting
 */
export interface TimeSeriesDataPoint {
  timestamp: string | Date;
  [key: string]: any;
}

export function exportTimeSeriesDataToCSV(
  data: TimeSeriesDataPoint[],
  chartTitle?: string
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Format timestamps
  const formattedData = data.map((point) => ({
    ...point,
    timestamp:
      typeof point.timestamp === 'string'
        ? point.timestamp
        : point.timestamp.toISOString(),
  }));

  const csvContent = arrayToCSV(formattedData);

  const dateStr = formatDateForFilename();
  const titleSlug = chartTitle
    ? chartTitle.toLowerCase().replace(/\s+/g, '_')
    : 'chart_data';
  const filename = `${titleSlug}_${dateStr}.csv`;

  downloadCSV(csvContent, filename);
}
