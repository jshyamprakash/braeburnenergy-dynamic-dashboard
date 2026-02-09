/**
 * Dashboard Layout Storage Utilities
 *
 * Functions for saving and loading dashboard layouts to/from localStorage
 * Supports responsive layouts with breakpoints (lg, md, sm)
 */

import type { DashboardBlock } from '@/components/dashboard/DashboardBuilder';
import type { Layout } from 'react-grid-layout';

const STORAGE_PREFIX = 'dashboard_layout_v2_';
const OLD_STORAGE_PREFIX = 'dashboard_layout_';

/**
 * Migrate old layout format to new responsive format
 */
function migrateOldLayout(oldBlock: any): DashboardBlock {
  const oldLayout = oldBlock.layout;

  // Create responsive layouts from old single layout
  const lgLayout: Layout = {
    i: oldLayout.i,
    x: oldLayout.x,
    y: oldLayout.y,
    w: oldLayout.w,
    h: oldLayout.h,
  };

  // Adjust for medium screens (10 cols)
  const mdLayout: Layout = {
    i: oldLayout.i,
    x: Math.floor((oldLayout.x * 10) / 12),
    y: oldLayout.y,
    w: Math.min(Math.ceil((oldLayout.w * 10) / 12), 10),
    h: oldLayout.h,
  };

  // Adjust for small screens (6 cols, full width)
  const smLayout: Layout = {
    i: oldLayout.i,
    x: 0,
    y: oldLayout.y,
    w: 6,
    h: oldLayout.h,
  };

  return {
    ...oldBlock,
    layouts: {
      lg: lgLayout,
      md: mdLayout,
      sm: smLayout,
    },
  };
}

/**
 * Save dashboard layout to localStorage
 */
export function saveDashboardLayout(dashboardId: string, blocks: DashboardBlock[]): void {
  try {
    const key = `${STORAGE_PREFIX}${dashboardId}`;
    const data = JSON.stringify(blocks);
    localStorage.setItem(key, data);

    // Remove old format if exists
    const oldKey = `${OLD_STORAGE_PREFIX}${dashboardId}`;
    localStorage.removeItem(oldKey);
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);
    throw new Error('Failed to save dashboard layout');
  }
}

/**
 * Load dashboard layout from localStorage
 */
export function loadDashboardLayout(dashboardId: string): DashboardBlock[] | null {
  try {
    // Try new format first
    const newKey = `${STORAGE_PREFIX}${dashboardId}`;
    let data = localStorage.getItem(newKey);

    // Fallback to old format and migrate
    if (!data) {
      const oldKey = `${OLD_STORAGE_PREFIX}${dashboardId}`;
      const oldData = localStorage.getItem(oldKey);

      if (oldData) {
        const oldBlocks = JSON.parse(oldData);
        const migratedBlocks = oldBlocks.map(migrateOldLayout);

        // Save migrated data in new format
        saveDashboardLayout(dashboardId, migratedBlocks);

        return migratedBlocks;
      }

      return null;
    }

    return JSON.parse(data) as DashboardBlock[];
  } catch (error) {
    console.error('Failed to load dashboard layout:', error);
    return null;
  }
}

/**
 * Delete dashboard layout from localStorage
 */
export function deleteDashboardLayout(dashboardId: string): void {
  try {
    const newKey = `${STORAGE_PREFIX}${dashboardId}`;
    const oldKey = `${OLD_STORAGE_PREFIX}${dashboardId}`;
    localStorage.removeItem(newKey);
    localStorage.removeItem(oldKey);
  } catch (error) {
    console.error('Failed to delete dashboard layout:', error);
  }
}

/**
 * List all saved dashboard IDs
 */
export function listDashboardLayouts(): string[] {
  try {
    const dashboardIds: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(STORAGE_PREFIX) || key.startsWith(OLD_STORAGE_PREFIX))) {
        const dashboardId = key.replace(STORAGE_PREFIX, '').replace(OLD_STORAGE_PREFIX, '');
        if (!dashboardIds.includes(dashboardId)) {
          dashboardIds.push(dashboardId);
        }
      }
    }

    return dashboardIds;
  } catch (error) {
    console.error('Failed to list dashboard layouts:', error);
    return [];
  }
}

/**
 * Export dashboard layout as JSON string
 */
export function exportDashboardLayout(dashboardId: string): string | null {
  const blocks = loadDashboardLayout(dashboardId);
  if (!blocks) return null;

  return JSON.stringify(blocks, null, 2);
}

/**
 * Import dashboard layout from JSON string
 */
export function importDashboardLayout(dashboardId: string, jsonString: string): boolean {
  try {
    const blocks = JSON.parse(jsonString) as DashboardBlock[];

    // Validate structure
    if (!Array.isArray(blocks)) {
      throw new Error('Invalid dashboard layout format');
    }

    saveDashboardLayout(dashboardId, blocks);
    return true;
  } catch (error) {
    console.error('Failed to import dashboard layout:', error);
    return false;
  }
}
