import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceStateService } from './device-state.service';

// Mock DeviceState model - use a constructor function to support `new DeviceState()`
const mockStateSave = vi.fn();

function MockDeviceState(data: any) {
  Object.assign(this, data);
  this.save = mockStateSave;
}
MockDeviceState.find = vi.fn();
MockDeviceState.findOne = vi.fn();
MockDeviceState.countDocuments = vi.fn();
MockDeviceState.deleteMany = vi.fn();
MockDeviceState.insertMany = vi.fn();
MockDeviceState.aggregate = vi.fn();

vi.mock('../models/device-state.model', () => ({
  DeviceState: MockDeviceState,
}));

// Mock mongoose - preserve real Types.ObjectId constructor
vi.mock('mongoose', async () => {
  const actual = await vi.importActual('mongoose') as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      Types: actual.default.Types,
    },
  };
});

import { DeviceState } from '../models/device-state.model';

const TEST_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

describe('DeviceStateService', () => {
  let deviceStateService: DeviceStateService;

  beforeEach(() => {
    deviceStateService = new DeviceStateService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a device state with current timestamp', async () => {
      const mockObj = {
        _id: '507f1f77bcf86cd799439011',
        timestamp: new Date(),
        metadata: {
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          orgId: { toString: () => TEST_ORG_ID },
        },
        data: { temperature: 23.5, humidity: 45 },
      };

      mockStateSave.mockResolvedValue({ toObject: () => mockObj });

      const result = await deviceStateService.create(TEST_ORG_ID, {
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        data: { temperature: 23.5, humidity: 45 },
      });

      expect(result.deviceId).toBe('01HGW5N8XZ7KQRST9VW2XY3Z4A');
      expect(result.data).toEqual({ temperature: 23.5, humidity: 45 });
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple device states', async () => {
      vi.mocked(DeviceState.insertMany).mockResolvedValue([{}, {}] as any);

      const result = await deviceStateService.bulkCreate(TEST_ORG_ID, {
        states: [
          {
            deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
            data: { temperature: 23.5 },
          },
          {
            deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4B',
            data: { pressure: 1013.25 },
          },
        ],
      });

      expect(result.count).toBe(2);
      expect(DeviceState.insertMany).toHaveBeenCalled();
    });
  });

  describe('getStates', () => {
    it('should retrieve device states with pagination', async () => {
      const mockStates = [
        {
          _id: '1',
          metadata: { deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A' },
          data: { temperature: 23.5 },
          timestamp: new Date(),
        },
        {
          _id: '2',
          metadata: { deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A' },
          data: { temperature: 24.0 },
          timestamp: new Date(),
        },
      ];

      vi.mocked(DeviceState.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockStates),
            }),
          }),
        }),
      } as any);
      vi.mocked(DeviceState.countDocuments).mockResolvedValue(2);

      const result = await deviceStateService.getStates(
        TEST_ORG_ID,
        '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        { limit: 10, offset: 0 }
      );

      expect(result.data).toHaveLength(2);
      expect(result.data[0].deviceId).toBe('01HGW5N8XZ7KQRST9VW2XY3Z4A');
      expect(result.pagination).toMatchObject({
        total: 2,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getLatest', () => {
    it('should retrieve the most recent state', async () => {
      const mockState = {
        _id: '507f1f77bcf86cd799439011',
        metadata: { deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A' },
        data: { temperature: 25.0 },
        timestamp: new Date(),
      };

      vi.mocked(DeviceState.findOne).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockState),
        }),
      } as any);

      const result = await deviceStateService.getLatest('01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).not.toBeNull();
      expect(result!.deviceId).toBe('01HGW5N8XZ7KQRST9VW2XY3Z4A');
      expect(result!.data).toEqual({ temperature: 25.0 });
    });

    it('should return null if no states exist', async () => {
      vi.mocked(DeviceState.findOne).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      } as any);

      const result = await deviceStateService.getLatest('01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should count all states for a device', async () => {
      vi.mocked(DeviceState.countDocuments).mockResolvedValue(100);

      const result = await deviceStateService.count('01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toBe(100);
    });

    it('should count states within time range', async () => {
      vi.mocked(DeviceState.countDocuments).mockResolvedValue(50);

      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-31T23:59:59Z');

      const result = await deviceStateService.count(
        '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        startTime,
        endTime
      );

      expect(result).toBe(50);
    });
  });

  describe('deleteOldStates', () => {
    it('should delete states before specified date', async () => {
      vi.mocked(DeviceState.deleteMany).mockResolvedValue({ deletedCount: 10 } as any);

      const beforeDate = new Date('2024-01-01T00:00:00Z');
      const result = await deviceStateService.deleteOldStates(
        '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        beforeDate
      );

      expect(result).toBe(10);
      expect(DeviceState.deleteMany).toHaveBeenCalled();
    });
  });

  describe('aggregate', () => {
    it('should aggregate states using MongoDB pipeline', async () => {
      const mockAggregatedData = [
        {
          _id: new Date('2024-01-01T00:00:00Z'),
          temperature_avg: 23.5,
          temperature_min: 20.0,
          temperature_max: 27.0,
        },
      ];

      vi.mocked(DeviceState.aggregate).mockResolvedValue(mockAggregatedData);

      const result = await deviceStateService.aggregate('01HGW5N8XZ7KQRST9VW2XY3Z4A', {
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T23:59:59Z'),
        bucket: '1h',
        fields: ['temperature'],
        functions: ['avg', 'min', 'max'],
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].values).toMatchObject({
        temperature_avg: 23.5,
        temperature_min: 20.0,
        temperature_max: 27.0,
      });
      expect(DeviceState.aggregate).toHaveBeenCalled();
    });
  });
});
