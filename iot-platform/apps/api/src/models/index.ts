export { Organization, type IOrganization } from './organization.model';
export { Application, type IApplication } from './application.model';
export { Device, type IDevice } from './device.model';
export { DeviceState, type IDeviceState, type QualityStatus, type IQualityMetadata } from './device-state.model';
export { DeviceDerivedState, type IDeviceDerivedState } from './device-derived-state.model';
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
export { Notification, type INotification, type NotificationSeverity, type NotificationSource } from './notification.model';
export { SystemConfig, type ISystemConfig } from './system-config.model';

import mongoose from 'mongoose';

/**
 * Initialize Collections (ADR-031)
 *
 * device_states is a MongoDB time series collection (append-only, TTL 5yr).
 * device_derived_states is a regular collection (unique on deviceId, workflow outputs).
 * Mongoose handles time series collection creation via schema options on first document save.
 */
export async function initializeTimeSeriesCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  if (!names.includes('device_states')) {
    await db.createCollection('device_states', {
      timeseries: {
        timeField: 'timestamp',
        metaField: 'metadata',
        granularity: 'seconds',
      },
      expireAfterSeconds: 157680000, // 5 years - EPA compliance
    });
    console.log('✅ device_states time series collection created');
  } else {
    console.log('ℹ️  device_states collection already exists');
  }

  if (!names.includes('device_derived_states')) {
    console.log('ℹ️  device_derived_states collection will be created on first document save');
  } else {
    console.log('ℹ️  device_derived_states collection already exists');
  }
}
