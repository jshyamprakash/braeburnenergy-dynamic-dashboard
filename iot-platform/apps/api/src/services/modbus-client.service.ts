import ModbusRTU from 'modbus-serial';
import { IModbusConnection, IModbusRegister } from '../models/modbus-gateway.model';

/**
 * ModbusClient Service
 *
 * Low-level Modbus client for connecting to devices and reading/writing registers.
 * Supports both Modbus TCP and Modbus RTU protocols.
 */

export class ModbusClientService {
  private client: ModbusRTU;
  private connected: boolean = false;
  private connectionConfig: IModbusConnection | null = null;

  constructor() {
    this.client = new ModbusRTU();
  }

  /**
   * Connect to Modbus device
   */
  async connect(config: IModbusConnection): Promise<void> {
    try {
      this.connectionConfig = config;

      if (config.host.startsWith('/dev/') || config.host.startsWith('COM')) {
        // Modbus RTU (Serial)
        await this.client.connectRTUBuffered(config.host, {
          baudRate: config.baudRate || 9600,
          dataBits: config.dataBits || 8,
          stopBits: config.stopBits || 1,
          parity: config.parity || 'none',
        });
      } else {
        // Modbus TCP
        await this.client.connectTCP(config.host, { port: config.port });
      }

      this.client.setID(config.unitId);
      this.client.setTimeout(config.timeout);
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to Modbus device: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect from Modbus device
   */
  async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      this.client.close(() => {
        this.connected = false;
        this.connectionConfig = null;
      });
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected && this.client.isOpen;
  }

  /**
   * Read holding registers (FC3)
   * Used for: Read/Write registers (configuration, setpoints, etc.)
   */
  async readHoldingRegisters(address: number, length: number): Promise<number[]> {
    this.ensureConnected();
    try {
      const result = await this.client.readHoldingRegisters(address, length);
      return result.data;
    } catch (error) {
      throw new Error(`Failed to read holding registers at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Read input registers (FC4)
   * Used for: Read-only registers (sensor readings, status values)
   */
  async readInputRegisters(address: number, length: number): Promise<number[]> {
    this.ensureConnected();
    try {
      const result = await this.client.readInputRegisters(address, length);
      return result.data;
    } catch (error) {
      throw new Error(`Failed to read input registers at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Read coils (FC1)
   * Used for: Read/Write single-bit values (on/off states)
   */
  async readCoils(address: number, length: number): Promise<boolean[]> {
    this.ensureConnected();
    try {
      const result = await this.client.readCoils(address, length);
      return result.data;
    } catch (error) {
      throw new Error(`Failed to read coils at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Read discrete inputs (FC2)
   * Used for: Read-only single-bit values (switch states, limit switches)
   */
  async readDiscreteInputs(address: number, length: number): Promise<boolean[]> {
    this.ensureConnected();
    try {
      const result = await this.client.readDiscreteInputs(address, length);
      return result.data;
    } catch (error) {
      throw new Error(`Failed to read discrete inputs at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Write single coil (FC5)
   */
  async writeCoil(address: number, value: boolean): Promise<void> {
    this.ensureConnected();
    try {
      await this.client.writeCoil(address, value);
    } catch (error) {
      throw new Error(`Failed to write coil at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Write single register (FC6)
   */
  async writeRegister(address: number, value: number): Promise<void> {
    this.ensureConnected();
    try {
      await this.client.writeRegister(address, value);
    } catch (error) {
      throw new Error(`Failed to write register at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Write multiple registers (FC16)
   */
  async writeRegisters(address: number, values: number[]): Promise<void> {
    this.ensureConnected();
    try {
      await this.client.writeRegisters(address, values);
    } catch (error) {
      throw new Error(`Failed to write registers at ${address}: ${(error as Error).message}`);
    }
  }

  /**
   * Read register and convert to typed value
   */
  async readRegister(register: IModbusRegister): Promise<number | boolean> {
    let rawData: number[] | boolean[];

    // Read based on register type
    switch (register.type) {
      case 'holding':
        rawData = await this.readHoldingRegisters(register.address, this.getRegisterLength(register.dataType));
        break;
      case 'input':
        rawData = await this.readInputRegisters(register.address, this.getRegisterLength(register.dataType));
        break;
      case 'coil':
        rawData = await this.readCoils(register.address, 1);
        return rawData[0]; // Return boolean directly
      case 'discrete':
        rawData = await this.readDiscreteInputs(register.address, 1);
        return rawData[0]; // Return boolean directly
      default:
        throw new Error(`Unknown register type: ${register.type}`);
    }

    // Convert raw data to typed value
    const value = this.convertRawData(rawData as number[], register.dataType);

    // Apply scale and offset
    let finalValue = value;
    if (register.scale !== undefined) {
      finalValue *= register.scale;
    }
    if (register.offset !== undefined) {
      finalValue += register.offset;
    }

    return finalValue;
  }

  /**
   * Get number of registers needed for data type
   */
  private getRegisterLength(dataType: string): number {
    switch (dataType) {
      case 'int16':
      case 'uint16':
      case 'boolean':
        return 1;
      case 'int32':
      case 'uint32':
      case 'float':
        return 2;
      default:
        return 1;
    }
  }

  /**
   * Convert raw register data to typed value
   */
  private convertRawData(data: number[], dataType: string): number {
    switch (dataType) {
      case 'int16':
        return this.toInt16(data[0]);
      case 'uint16':
        return data[0];
      case 'int32':
        return this.toInt32(data);
      case 'uint32':
        return this.toUInt32(data);
      case 'float':
        return this.toFloat(data);
      case 'boolean':
        return data[0] ? 1 : 0;
      default:
        return data[0];
    }
  }

  /**
   * Convert uint16 to int16 (signed)
   */
  private toInt16(value: number): number {
    return value > 32767 ? value - 65536 : value;
  }

  /**
   * Convert two uint16 to int32 (signed)
   */
  private toInt32(data: number[]): number {
    const value = (data[0] << 16) | data[1];
    return value > 2147483647 ? value - 4294967296 : value;
  }

  /**
   * Convert two uint16 to uint32
   */
  private toUInt32(data: number[]): number {
    return (data[0] << 16) | data[1];
  }

  /**
   * Convert two uint16 to IEEE 754 float
   */
  private toFloat(data: number[]): number {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(data[0], 0);
    buffer.writeUInt16BE(data[1], 2);
    return buffer.readFloatBE(0);
  }

  /**
   * Ensure client is connected before operations
   */
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Modbus client is not connected');
    }
  }

  /**
   * Get connection configuration
   */
  getConnectionConfig(): IModbusConnection | null {
    return this.connectionConfig;
  }
}

export default ModbusClientService;
