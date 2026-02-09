/**
 * Dashboard Layout Storage Utilities
 *
 * Functions for saving and loading dashboard layouts to/from localStorage
 */

import type { DashboardBlock } from '@/components/dashboard/DashboardBuilder';

const STORAGE_PREFIX = 'dashboard_layout_';

/**
 * Save dashboard layout to localStorage
 */
export function saveDashboardLayout(dashboardId: string, blocks: DashboardBlock[]): void {
  try {
    const key = `${STORAGE_PREFIX}${dashboardId}`;
    const data = JSON.stringify(blocks);
    localStorage.setItem(key, data);
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
    const key = `${STORAGE_PREFIX}${dashboardId}`;
    const data = localStorage.getItem(key);

    if (!data) return null;

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
    const key = `${STORAGE_PREFIX}${dashboardId}`;
    localStorage.removeItem(key);
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
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const dashboardId = key.replace(STORAGE_PREFIX, '');
        dashboardIds.push(dashboardId);
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
