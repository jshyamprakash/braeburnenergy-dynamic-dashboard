import { FastifyRequest, FastifyReply } from 'fastify';
import { ModbusGateway } from '../models/modbus-gateway.model';
import { modbusGatewayManager } from '../services/modbus-gateway-manager.service';
import mongoose from 'mongoose';

// Default organization ID for POC (multi-tenancy frontend not implemented)
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * Create new Modbus gateway
 */
export async function createGateway(
  request: FastifyRequest<{
    Body: {
      name: string;
      description?: string;
      protocol: 'tcp' | 'rtu';
      connection: any;
      polling: any;
      registers: any[];
      deviceMapping: any;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const gateway = await ModbusGateway.create({
      orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID),
      ...request.body,
    });

    return reply.code(201).send({
      success: true,
      data: gateway.toObject(),
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * List all gateways
 */
export async function listGateways(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      protocol?: string;
      status?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '10');
    const skip = (page - 1) * limit;

    const filter: any = { orgId: new mongoose.Types.ObjectId(DEFAULT_ORG_ID) };
    if (request.query.protocol) {
      filter.protocol = request.query.protocol;
    }
    if (request.query.status) {
      filter.status = request.query.status;
    }

    const [gateways, total] = await Promise.all([
      ModbusGateway.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ModbusGateway.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: gateways,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Get gateway by ID
 */
export async function getGateway(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const gateway = await ModbusGateway.findById(request.params.id);
    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    // Add runtime status
    const status = modbusGatewayManager.getGatewayStatus(gateway._id.toString());

    return reply.send({
      success: true,
      data: {
        ...gateway.toObject(),
        runtime: status,
      },
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Update gateway
 */
export async function updateGateway(
  request: FastifyRequest<{
    Params: { id: string };
    Body: Partial<any>;
  }>,
  reply: FastifyReply
) {
  try {
    const gateway = await ModbusGateway.findByIdAndUpdate(
      request.params.id,
      request.body,
      { new: true, runValidators: true }
    );

    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    // Restart if currently running
    const status = modbusGatewayManager.getGatewayStatus(gateway._id.toString());
    if (status.running) {
      await modbusGatewayManager.stopGateway(gateway._id.toString());
      await modbusGatewayManager.startGateway(gateway._id.toString());
    }

    return reply.send({
      success: true,
      data: gateway.toObject(),
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Delete gateway
 */
export async function deleteGateway(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    // Stop if running
    const status = modbusGatewayManager.getGatewayStatus(request.params.id);
    if (status.running) {
      await modbusGatewayManager.stopGateway(request.params.id);
    }

    const gateway = await ModbusGateway.findByIdAndDelete(request.params.id);
    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    return reply.send({
      success: true,
      message: 'Gateway deleted',
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Start gateway (connect and begin polling)
 */
export async function startGateway(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await modbusGatewayManager.startGateway(request.params.id);

    return reply.send({
      success: true,
      message: 'Gateway started',
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Stop gateway (disconnect and stop polling)
 */
export async function stopGateway(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    await modbusGatewayManager.stopGateway(request.params.id);

    return reply.send({
      success: true,
      message: 'Gateway stopped',
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Test gateway connection
 */
export async function testConnection(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const result = await modbusGatewayManager.testConnection(request.params.id);

    return reply.send({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Get gateway status
 */
export async function getStatus(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  try {
    const status = modbusGatewayManager.getGatewayStatus(request.params.id);

    return reply.send({
      success: true,
      data: status,
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * Read single register manually
 */
export async function readRegister(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { registerName: string };
  }>,
  reply: FastifyReply
) {
  try {
    const value = await modbusGatewayManager.readRegister(
      request.params.id,
      request.body.registerName
    );

    return reply.send({
      success: true,
      data: {
        registerName: request.body.registerName,
        value,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: (error as Error).message,
    });
  }
}
