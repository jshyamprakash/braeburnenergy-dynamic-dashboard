import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceService } from './device.service';

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

// Mock Device model - use a constructor function to support `new Device()`
const mockSaveResult = { toObject: vi.fn() };
const mockSave = vi.fn().mockResolvedValue(mockSaveResult);

function MockDevice(data: any) {
  Object.assign(this, data);
  this.save = mockSave;
}
MockDevice.findOne = vi.fn();
MockDevice.findById = vi.fn();
MockDevice.find = vi.fn();
MockDevice.findOneAndUpdate = vi.fn();
MockDevice.findOneAndDelete = vi.fn();
MockDevice.countDocuments = vi.fn();
MockDevice.insertMany = vi.fn();
MockDevice.create = vi.fn();

vi.mock('../models/device.model', () => ({
  Device: MockDevice,
}));

// Mock ULID
vi.mock('ulid', () => ({
  ulid: vi.fn(() => '01HGW5N8XZ7KQRST9VW2XY3Z4A'),
}));

import { Device } from '../models/device.model';

const TEST_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(() => {
    deviceService = new DeviceService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a device with generated ULID', async () => {
      const mockResult = {
        _id: '507f1f77bcf86cd799439011',
        orgId: TEST_ORG_ID,
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        name: 'Temperature Sensor',
        tags: ['warehouse', 'floor-1'],
        attributes: { location: 'Zone A' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSave.mockResolvedValue({ toObject: () => mockResult });

      const result = await deviceService.create(TEST_ORG_ID, {
        name: 'Temperature Sensor',
        tags: ['warehouse', 'floor-1'],
        attributes: { location: 'Zone A' },
      });

      expect(result).toEqual(mockResult);
    });
  });

  describe('getByDeviceId', () => {
    it('should find device by deviceId', async () => {
      const mockResult = {
        _id: '507f1f77bcf86cd799439011',
        orgId: TEST_ORG_ID,
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        name: 'Temperature Sensor',
        tags: ['warehouse'],
        attributes: null,
      };

      vi.mocked(Device.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockResult),
      } as any);

      const result = await deviceService.getByDeviceId(TEST_ORG_ID, '01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toEqual(mockResult);
      expect(Device.findOne).toHaveBeenCalled();
    });

    it('should return null if device not found', async () => {
      vi.mocked(Device.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as any);

      const result = await deviceService.getByDeviceId(TEST_ORG_ID, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update device by deviceId', async () => {
      const mockUpdatedDevice = {
        _id: '507f1f77bcf86cd799439011',
        orgId: TEST_ORG_ID,
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        name: 'Updated Sensor',
        tags: ['new-tag'],
        attributes: { updated: true },
      };

      vi.mocked(Device.findOneAndUpdate).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockUpdatedDevice),
      } as any);

      const result = await deviceService.update(TEST_ORG_ID, '01HGW5N8XZ7KQRST9VW2XY3Z4A', {
        name: 'Updated Sensor',
        tags: ['new-tag'],
        attributes: { updated: true },
      });

      expect(result).toEqual(mockUpdatedDevice);
      expect(Device.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete device by deviceId', async () => {
      const mockDevice = {
        _id: '507f1f77bcf86cd799439011',
        orgId: TEST_ORG_ID,
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        name: 'Temperature Sensor',
        tags: [],
        attributes: null,
      };

      vi.mocked(Device.findOneAndDelete).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockDevice),
      } as any);

      const result = await deviceService.delete(TEST_ORG_ID, '01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toEqual(mockDevice);
      expect(Device.findOneAndDelete).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should list all devices with pagination', async () => {
      const mockDevices = [
        { _id: '1', deviceId: '01A', name: 'Device 1', tags: [] },
        { _id: '2', deviceId: '01B', name: 'Device 2', tags: [] },
      ];

      vi.mocked(Device.find).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(mockDevices),
            }),
          }),
        }),
      } as any);
      vi.mocked(Device.countDocuments).mockResolvedValue(2);

      const result = await deviceService.list(TEST_ORG_ID, { limit: 10, offset: 0 });

      expect(result.data).toEqual(mockDevices);
      expect(result.pagination).toMatchObject({
        total: 2,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('exists', () => {
    it('should return true if device exists', async () => {
      vi.mocked(Device.countDocuments).mockResolvedValue(1);

      const result = await deviceService.exists(TEST_ORG_ID, '01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toBe(true);
    });

    it('should return false if device does not exist', async () => {
      vi.mocked(Device.countDocuments).mockResolvedValue(0);

      const result = await deviceService.exists(TEST_ORG_ID, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all devices', async () => {
      vi.mocked(Device.countDocuments).mockResolvedValue(42);

      const result = await deviceService.count(TEST_ORG_ID);

      expect(result).toBe(42);
    });

    it('should count devices filtered by tags', async () => {
      vi.mocked(Device.countDocuments).mockResolvedValue(5);

      const result = await deviceService.count(TEST_ORG_ID, ['sensor']);

      expect(result).toBe(5);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple devices', async () => {
      vi.mocked(Device.insertMany).mockResolvedValue([{}, {}, {}] as any);

      const devices = [
        { name: 'Device 1' },
        { name: 'Device 2' },
        { name: 'Device 3' },
      ];

      const result = await deviceService.bulkCreate(TEST_ORG_ID, devices);

      expect(result.count).toBe(3);
      expect(Device.insertMany).toHaveBeenCalled();
    });
  });
});
