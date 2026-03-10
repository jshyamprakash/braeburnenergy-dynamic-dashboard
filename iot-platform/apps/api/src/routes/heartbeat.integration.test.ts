import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeartbeatService } from '../services/heartbeat.service';

/**
 * HeartbeatService Integration Tests (ADR-041)
 *
 * Tests device offline detection, alarm creation, and workflow dispatch.
 * Uses Mongoose model mocks to avoid needing a live MongoDB instance.
 */

// Mock Mongoose models
const mockDeviceFind = vi.fn();
vi.mock('../models/device.model', () => ({
  Device: {
    find: (...args: any[]) => ({
      lean: () => mockDeviceFind(...args),
    }),
    updateOne: vi.fn(),
  },
}));

const mockAlarmRuleFindOne = vi.fn();
const mockAlarmRuleCreate = vi.fn();
const mockAlarmInstanceFindOne = vi.fn();
const mockAlarmInstanceCreate = vi.fn();

vi.mock('../models', () => ({
  AlarmRule: {
    findOne: (...args: any[]) => ({ lean: () => mockAlarmRuleFindOne(...args) }),
    create: (...args: any[]) => mockAlarmRuleCreate(...args),
  },
  AlarmInstance: {
    findOne: (...args: any[]) => ({ lean: () => mockAlarmInstanceFindOne(...args) }),
    create: (...args: any[]) => mockAlarmInstanceCreate(...args),
  },
}));

vi.mock('../lib/request-context', () => ({
  DEFAULT_ORG_ID: 'aaaaaaaaaaaaaaaaaaaaaaaa',
}));


const makeDevice = (overrides: any = {}) => ({
  orgId: { toString: () => 'aaaaaaaaaaaaaaaaaaaaaaaa' },
  deviceId: 'device-001',
  lastSeenAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
  createdAt: new Date(Date.now() - 60 * 60 * 1000),
  ...overrides,
});

describe('HeartbeatService', () => {
  let service: HeartbeatService;
  let mockDispatcher: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeviceFind.mockReset();
    mockAlarmRuleFindOne.mockReset();
    mockAlarmRuleCreate.mockReset();
    mockAlarmInstanceFindOne.mockReset();
    mockAlarmInstanceCreate.mockReset();

    mockDispatcher = {
      dispatchDeviceOffline: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    service = new HeartbeatService();
    service.setTriggerDispatcher(mockDispatcher, mockLogger as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('_checkOfflineDevices', () => {
    it('should not dispatch when no stale devices found', async () => {
      mockDeviceFind.mockResolvedValue([]);

      await service._checkOfflineDevices();

      expect(mockDispatcher.dispatchDeviceOffline).not.toHaveBeenCalled();
    });

    it('should dispatch deviceOffline for each stale device', async () => {
      const device = makeDevice();
      mockDeviceFind.mockResolvedValue([device]);
      mockAlarmInstanceFindOne.mockResolvedValue({ _id: 'existing' }); // existing alarm — skip creation

      await service._checkOfflineDevices();

      expect(mockDispatcher.dispatchDeviceOffline).toHaveBeenCalledOnce();
      expect(mockDispatcher.dispatchDeviceOffline).toHaveBeenCalledWith(
        'aaaaaaaaaaaaaaaaaaaaaaaa',
        'device-001',
        expect.any(Number)
      );
    });

    it('should compute offlineSinceMs from lastSeenAt when present', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const device = makeDevice({ lastSeenAt: tenMinutesAgo });
      mockDeviceFind.mockResolvedValue([device]);
      mockAlarmInstanceFindOne.mockResolvedValue({ _id: 'existing' });

      await service._checkOfflineDevices();

      const [, , offlineSinceMs] = mockDispatcher.dispatchDeviceOffline.mock.calls[0];
      expect(offlineSinceMs).toBeGreaterThanOrEqual(9 * 60 * 1000);
      expect(offlineSinceMs).toBeLessThanOrEqual(11 * 60 * 1000);
    });

    it('should skip alarm creation when active offline alarm already exists', async () => {
      const device = makeDevice();
      mockDeviceFind.mockResolvedValue([device]);
      mockAlarmInstanceFindOne.mockResolvedValue({ _id: 'existing-alarm', state: 'ACTIVE_UNACKED' });

      await service._checkOfflineDevices();

      expect(mockAlarmInstanceCreate).not.toHaveBeenCalled();
    });

    it('should create alarm instance using existing rule if found', async () => {
      const device = makeDevice();
      mockDeviceFind.mockResolvedValue([device]);
      mockAlarmInstanceFindOne.mockResolvedValue(null); // No existing alarm
      mockAlarmRuleFindOne.mockResolvedValue({ _id: 'rule-001' });
      mockAlarmInstanceCreate.mockResolvedValue({});

      await service._checkOfflineDevices();

      expect(mockAlarmRuleCreate).not.toHaveBeenCalled(); // Should not create new rule
      expect(mockAlarmInstanceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmRuleId: 'rule-001',
          tagName: 'device_offline',
          deviceId: 'device-001',
          state: 'ACTIVE_UNACKED',
          priority: 'HIGH',
        })
      );
    });

    it('should create alarm rule when none exists', async () => {
      const device = makeDevice();
      mockDeviceFind.mockResolvedValue([device]);
      mockAlarmInstanceFindOne.mockResolvedValue(null);
      mockAlarmRuleFindOne.mockResolvedValue(null); // No rule
      mockAlarmRuleCreate.mockResolvedValue({ _id: 'new-rule-id' });
      mockAlarmInstanceCreate.mockResolvedValue({});

      await service._checkOfflineDevices();

      expect(mockAlarmRuleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          tagName: 'device_offline',
          name: 'Device Offline',
          priority: 'HIGH',
          requiresAcknowledgment: true,
        })
      );
      expect(mockAlarmInstanceCreate).toHaveBeenCalledWith(
        expect.objectContaining({ alarmRuleId: 'new-rule-id' })
      );
    });

    it('should handle multiple stale devices independently', async () => {
      const devices = [
        makeDevice({ deviceId: 'dev-001' }),
        makeDevice({ deviceId: 'dev-002' }),
        makeDevice({ deviceId: 'dev-003' }),
      ];
      mockDeviceFind.mockResolvedValue(devices);
      mockAlarmInstanceFindOne.mockResolvedValue({ _id: 'existing' });

      await service._checkOfflineDevices();

      expect(mockDispatcher.dispatchDeviceOffline).toHaveBeenCalledTimes(3);
    });

    it('should not throw if dispatcher is not set', async () => {
      const serviceWithoutDispatcher = new HeartbeatService();
      (serviceWithoutDispatcher as any).logger = mockLogger;

      const device = makeDevice();
      mockDeviceFind.mockResolvedValue([device]);
      mockAlarmInstanceFindOne.mockResolvedValue({ _id: 'existing' });

      await expect(serviceWithoutDispatcher._checkOfflineDevices()).resolves.not.toThrow();
    });
  });
});
