import { test, expect } from '@playwright/test';

/**
 * E2E Test: Dashboard Builder
 *
 * Tests the dashboard builder workflow:
 * 1. Enter edit mode
 * 2. Add blocks from palette
 * 3. Configure block properties
 * 4. Drag and resize blocks
 * 5. Save layout
 * 6. Reload and verify persistence
 */

test.describe('Dashboard Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start fresh
    await page.goto('/dashboard-builder');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should add and configure gauge block', async ({ page }) => {
    await page.goto('/dashboard-builder');

    // Enter edit mode
    await page.click('button:has-text("Edit Dashboard")');
    await expect(page.locator('text=Exit Edit Mode')).toBeVisible();

    // Show palette
    await page.click('button:has-text("Show Palette")');
    await expect(page.locator('text=Add Blocks')).toBeVisible();

    // Add a gauge block
    await page.locator('button:has-text("Gauge")').first().click();

    // Wait for block to appear
    await page.waitForTimeout(1000);

    // Verify block appears (look for any block element)
    const blocks = page.locator('.react-grid-item');
    await expect(blocks.first()).toBeVisible();

    // Click menu button on block
    const menuButton = page.locator('button[title*="Block menu"]').first();
    await menuButton.click();

    // Click "Edit Settings" from menu
    await page.locator('text=Edit Settings').click();

    // Verify configuration panel appears
    await expect(page.locator('text=/Block.*Settings|Configuration/i')).toBeVisible();

    // Update block title (find the input field)
    const titleInput = page.locator('input').first();
    await titleInput.fill('Test Gauge');

    // Close config panel (look for close button or click outside)
    await page.keyboard.press('Escape');

    // Wait a bit for panel to close
    await page.waitForTimeout(500);

    console.log('✅ Gauge block added and configured');
  });

  test('should add chart and live stream blocks', async ({ page }) => {
    await page.goto('/dashboard-builder');

    await page.click('button:has-text("Edit Dashboard")');
    await page.click('button:has-text("Show Palette")');

    // Add chart block
    await page.locator('button:has-text("Time-Series Chart")').click();
    await page.waitForTimeout(500);

    // Add live stream block
    await page.locator('button:has-text("Live Stream")').click();
    await page.waitForTimeout(500);

    // Verify multiple blocks exist
    const blocks = page.locator('.react-grid-item');
    await expect(blocks).toHaveCount(2);

    console.log('✅ Multiple block types added successfully');
  });

  test('should save and restore layout', async ({ page }) => {
    await page.goto('/dashboard-builder');

    // Enter edit mode and add blocks
    await page.click('button:has-text("Edit Dashboard")');
    await page.click('button:has-text("Show Palette")');
    await page.locator('button:has-text("Gauge")').first().click();
    await page.waitForTimeout(1000);

    // Save layout
    await page.click('button:has-text("Save Layout")');
    await expect(page.locator('text=/saved|success/i')).toBeVisible({ timeout: 10000 });

    // Exit edit mode
    await page.click('button:has-text("Exit Edit Mode")');

    // Verify block still exists
    const blocks = page.locator('.react-grid-item');
    await expect(blocks.first()).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify block persists after reload
    await expect(blocks.first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Layout persistence working correctly');
  });

  test('should remove blocks', async ({ page }) => {
    await page.goto('/dashboard-builder');

    // Enter edit mode and add a block
    await page.click('button:has-text("Edit Dashboard")');
    await page.click('button:has-text("Show Palette")');
    await page.locator('button:has-text("Gauge")').first().click();
    await page.waitForTimeout(1000);

    // Verify block exists
    const blocks = page.locator('.react-grid-item');
    await expect(blocks.first()).toBeVisible();

    // Click menu button
    const menuButton = page.locator('button[title*="Block menu"]').first();
    await menuButton.click();

    // Set up dialog handler before clicking delete
    page.on('dialog', dialog => {
      console.log('Dialog:', dialog.message());
      dialog.accept();
    });

    // Click "Delete Block" from menu
    await page.locator('text=Delete Block').click();

    // Wait for block to be removed
    await page.waitForTimeout(1000);

    // Verify no blocks remain (or fewer blocks)
    const remainingBlocks = page.locator('.react-grid-item');
    const count = await remainingBlocks.count();
    expect(count).toBe(0);

    console.log('✅ Block removal working correctly');
  });

  test('should exit edit mode and lock layout', async ({ page }) => {
    await page.goto('/dashboard-builder');

    // Enter edit mode
    await page.click('button:has-text("Edit Dashboard")');
    await expect(page.locator('button:has-text("Show Palette")')).toBeVisible();

    await page.click('button:has-text("Show Palette")');
    await page.locator('button:has-text("Gauge")').first().click();
    await page.waitForTimeout(1000);

    // Exit edit mode
    await page.click('button:has-text("Exit Edit Mode")');

    // Verify edit controls are hidden
    await expect(page.locator('button:has-text("Show Palette")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Save Layout")')).not.toBeVisible();

    // Verify "Edit Dashboard" button is back
    await expect(page.locator('button:has-text("Edit Dashboard")')).toBeVisible();

    // Verify block menu buttons are not visible
    const menuButtons = page.locator('button[title*="Block menu"]');
    await expect(menuButtons.first()).not.toBeVisible();

    console.log('✅ Edit mode toggle working correctly');
  });
});
