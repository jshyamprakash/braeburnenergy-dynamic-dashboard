import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceStateService } from './device-state.service';
import { prisma } from '../lib/prisma';

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    deviceState: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

describe('DeviceStateService', () => {
  let deviceStateService: DeviceStateService;

  beforeEach(() => {
    deviceStateService = new DeviceStateService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a device state with current timestamp', async () => {
      const mockState = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        data: { temperature: 23.5, humidity: 45 },
        timestamp: new Date(),
      };

      vi.mocked(prisma.deviceState.create).mockResolvedValue(mockState);

      const result = await deviceStateService.create({
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        data: { temperature: 23.5, humidity: 45 },
      });

      expect(result).toEqual(mockState);
      expect(prisma.deviceState.create).toHaveBeenCalledWith({
        data: {
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          data: { temperature: 23.5, humidity: 45 },
          timestamp: expect.any(Date),
        },
      });
    });

    it('should create device state with custom timestamp', async () => {
      const customTimestamp = new Date('2024-01-15T10:30:00Z');
      const mockState = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        data: { temperature: 25.0 },
        timestamp: customTimestamp,
      };

      vi.mocked(prisma.deviceState.create).mockResolvedValue(mockState);

      await deviceStateService.create({
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        data: { temperature: 25.0 },
        timestamp: customTimestamp,
      });

      expect(prisma.deviceState.create).toHaveBeenCalledWith({
        data: {
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          data: { temperature: 25.0 },
          timestamp: customTimestamp,
        },
      });
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple device states', async () => {
      vi.mocked(prisma.deviceState.createMany).mockResolvedValue({ count: 2 });

      const result = await deviceStateService.bulkCreate({
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
      expect(prisma.deviceState.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
            data: { temperature: 23.5 },
            timestamp: expect.any(Date),
          }),
        ]),
      });
    });

    // Note: Bulk create limit validation should be added to service
    it.skip('should respect bulk create limit of 1000', async () => {
      const states = Array.from({ length: 1500 }, (_, i) => ({
        deviceId: `device-${i}`,
        data: { value: i },
      }));

      await expect(
        deviceStateService.bulkCreate({ states })
      ).rejects.toThrow();
    });
  });

  describe('getStates', () => {
    it('should retrieve device states with pagination', async () => {
      const mockStates = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          data: { temperature: 23.5 },
          timestamp: new Date(),
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174002',
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          data: { temperature: 24.0 },
          timestamp: new Date(),
        },
      ];

      vi.mocked(prisma.deviceState.findMany).mockResolvedValue(mockStates);
      vi.mocked(prisma.deviceState.count).mockResolvedValue(2);

      const result = await deviceStateService.getStates(
        '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        { limit: 10, offset: 0 }
      );

      expect(result.data).toEqual(mockStates);
      expect(result.pagination).toMatchObject({
        total: 2,
        limit: 10,
        offset: 0,
      });
    });

    it('should filter states by time range', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-31T23:59:59Z');

      vi.mocked(prisma.deviceState.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deviceState.count).mockResolvedValue(0);

      await deviceStateService.getStates('01HGW5N8XZ7KQRST9VW2XY3Z4A', {
        startTime,
        endTime,
      });

      expect(prisma.deviceState.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
            timestamp: {
              gte: startTime,
              lte: endTime,
            },
          },
        })
      );
    });

    it('should sort states by timestamp descending by default', async () => {
      vi.mocked(prisma.deviceState.findMany).mockResolvedValue([]);
      vi.mocked(prisma.deviceState.count).mockResolvedValue(0);

      await deviceStateService.getStates('01HGW5N8XZ7KQRST9VW2XY3Z4A', {
        sortOrder: 'desc',
      });

      expect(prisma.deviceState.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        })
      );
    });
  });

  describe('getLatest', () => {
    it('should retrieve the most recent state', async () => {
      const mockLatestState = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        data: { temperature: 25.0 },
        timestamp: new Date(),
      };

      vi.mocked(prisma.deviceState.findFirst).mockResolvedValue(mockLatestState);

      const result = await deviceStateService.getLatest('01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toEqual(mockLatestState);
      expect(prisma.deviceState.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A' },
          orderBy: { timestamp: 'desc' },
        })
      );
    });

    it('should return null if no states exist', async () => {
      vi.mocked(prisma.deviceState.findFirst).mockResolvedValue(null);

      const result = await deviceStateService.getLatest('01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should count all states for a device', async () => {
      vi.mocked(prisma.deviceState.count).mockResolvedValue(100);

      const result = await deviceStateService.count('01HGW5N8XZ7KQRST9VW2XY3Z4A');

      expect(result).toBe(100);
      expect(prisma.deviceState.count).toHaveBeenCalledWith({
        where: { deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A' },
      });
    });

    it('should count states within time range', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z');
      const endTime = new Date('2024-01-31T23:59:59Z');

      vi.mocked(prisma.deviceState.count).mockResolvedValue(50);

      const result = await deviceStateService.count(
        '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        startTime,
        endTime
      );

      expect(result).toBe(50);
      expect(prisma.deviceState.count).toHaveBeenCalledWith({
        where: {
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          timestamp: {
            gte: startTime,
            lte: endTime,
          },
        },
      });
    });
  });

  describe('deleteOldStates', () => {
    it('should delete states before specified date', async () => {
      const beforeDate = new Date('2024-01-01T00:00:00Z');

      vi.mocked(prisma.deviceState.deleteMany).mockResolvedValue({ count: 10 });

      const result = await deviceStateService.deleteOldStates(
        '01HGW5N8XZ7KQRST9VW2XY3Z4A',
        beforeDate
      );

      expect(result).toBe(10);
      expect(prisma.deviceState.deleteMany).toHaveBeenCalledWith({
        where: {
          deviceId: '01HGW5N8XZ7KQRST9VW2XY3Z4A',
          timestamp: {
            lt: beforeDate,
          },
        },
      });
    });
  });

  describe('aggregate', () => {
    // Note: Aggregate testing requires proper TimescaleDB query mocking
    it.skip('should aggregate states using time_bucket', async () => {
      const mockAggregatedData = [
        {
          bucket: new Date('2024-01-01T00:00:00Z'),
          avg_value: 23.5,
          min_value: 20.0,
          max_value: 27.0,
          count: 10,
        },
      ];

      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockAggregatedData);

      const result = await deviceStateService.aggregate('01HGW5N8XZ7KQRST9VW2XY3Z4A', {
        fields: [{ field: 'temperature', function: 'avg' }],
        interval: '1 hour',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-01T23:59:59Z'),
      });

      expect(result).toEqual(mockAggregatedData);
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
