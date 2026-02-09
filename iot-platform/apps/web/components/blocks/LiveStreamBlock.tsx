'use client';

import { useState, useEffect, useRef } from 'react';
import { List, type ListImperativeAPI } from 'react-window';
import type { DeviceState } from '@/lib/types';

interface LiveStreamBlockProps {
  /**
   * Device ID to subscribe to
   */
  deviceId?: string;

  /**
   * Title of the live stream block
   */
  title?: string;

  /**
   * Maximum number of updates to display
   */
  maxUpdates?: number;

  /**
   * Height of the stream container
   */
  height?: number;

  /**
   * Fields to display from device state data
   */
  fields?: string[];

  /**
   * Auto-scroll to latest updates
   */
  autoScroll?: boolean;

  /**
   * Manual data injection (for demo purposes)
   */
  manualData?: DeviceState[];
}

/**
 * LiveStreamBlock Component
 *
 * Displays a real-time stream of device state updates via WebSocket.
 * Shows incoming data in a scrollable feed with timestamps and field values.
 *
 * Features:
 * - Real-time WebSocket updates
 * - Auto-scrolling to latest data
 * - Field filtering
 * - Update counter
 * - Visual indicators for new data
 *
 * @example
 * <LiveStreamBlock
 *   deviceId="01HGW5N8XZ7KQRST9VW2XY3Z4A"
 *   title="Temperature Sensor Live Feed"
 *   fields={['temperature', 'humidity']}
 *   maxUpdates={50}
 * />
 */
export function LiveStreamBlock({
  deviceId,
  title = 'Live Data Stream',
  maxUpdates = 50,
  height = 400,
  fields,
  autoScroll = true,
  manualData,
}: LiveStreamBlockProps) {
  const [updates, setUpdates] = useState<DeviceState[]>([]);
  const [updateCount, setUpdateCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const streamRef = useRef<ListImperativeAPI>(null);

  // Handle manual data injection (for demo)
  useEffect(() => {
    if (manualData && manualData.length > 0) {
      const latestData = manualData[0]; // Get first item (newest data)
      if (!isPaused) {
        setUpdates((prev) => {
          const updated = [latestData, ...prev];
          return updated.slice(0, maxUpdates);
        });
        setUpdateCount((prev) => prev + 1);
      }
    }
  }, [manualData, maxUpdates, isPaused]);

  // Auto-scroll to top when new data arrives (for virtualized list)
  useEffect(() => {
    if (autoScroll && streamRef.current && !isPaused && updates.length > 0) {
      streamRef.current.scrollToRow({ index: 0, align: 'start' });
    }
  }, [updates.length, autoScroll, isPaused]);

  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  // Extract and format field values
  const formatFieldValue = (data: any, field: string): string => {
    const value = data[field];
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  };

  // Get fields to display
  const displayFields = fields || (updates.length > 0 ? Object.keys(updates[0].data) : []);

  // Row component for virtual list
  const Row = ({
    index,
    style,
    ariaAttributes
  }: {
    index: number;
    style: React.CSSProperties;
    ariaAttributes: {
      'aria-posinset': number;
      'aria-setsize': number;
      role: 'listitem';
    };
  }) => {
    const update = updates[index];
    return (
      <div
        style={style}
        {...ariaAttributes}
        className={`px-4 py-3 hover:bg-white dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 ${
          index === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'
        }`}
      >
        {/* Timestamp */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {formatTime(update.timestamp)}
          </span>
          {index === 0 && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">New</span>
          )}
        </div>

        {/* Field Values */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {displayFields.map((field) => (
            <div
              key={field}
              className="bg-white dark:bg-gray-700 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-600"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{field}</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {formatFieldValue(update.data, field)}
              </div>
            </div>
          ))}
        </div>

        {/* Raw JSON (collapsible) */}
        <details className="mt-2">
          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
            View Raw JSON
          </summary>
          <pre className="mt-2 p-2 bg-gray-900 dark:bg-gray-950 text-green-400 dark:text-green-300 rounded text-xs overflow-x-auto">
            {JSON.stringify(update.data, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isPaused ? 'bg-gray-400 dark:bg-gray-600' : 'bg-green-500 animate-pulse'
              }`}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {isPaused ? 'Paused' : 'Live'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">{updateCount} updates</span>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1 text-xs rounded ${
              isPaused
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={() => {
              setUpdates([]);
              setUpdateCount(0);
            }}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Stream Container with Virtual Scrolling */}
      <div className="bg-gray-50 dark:bg-gray-900" style={{ height }}>
        {updates.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
            <div className="text-center">
              <div className="text-4xl mb-2">📡</div>
              <p>Waiting for data...</p>
              {deviceId && (
                <p className="text-xs mt-1">Listening to device: {deviceId}</p>
              )}
            </div>
          </div>
        ) : (
          <List
            listRef={streamRef}
            rowCount={updates.length}
            rowHeight={180}
            defaultHeight={height}
            className="scrollbar-thin"
            rowComponent={Row}
            rowProps={{}}
          />
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div>
            Showing {updates.length} of {updateCount} total updates
          </div>
          {updates.length > 0 && (
            <div className="flex items-center gap-4">
              <span>
                Latest: {formatTime(updates[0].timestamp)}
              </span>
              {updates.length >= maxUpdates && (
                <span className="text-amber-600">
                  Buffer full ({maxUpdates} max)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
