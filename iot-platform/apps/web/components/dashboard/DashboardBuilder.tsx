'use client';

import { useState } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { GaugeBlock } from '../blocks/GaugeBlock';
import { TimeSeriesChart } from '../blocks/TimeSeriesChart';
import { LiveStreamBlock } from '../blocks/LiveStreamBlock';
import { BlockPalette } from './BlockPalette';
import { BlockConfigPanel } from './BlockConfigPanel';
import { saveDashboardLayout, loadDashboardLayout } from '@/lib/utils/dashboard-storage';
import { toast } from '@/lib/utils/toast';

export interface DashboardBlock {
  id: string;
  type: 'gauge' | 'chart' | 'liveStream';
  layout: Layout;
  config: {
    title?: string;
    deviceId?: string;
    fields?: string[];
    [key: string]: any;
  };
}

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
  const [blocks, setBlocks] = useState<DashboardBlock[]>(() => {
    if (initialBlocks.length > 0) return initialBlocks;
    // Try to load from localStorage
    const saved = loadDashboardLayout(dashboardId);
    return saved || [];
  });

  const [internalEditMode, setInternalEditMode] = useState(false);
  const isEditMode = externalEditMode !== undefined ? externalEditMode : internalEditMode;

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleEditModeToggle = () => {
    const newMode = !isEditMode;
    if (onEditModeChange) {
      onEditModeChange(newMode);
    } else {
      setInternalEditMode(newMode);
    }

    if (!newMode) {
      setSelectedBlockId(null);
      setShowPalette(false);
    }
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) => {
        const layoutItem = newLayout.find((l) => l.i === block.id);
        if (layoutItem) {
          return { ...block, layout: layoutItem };
        }
        return block;
      })
    );
  };

  const handleAddBlock = (type: DashboardBlock['type']) => {
    const newId = `block_${Date.now()}`;
    const newBlock: DashboardBlock = {
      id: newId,
      type,
      layout: {
        i: newId,
        x: (blocks.length * 2) % 12,
        y: Infinity, // Puts it at the bottom
        w: type === 'gauge' ? 3 : 6,
        h: type === 'gauge' ? 4 : 6,
      },
      config: {
        title: `New ${type === 'gauge' ? 'Gauge' : type === 'chart' ? 'Chart' : 'Live Stream'}`,
      },
    };

    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newId);
    toast.success(`Added ${type} block`);
  };

  const handleRemoveBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    toast.success('Block removed');
  };

  const handleUpdateBlockConfig = (blockId: string, config: DashboardBlock['config']) => {
    setBlocks((prevBlocks) =>
      prevBlocks.map((block) =>
        block.id === blockId ? { ...block, config: { ...block.config, ...config } } : block
      )
    );
  };

  const handleSaveLayout = () => {
    saveDashboardLayout(dashboardId, blocks);
    toast.success('Dashboard layout saved');
  };

  const handleClearLayout = () => {
    if (confirm('Are you sure you want to clear the entire dashboard?')) {
      setBlocks([]);
      setSelectedBlockId(null);
      toast.success('Dashboard cleared');
    }
  };

  const renderBlock = (block: DashboardBlock) => {
    const isSelected = selectedBlockId === block.id;

    const blockContent = (() => {
      switch (block.type) {
        case 'gauge':
          return (
            <GaugeBlock
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
            <TimeSeriesChart
              data={block.config.data || []}
              series={block.config.series || []}
              title={block.config.title || 'Chart'}
              type={block.config.chartType || 'line'}
              height={200}
            />
          );

        case 'liveStream':
          return (
            <LiveStreamBlock
              deviceId={block.config.deviceId}
              title={block.config.title || 'Live Stream'}
              height={250}
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
        className={`relative h-full ${
          isEditMode
            ? 'border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg'
            : ''
        } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        onClick={(e) => {
          if (isEditMode) {
            e.stopPropagation();
            setSelectedBlockId(block.id);
          }
        }}
      >
        {/* Edit mode controls */}
        {isEditMode && (
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBlockId(block.id);
              }}
              className="p-1.5 bg-white dark:bg-gray-800 rounded shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
              title="Configure"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-700 dark:text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveBlock(block.id);
              }}
              className="p-1.5 bg-red-50 dark:bg-red-900/30 rounded shadow-sm hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800"
              title="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-red-600 dark:text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {blockContent}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Main Dashboard Area */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Dashboard Builder
            </h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
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
          <GridLayout
            className="layout"
            layout={blocks.map((b) => b.layout)}
            cols={12}
            rowHeight={50}
            width={1200}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            compactType="vertical"
          >
            {blocks.map(renderBlock)}
          </GridLayout>
        )}
      </div>

      {/* Block Palette Sidebar */}
      {isEditMode && showPalette && (
        <BlockPalette
          onAddBlock={handleAddBlock}
          onClose={() => setShowPalette(false)}
        />
      )}

      {/* Block Configuration Panel */}
      {isEditMode && selectedBlock && (
        <BlockConfigPanel
          block={selectedBlock}
          onUpdate={(config) => handleUpdateBlockConfig(selectedBlock.id, config)}
          onClose={() => setSelectedBlockId(null)}
        />
      )}
    </div>
  );
}
