'use client';

import { useState, useRef, useEffect } from 'react';
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout';
import { RealTimeGaugeBlock } from './RealTimeGaugeBlock';
import { RealTimeChartBlock } from './RealTimeChartBlock';
import { LiveStreamBlock } from '../blocks/LiveStreamBlock';
import { BlockPalette } from './BlockPalette';
import { BlockConfigPanel } from './BlockConfigPanel';
import { toast } from '@/lib/utils/toast';
import { useDeviceRealtime, useDeviceStates } from '@/hooks/useDeviceData';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  initializeDashboard,
  loadDashboardFromBackend,
  syncDashboardWithBackend,
  addBlock,
  removeBlock,
  updateBlockConfig,
  updateLayouts,
  setEditMode,
  toggleEditMode,
  selectBlock,
  saveDashboard,
  resetDashboard,
  setOnlineStatus,
  selectBlocks,
  selectEditMode,
  selectSelectedBlockId,
  selectSelectedBlock,
  selectIsDirty,
  selectLayouts,
  selectSyncStatus,
  selectSyncError,
  selectIsOnline,
  type DashboardBlock as ReduxDashboardBlock,
} from '@/lib/store/slices/dashboardSlice';
import { dashboardConfig } from '@/lib/config';

// Define Layout type for react-grid-layout items
interface Layout {
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

// Define Layouts type for react-grid-layout responsive layouts
type Layouts = { [breakpoint: string]: Layout[] };

/**
 * Generate mock time-series data for chart blocks
 */
function generateMockChartData(points: number = 24) {
  const now = Date.now();
  const data = [];

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - i) * 3600 * 1000); // Hourly data
    data.push({
      timestamp: timestamp.toISOString(),
      temperature: 20 + Math.random() * 15 + Math.sin(i / 3) * 5, // 20-35°C with wave pattern
      humidity: 40 + Math.random() * 30 + Math.cos(i / 4) * 10, // 30-70% with wave pattern
      pressure: 1000 + Math.random() * 30 + Math.sin(i / 6) * 5, // 995-1030 hPa
    });
  }

  return data;
}

// Re-export DashboardBlock from Redux slice for backward compatibility
export type DashboardBlock = ReduxDashboardBlock;

interface DashboardBuilderProps {
  /**
   * Initial dashboard blocks
   */
  initialBlocks?: DashboardBlock[];

  /**
   * Dashboard ID for persistence
   */
  dashboardId?: string;

  /**
   * Edit mode toggle
   */
  isEditMode?: boolean;

  /**
   * Callback when edit mode changes
   */
  onEditModeChange?: (isEditMode: boolean) => void;
}

/**
 * DashboardBuilder Component
 *
 * Drag-and-drop dashboard builder with block configuration
 * - Add/remove blocks from palette
 * - Resize and reposition blocks
 * - Configure block properties
 * - Save/load dashboard layouts
 */
export function DashboardBuilder({
  initialBlocks = [],
  dashboardId = 'default',
  isEditMode: externalEditMode,
  onEditModeChange,
}: DashboardBuilderProps) {
  const dispatch = useAppDispatch();

  // Redux state
  const blocks = useAppSelector(selectBlocks);
  const reduxEditMode = useAppSelector(selectEditMode);
  const selectedBlockId = useAppSelector(selectSelectedBlockId);
  const selectedBlock = useAppSelector(selectSelectedBlock);
  const isDirty = useAppSelector(selectIsDirty);
  const layouts = useAppSelector(selectLayouts);
  const syncStatus = useAppSelector(selectSyncStatus);
  const syncError = useAppSelector(selectSyncError);
  const isOnline = useAppSelector(selectIsOnline);

  // Use external edit mode if provided, otherwise use Redux state
  const isEditMode = externalEditMode !== undefined ? externalEditMode : reduxEditMode;

  // Local UI state (not shared across components)
  const [showPalette, setShowPalette] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [blockMenuOpen, setBlockMenuOpen] = useState<string | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Initialize dashboard: localStorage first (instant), then backend (sync)
  useEffect(() => {
    // Step 1: Load from localStorage immediately (fast, works offline)
    dispatch(initializeDashboard(dashboardId));

    // Step 2: Try to load from backend (sync across devices)
    dispatch(loadDashboardFromBackend(dashboardId));
  }, [dashboardId, dispatch]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
      toast.success('Back online - dashboard will sync');
      // Attempt to sync when coming back online
      if (isDirty) {
        dispatch(syncDashboardWithBackend());
      }
    };

    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
      toast.warning('Offline mode - changes saved locally');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial online status
    dispatch(setOnlineStatus(navigator.onLine));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch, isDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace - Remove selected block
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        // Don't delete if user is typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
          return;
        }
        e.preventDefault();
        handleRemoveBlock(selectedBlockId);
      }

      // Escape - Close config panel or deselect
      if (e.key === 'Escape') {
        if (selectedBlockId) {
          dispatch(selectBlock(null));
        }
        if (blockMenuOpen) {
          setBlockMenuOpen(null);
        }
      }

      // Ctrl/Cmd+D - Duplicate selected block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBlockId) {
        e.preventDefault();
        handleDuplicateBlock(selectedBlockId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, selectedBlockId, blockMenuOpen]);

  // Measure container width for responsive grid
  useEffect(() => {
    if (!gridContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const width = entries[0].contentRect.width;
        setContainerWidth(width);
      }
    });

    observer.observe(gridContainerRef.current);

    // Set initial width
    setContainerWidth(gridContainerRef.current.offsetWidth);

    return () => observer.disconnect();
  }, []);

  const handleEditModeToggle = () => {
    const newMode = !isEditMode;
    if (onEditModeChange) {
      onEditModeChange(newMode);
    } else {
      dispatch(toggleEditMode());
    }

    if (!newMode) {
      dispatch(selectBlock(null));
      setShowPalette(false);
      setBlockMenuOpen(null);
    }
  };

  const handleLayoutChange = (layout: Layout[], allLayouts: Layouts) => {
    dispatch(updateLayouts(allLayouts));
  };

  const handleAddBlock = (type: DashboardBlock['type']) => {
    const newId = `block_${Date.now()}`;

    // Define default sizes and constraints per breakpoint
    const defaultSizes = {
      gauge: {
        lg: { w: 2, h: 5, minW: 2, maxW: 4, minH: 4, maxH: 8 },
        md: { w: 3, h: 5, minW: 2, maxW: 6, minH: 4, maxH: 8 },
        sm: { w: 3, h: 5, minW: 3, maxW: 6, minH: 4, maxH: 8 },
      },
      chart: {
        lg: { w: 6, h: 6, minW: 3, maxW: 12, minH: 4, maxH: 12 },
        md: { w: 10, h: 6, minW: 3, maxW: 10, minH: 4, maxH: 12 },
        sm: { w: 6, h: 6, minW: 3, maxW: 6, minH: 4, maxH: 12 },
      },
      liveStream: {
        lg: { w: 6, h: 7, minW: 3, maxW: 12, minH: 5, maxH: 15 },
        md: { w: 10, h: 7, minW: 3, maxW: 10, minH: 5, maxH: 15 },
        sm: { w: 6, h: 7, minW: 3, maxW: 6, minH: 5, maxH: 15 },
      },
    };

    const sizes = defaultSizes[type];
    const baseX = (blocks.length * 2) % 12;

    // Generate default config based on block type
    const defaultConfig: DashboardBlock['config'] = {
      title: `New ${type === 'gauge' ? 'Gauge' : type === 'chart' ? 'Chart' : 'Live Stream'}`,
    };

    // Add mock data for chart blocks
    if (type === 'chart') {
      defaultConfig.data = generateMockChartData(24);
      defaultConfig.series = [
        { key: 'temperature', label: 'Temperature', color: '#ef4444', unit: '°C' },
        { key: 'humidity', label: 'Humidity', color: '#3b82f6', unit: '%' },
        { key: 'pressure', label: 'Pressure', color: '#10b981', unit: 'hPa' },
      ];
      defaultConfig.chartType = 'line';
    }

    const newBlock: DashboardBlock = {
      id: newId,
      type,
      layouts: {
        lg: {
          i: newId,
          x: baseX,
          y: Infinity,
          w: sizes.lg.w,
          h: sizes.lg.h,
          minW: sizes.lg.minW,
          maxW: sizes.lg.maxW,
          minH: sizes.lg.minH,
          maxH: sizes.lg.maxH,
        },
        md: {
          i: newId,
          x: baseX % 10,
          y: Infinity,
          w: sizes.md.w,
          h: sizes.md.h,
          minW: sizes.md.minW,
          maxW: sizes.md.maxW,
          minH: sizes.md.minH,
          maxH: sizes.md.maxH,
        },
        sm: {
          i: newId,
          x: 0,
          y: Infinity,
          w: sizes.sm.w,
          h: sizes.sm.h,
          minW: sizes.sm.minW,
          maxW: sizes.sm.maxW,
          minH: sizes.sm.minH,
          maxH: sizes.sm.maxH,
        },
      },
      config: defaultConfig,
    };

    dispatch(addBlock(newBlock));
    dispatch(selectBlock(newId));
    toast.success(`Added ${type} block`);
  };

  const handleRemoveBlock = (blockId: string) => {
    dispatch(removeBlock(blockId));
    toast.success('Block removed');
  };

  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find((b) => b.id === blockId);
    if (!blockToDuplicate) return;

    const newId = `block_${Date.now()}`;
    const duplicatedBlock: DashboardBlock = {
      ...blockToDuplicate,
      id: newId,
      layouts: {
        lg: { ...blockToDuplicate.layouts.lg, i: newId, x: (blockToDuplicate.layouts.lg.x + 3) % 12, y: Infinity },
        md: { ...blockToDuplicate.layouts.md, i: newId, x: (blockToDuplicate.layouts.md.x + 3) % 10, y: Infinity },
        sm: { ...blockToDuplicate.layouts.sm, i: newId, x: 0, y: Infinity },
      },
      config: {
        ...blockToDuplicate.config,
        title: `${blockToDuplicate.config.title || 'Block'} (Copy)`,
      },
    };

    dispatch(addBlock(duplicatedBlock));
    dispatch(selectBlock(newId));
    toast.success('Block duplicated');
  };

  const handleUpdateBlockConfig = (blockId: string, config: DashboardBlock['config']) => {
    dispatch(updateBlockConfig({ id: blockId, config }));
  };

  const handleSaveLayout = async () => {
    // Use hybrid sync (localStorage + backend)
    const result = await dispatch(syncDashboardWithBackend());

    if (syncDashboardWithBackend.fulfilled.match(result)) {
      const payload = result.payload as any;
      if (payload?.synced) {
        toast.success('Dashboard synced to cloud');
      } else if (payload?.reason === 'offline') {
        toast.success('Dashboard saved locally (offline)');
      }
    } else {
      toast.warning('Saved locally, cloud sync failed');
    }
  };

  const handleClearLayout = () => {
    if (confirm('Are you sure you want to clear the entire dashboard?')) {
      dispatch(resetDashboard());
      toast.success('Dashboard cleared');
    }
  };

  // Auto-save with hybrid sync (localStorage + backend)
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        // Hybrid sync: saves to localStorage + backend
        dispatch(syncDashboardWithBackend());
      }, dashboardConfig.autoSaveDelay);

      return () => clearTimeout(timer);
    }
  }, [isDirty, dispatch]);

  const renderBlock = (block: DashboardBlock) => {
    const isSelected = selectedBlockId === block.id;

    const blockContent = (() => {
      switch (block.type) {
        case 'gauge':
          return (
            <RealTimeGaugeBlock
              deviceId={block.config.deviceId}
              field={block.config.field}
              value={block.config.value || 75}
              min={block.config.min || 0}
              max={block.config.max || 100}
              label={block.config.title || 'Gauge'}
              unit={block.config.unit || ''}
              warningThreshold={block.config.warningThreshold}
              criticalThreshold={block.config.criticalThreshold}
              size="md"
            />
          );

        case 'chart':
          return (
            <RealTimeChartBlock
              deviceId={block.config.deviceId}
              data={block.config.data || []}
              series={block.config.series || []}
              title={block.config.title || 'Chart'}
              chartType={block.config.chartType || 'line'}
              showLegend={block.config.showLegend !== false}
              showGrid={block.config.showGrid !== false}
              smooth={block.config.smooth !== false}
            />
          );

        case 'liveStream':
          return (
            <LiveStreamBlock
              deviceId={block.config.deviceId}
              title={block.config.title || 'Live Stream'}
              height={300}
              fields={block.config.fields}
              maxUpdates={50}
            />
          );

        default:
          return <div>Unknown block type</div>;
      }
    })();

    return (
      <div
        key={block.id}
        className={`relative w-full h-full overflow-hidden ${
          isEditMode
            ? 'border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800'
            : 'bg-transparent'
        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      >
        {/* Edit mode controls */}
        {isEditMode && (
          <div className="absolute top-2 right-2 z-10">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBlockMenuOpen(blockMenuOpen === block.id ? null : block.id);
                }}
                className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-700 dark:text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {blockMenuOpen === block.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setBlockMenuOpen(null)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(selectBlock(block.id));
                        setBlockMenuOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Edit Settings
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateBlock(block.id);
                        setBlockMenuOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                      Duplicate Block
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBlock(block.id);
                        setBlockMenuOpen(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                      Delete Block
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {blockContent}
      </div>
    );
  };

  return (
    <div className="relative h-screen">
      {/* Main Dashboard Area - Full width */}
      <div className="w-full h-full overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dashboard Builder
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>

            {/* Sync Status Indicator */}
            <div className="flex items-center gap-2">
              {syncStatus === 'loading' && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Loading...</span>
                </div>
              )}
              {syncStatus === 'syncing' && (
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Syncing...</span>
                </div>
              )}
              {syncStatus === 'synced' && !isDirty && (
                <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Synced</span>
                </div>
              )}
              {syncStatus === 'error' && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400" title={syncError || 'Sync failed'}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Error</span>
                </div>
              )}
              {!isOnline && (
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                  </svg>
                  <span>Offline</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditMode && (
              <>
                <button
                  onClick={() => setShowPalette(!showPalette)}
                  className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  {showPalette ? 'Hide' : 'Show'} Palette
                </button>
                <button
                  onClick={handleSaveLayout}
                  className="px-4 py-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                >
                  Save Layout
                </button>
                <button
                  onClick={handleClearLayout}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Clear All
                </button>
              </>
            )}
            <button
              onClick={handleEditModeToggle}
              className={`px-4 py-2 text-sm rounded ${
                isEditMode
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isEditMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div ref={gridContainerRef} className="w-full">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-gray-400 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Empty Dashboard
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isEditMode
                ? 'Click "Show Palette" to add blocks to your dashboard'
                : 'Click "Edit Dashboard" to start building'}
            </p>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{
              lg: blocks.map((b) => ({ ...b.layouts.lg, static: !isEditMode })),
              md: blocks.map((b) => ({ ...b.layouts.md, static: !isEditMode })),
              sm: blocks.map((b) => ({ ...b.layouts.sm, static: !isEditMode })),
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: 12, md: 10, sm: 6 }}
            rowHeight={60}
            width={containerWidth}
            onLayoutChange={handleLayoutChange as any}
            {...({ isDraggable: isEditMode } as any)}
            {...({ isResizable: isEditMode } as any)}
            compactType="vertical"
            preventCollision={false}
            containerPadding={[0, 0]}
            margin={[16, 16]}
            useCSSTransforms={true}
          >
            {blocks.map(renderBlock)}
          </ResponsiveGridLayout>
        )}
        </div>
      </div>

      {/* Block Palette Sidebar - Floating Overlay */}
      {isEditMode && showPalette && (
        <div className="fixed left-4 sm:left-6 lg:left-8 top-0 h-full z-20 shadow-xl">
          <BlockPalette
            onAddBlock={handleAddBlock}
            onClose={() => setShowPalette(false)}
          />
        </div>
      )}

      {/* Block Configuration Panel - Floating Overlay */}
      {isEditMode && selectedBlock && (
        <div className="fixed right-4 sm:right-6 lg:right-8 top-0 h-full z-20 shadow-xl">
          <BlockConfigPanel
            block={selectedBlock}
            onUpdate={(config) => handleUpdateBlockConfig(selectedBlock.id, config)}
            onClose={() => dispatch(selectBlock(null))}
          />
        </div>
      )}
    </div>
  );
}
