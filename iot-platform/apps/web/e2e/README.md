# E2E Tests

End-to-end tests for the IoT Platform POC, covering critical user flows using Playwright.

## Test Coverage

### 1. Device Management (`01-device-management.spec.ts`)
- ✅ Create a new device
- ✅ View device in list
- ✅ View device details
- ✅ Update device information
- ✅ Delete device
- ✅ Form validation

### 2. Data Visualization (`02-data-visualization.spec.ts`)
- ✅ Create device via API
- ✅ Post device state data via API
- ✅ View data on dashboard
- ✅ Display time-series charts
- ✅ Verify data in device list

### 3. Dashboard Builder (`03-dashboard-builder.spec.ts`)
- ✅ Enter/exit edit mode
- ✅ Add blocks from palette (Gauge, Chart, Live Stream)
- ✅ Configure block properties
- ✅ Remove blocks
- ✅ Save layout to localStorage
- ✅ Restore layout after reload

### 4. Real-Time Updates (`04-realtime-updates.spec.ts`)
- ✅ WebSocket connection
- ✅ Real-time dashboard updates
- ✅ Live stream block updates
- ✅ Handle rapid updates without crashing
- ✅ Update throttling (1/sec)

## Prerequisites

1. **Backend API** must be running on `http://localhost:3001`
2. **Frontend** must be running on `http://localhost:3000`
3. **Database** (PostgreSQL + TimescaleDB) must be accessible

## Running Tests

### Run all tests (headless)
```bash
cd apps/web
pnpm test:e2e
```

### Run tests with UI (interactive mode)
```bash
pnpm test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
pnpm test:e2e:headed
```

### Debug tests
```bash
pnpm test:e2e:debug
```

### View test report
```bash
pnpm test:e2e:report
```

### Run specific test file
```bash
pnpm test:e2e e2e/01-device-management.spec.ts
```

### Run specific test
```bash
pnpm test:e2e -g "should create, view, update, and delete a device"
```

## Test Structure

```
e2e/
├── 01-device-management.spec.ts    # Device CRUD operations
├── 02-data-visualization.spec.ts   # Data ingestion & charts
├── 03-dashboard-builder.spec.ts    # Dashboard builder workflow
├── 04-realtime-updates.spec.ts     # WebSocket real-time updates
└── README.md                        # This file
```

## Configuration

Test configuration is in `playwright.config.ts`:
- **Base URL:** `http://localhost:3000`
- **Browsers:** Chromium (Desktop Chrome)
- **Parallel execution:** Enabled
- **Retries:** 2 on CI, 0 locally
- **Reporters:** HTML + List
- **Screenshots:** On failure
- **Videos:** On failure
- **Trace:** On first retry

## Web Servers

The tests automatically start both backend and frontend servers:
1. **Backend API:** `cd ../api && pnpm dev` → `http://localhost:3001`
2. **Frontend:** `pnpm dev` → `http://localhost:3000`

If servers are already running, Playwright will reuse them.

## CI/CD Integration

For GitHub Actions or other CI pipelines:

```yaml
- name: Install dependencies
  run: pnpm install

- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps chromium

- name: Run E2E tests
  run: pnpm test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests fail with "Timeout waiting for server"
- Ensure PostgreSQL is running
- Check backend API starts successfully: `cd apps/api && pnpm dev`
- Check frontend starts successfully: `cd apps/web && pnpm dev`

### Tests fail with database errors
- Run migrations: `cd apps/api && pnpm prisma migrate deploy`
- Clear test data: Restart PostgreSQL or truncate tables

### WebSocket tests fail
- Ensure WebSocket server is running (part of backend API)
- Check firewall/network settings
- Verify Socket.io version compatibility

### Browser not found
- Run: `pnpm exec playwright install chromium`

### Tests are flaky
- Increase timeouts in individual tests
- Add explicit waits for async operations
- Check for race conditions in WebSocket tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Use `beforeAll` / `afterAll` to create/delete test data
3. **Explicit Waits**: Use `await expect(...).toBeVisible()` instead of `waitForTimeout`
4. **Stable Selectors**: Use text content or aria-labels instead of CSS classes
5. **Debug Mode**: Use `--debug` flag to step through tests interactively

## Example Test Run Output

```
Running 12 tests using 1 worker

  ✓  01-device-management.spec.ts:17:3 › Device Management › should create, view, update, and delete a device (8s)
  ✓  01-device-management.spec.ts:73:3 › Device Management › should show validation errors (2s)
  ✓  02-data-visualization.spec.ts:43:3 › Data Visualization › should ingest data and display (5s)
  ✓  02-data-visualization.spec.ts:71:3 › Data Visualization › should display in time-series charts (4s)
  ✓  02-data-visualization.spec.ts:98:3 › Data Visualization › should show device in devices list (3s)
  ✓  03-dashboard-builder.spec.ts:23:3 › Dashboard Builder › should add and configure gauge block (6s)
  ✓  03-dashboard-builder.spec.ts:52:3 › Dashboard Builder › should add chart and live stream blocks (4s)
  ✓  03-dashboard-builder.spec.ts:69:3 › Dashboard Builder › should save and restore layout (5s)
  ✓  03-dashboard-builder.spec.ts:88:3 › Dashboard Builder › should remove blocks (3s)
  ✓  03-dashboard-builder.spec.ts:100:3 › Dashboard Builder › should exit edit mode (2s)
  ✓  04-realtime-updates.spec.ts:40:3 › Real-Time Updates › should receive real-time updates (10s)
  ✓  04-realtime-updates.spec.ts:78:3 › Real-Time Updates › should update live stream block (8s)

  12 passed (1m 0s)
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)
