import { test, expect } from '@playwright/test';

/**
 * E2E Test: Device Management
 *
 * Tests the complete CRUD flow for devices:
 * 1. Create a new device
 * 2. View device in list
 * 3. View device details
 * 4. Update device
 * 5. Delete device
 */

test.describe('Device Management', () => {
  test('should create, view, update, and delete a device', async ({ page }) => {
    // Navigate to devices page
    await page.goto('/devices');
    await expect(page).toHaveTitle(/IoT Platform/);

    // Click "Add Device" button
    await page.click('button:has-text("Add Device")');

    // Wait for form modal to appear
    await expect(page.locator('text=Create New Device')).toBeVisible();

    // Fill out device form
    const testDeviceName = `E2E Test Device ${Date.now()}`;
    await page.fill('input[placeholder*="Temperature Sensor"]', testDeviceName);

    // Add tags
    await page.fill('input[placeholder*="Enter tag"]', 'e2e-test');
    await page.press('input[placeholder*="Enter tag"]', 'Enter');
    await page.fill('input[placeholder*="Enter tag"]', 'automated');
    await page.press('input[placeholder*="Enter tag"]', 'Enter');

    // Submit form
    await page.click('button:has-text("Create Device")');

    // Wait for success toast
    await expect(page.locator('text=Device created successfully')).toBeVisible({ timeout: 10000 });

    // Verify device appears in list
    await expect(page.locator(`text=${testDeviceName}`)).toBeVisible();

    // Click on device to view details
    await page.click(`text=${testDeviceName}`);

    // Verify device detail page
    await expect(page).toHaveURL(/\/devices\/.+/);
    await expect(page.locator('h1')).toContainText(testDeviceName);

    // Go back to device list
    await page.goto('/devices');

    // Click edit button
    await page.locator(`tr:has-text("${testDeviceName}") button:has-text("Edit")`).click();

    // Wait for edit form
    await expect(page.locator('text=Edit Device')).toBeVisible();

    // Update device name
    const updatedName = `${testDeviceName} (Updated)`;
    await page.fill('input[placeholder*="Temperature Sensor"]', updatedName);

    // Submit update
    await page.click('button:has-text("Update Device")');

    // Wait for success toast
    await expect(page.locator('text=Device updated successfully')).toBeVisible({ timeout: 10000 });

    // Verify updated name appears
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();

    // Delete device
    await page.locator(`tr:has-text("${updatedName}") button:has-text("Delete")`).click();

    // Confirm deletion in browser dialog
    page.on('dialog', dialog => dialog.accept());

    // Wait for success toast
    await expect(page.locator('text=Device deleted successfully')).toBeVisible({ timeout: 10000 });

    // Verify device is removed from list
    await expect(page.locator(`text=${updatedName}`)).not.toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/devices');

    // Click "Add Device" button
    await page.click('button:has-text("Add Device")');

    // Wait for modal
    await expect(page.locator('text=Create New Device')).toBeVisible();

    // Try to submit empty form - HTML5 validation will prevent submission
    const nameInput = page.locator('input[placeholder*="Temperature Sensor"]');

    // Verify the input has required attribute
    await expect(nameInput).toHaveAttribute('required', '');

    // Click submit button
    await page.click('button:has-text("Create Device")');

    // Form should still be open (validation prevented submission)
    await expect(page.locator('text=Create New Device')).toBeVisible();

    // Verify input is focused (browser validation behavior)
    await expect(nameInput).toBeFocused();
  });
});
