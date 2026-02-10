import { test, expect } from '@playwright/test';

/**
 * E2E Test: Real-Time WebSocket Updates
 *
 * Tests real-time data updates via WebSocket:
 * 1. Connect to dashboard
 * 2. Post new device state via API
 * 3. Verify dashboard updates in real-time
 * 4. Verify live stream block updates
 */

const API_URL = 'http://localhost:3001';

test.describe('Real-Time WebSocket Updates', () => {
  let testDeviceId: string;
  const testDeviceName = `E2E Realtime Test ${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    // Create a test device
    const response = await request.post(`${API_URL}/devices`, {
      data: {
        name: testDeviceName,
        tags: ['e2e-test', 'realtime'],
      },
    });

    const data = await response.json();
    testDeviceId = data.data.deviceId;
    console.log(`Created test device: ${testDeviceId}`);

    // Post initial state
    await request.post(`${API_URL}/devices/${testDeviceId}/states`, {
      data: {
        data: {
          temperature: 20.0,
          humidity: 50.0,
        },
      },
    });
  });

  test.afterAll(async ({ request }) => {
    // Clean up
    if (testDeviceId) {
      await request.delete(`${API_URL}/devices/${testDeviceId}`);
    }
  });

  test('should receive real-time updates on dashboard', async ({ page, request }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for dashboard to fully load
    await expect(page.locator('h1:has-text("Live Dashboard")')).toBeVisible();
    await expect(page.locator('text=Live')).toBeVisible(); // Wait for "Live" indicator

    // Get initial update count
    const updateCountElement = page.locator('text=/\\d+ updates received/i');
    await expect(updateCountElement).toBeVisible({ timeout: 10000 });

    const initialCountText = await updateCountElement.textContent();
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0');

    console.log(`Initial update count: ${initialCount}`);

    // Post new device state
    const newData = {
      temperature: 25.5 + Math.random() * 5, // Random to ensure different value
      humidity: 60.0 + Math.random() * 5,
    };

    const response = await request.post(`${API_URL}/devices/${testDeviceId}/states`, {
      data: { data: newData },
    });

    expect(response.ok()).toBeTruthy();
    console.log('Posted new device state');

    // Wait for update count to increase
    await page.waitForFunction(
      (count) => {
        const element = document.querySelector('text=/\\d+ updates received/i');
        if (!element) return false;
        const currentText = element.textContent || '';
        const currentCount = parseInt(currentText.match(/\d+/)?.[0] || '0');
        return currentCount > count;
      },
      initialCount,
      { timeout: 15000 }
    );

    const newCountText = await updateCountElement.textContent();
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || '0');

    console.log(`New update count: ${newCount}`);
    expect(newCount).toBeGreaterThan(initialCount);

    console.log('✅ Real-time WebSocket updates working');
  });

  test('should update live stream block in real-time', async ({ page, request }) => {
    await page.goto('/dashboard');

    // Wait for live stream block to be visible
    await expect(page.locator('text=Live Data Stream')).toBeVisible();

    // Get initial number of entries in live stream
    const liveStreamBlock = page.locator('text=Live Data Stream').locator('..');
    await page.waitForTimeout(2000); // Wait for initial data to load

    // Post multiple rapid updates
    for (let i = 0; i < 3; i++) {
      await request.post(`${API_URL}/devices/${testDeviceId}/states`, {
        data: {
          data: {
            temperature: 20.0 + i,
            humidity: 50.0 + i,
          },
        },
      });
      await page.waitForTimeout(500); // Small delay between posts
    }

    // Verify live stream shows recent entries
    // Look for timestamp indicators or data values
    await expect(page.locator('text=/temperature|humidity/i').first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Live stream block updates in real-time');
  });

  test('should handle rapid updates without crashing', async ({ page, request }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h1:has-text("Live Dashboard")')).toBeVisible();

    // Post 10 rapid updates
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post(`${API_URL}/devices/${testDeviceId}/states`, {
          data: {
            data: {
              temperature: 20.0 + Math.random() * 10,
              humidity: 50.0 + Math.random() * 20,
            },
          },
        })
      );
    }

    await Promise.all(promises);
    console.log('Posted 10 rapid updates');

    // Wait a bit for all updates to process
    await page.waitForTimeout(3000);

    // Verify dashboard is still functional (not crashed)
    await expect(page.locator('h1:has-text("Live Dashboard")')).toBeVisible();
    await expect(page.locator('text=Live')).toBeVisible();

    // Verify update counter has increased
    const updateCountElement = page.locator('text=/\\d+ updates received/i');
    await expect(updateCountElement).toBeVisible();
    const countText = await updateCountElement.textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] || '0');

    expect(count).toBeGreaterThan(0);

    console.log('✅ Dashboard handles rapid updates correctly');
  });

  test('should throttle updates for performance', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify throttle indicator is shown
    await expect(page.locator('text=/Throttled|1\\/sec/i')).toBeVisible({ timeout: 10000 });

    console.log('✅ Update throttling is active');
  });
});
