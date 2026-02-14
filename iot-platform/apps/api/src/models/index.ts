export { Organization, type IOrganization } from './organization.model';
export { Device, type IDevice } from './device.model';
export { DeviceState, type IDeviceState, type QualityStatus, type IQualityMetadata } from './device-state.model';
export { User, type IUser, type UserRole } from './user.model';
export { ApiKey, type IApiKey, generateApiKey, hashApiKey, extractPrefix } from './api-key.model';
export { AuditLog, type IAuditLog } from './audit-log.model';
export { RetentionPolicy, type IRetentionPolicy, type RetentionTier, type DataCategory } from './retention-policy.model';
export { ValidationRule, type IValidationRule, type ValidationType, type SeverityLevel } from './validation-rule.model';
export { AlarmRule, type IAlarmRule, type AlarmPriority, type AlarmConditionType, type AlarmOperator } from './alarm-rule.model';
export { AlarmInstance, type IAlarmInstance, type AlarmState, type IAlarmStateTransition } from './alarm-instance.model';
export { ModbusGateway, type IModbusGateway, type ModbusProtocol, type ModbusRegisterType, type ModbusDataType, type IModbusRegisterMapping } from './modbus-gateway.model';
export { OpcuaGateway, type IOpcuaGateway, type OpcuaSecurityMode, type OpcuaSecurityPolicy, type OpcuaMonitoringMode, type IOpcuaNodeMapping } from './opcua-gateway.model';
export { WaterQualityParameter, type IWaterQualityParameter, type ParameterCategory, type RegulatoryStandard, type IComplianceLimit, type ISamplingRequirement } from './water-quality-parameter.model';

import mongoose from 'mongoose';

/**
 * Initialize Time Series Collections
 *
 * MongoDB Time Series Collections must be created explicitly before use.
 * This function ensures the collection exists with the correct configuration.
 */
export async function initializeTimeSeriesCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const collections = await db.listCollections({ name: 'device_states' }).toArray();

  if (collections.length === 0) {
    await db.createCollection('device_states', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds',
      },
      expireAfterSeconds: 7776000, // 90 days
    });
    console.log('✅ Time Series Collection "device_states" created');
  } else {
    console.log('ℹ️  Time Series Collection "device_states" already exists');
  }
}
