import { FastifyRequest, FastifyReply } from 'fastify';
import { WaterQualityService } from '../services/water-quality.service';
import type { IWaterQualityParameter } from '../models/water-quality-parameter.model';

/**
 * WaterQualityController
 *
 * HTTP handlers for EPA/AWWA water quality parameter management and validation.
 */

const waterQualityService = new WaterQualityService();

// ============================================================================
// Parameter Management
// ============================================================================

/**
 * POST /water-quality/parameters
 * Create water quality parameter
 */
export async function createParameter(
  request: FastifyRequest<{
    Body: Partial<IWaterQualityParameter>;
  }>,
  reply: FastifyReply
) {
  try {
    const parameter = await waterQualityService.createParameter(request.body);

    return reply.code(201).send({
      success: true,
      data: parameter,
      message: 'Water quality parameter created successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /water-quality/parameters
 * List water quality parameters
 */
export async function listParameters(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      isRegulated?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { category, isRegulated } = request.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (isRegulated !== undefined) filter.isRegulated = isRegulated === 'true';

    const parameters = await waterQualityService.listParameters(filter);

    return reply.send({
      success: true,
      data: parameters,
      count: parameters.length,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /water-quality/parameters/:code
 * Get parameter by code
 */
export async function getParameter(
  request: FastifyRequest<{
    Params: {
      code: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const parameter = await waterQualityService.getParameterByCode(request.params.code);

    if (!parameter) {
      return reply.code(404).send({
        success: false,
        error: 'Parameter not found',
      });
    }

    return reply.send({
      success: true,
      data: parameter,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * PATCH /water-quality/parameters/:code
 * Update parameter
 */
export async function updateParameter(
  request: FastifyRequest<{
    Params: {
      code: string;
    };
    Body: Partial<IWaterQualityParameter>;
  }>,
  reply: FastifyReply
) {
  try {
    const parameter = await waterQualityService.updateParameter(
      request.params.code,
      request.body
    );

    if (!parameter) {
      return reply.code(404).send({
        success: false,
        error: 'Parameter not found',
      });
    }

    return reply.send({
      success: true,
      data: parameter,
      message: 'Parameter updated successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * DELETE /water-quality/parameters/:code
 * Delete parameter
 */
export async function deleteParameter(
  request: FastifyRequest<{
    Params: {
      code: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const deleted = await waterQualityService.deleteParameter(request.params.code);

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Parameter not found',
      });
    }

    return reply.send({
      success: true,
      message: 'Parameter deleted successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * POST /water-quality/validate
 * Validate water quality reading
 */
export async function validateReading(
  request: FastifyRequest<{
    Body: {
      parameterCode: string;
      value: number;
      timestamp?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { parameterCode, value, timestamp } = request.body;

    const result = await waterQualityService.validateReading(
      parameterCode,
      value,
      timestamp ? new Date(timestamp) : new Date()
    );

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /water-quality/validate-batch
 * Validate multiple readings
 */
export async function validateBatchReadings(
  request: FastifyRequest<{
    Body: {
      readings: Array<{
        parameterCode: string;
        value: number;
        timestamp?: string;
      }>;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const readings = request.body.readings.map(r => ({
      parameterCode: r.parameterCode,
      value: r.value,
      timestamp: r.timestamp ? new Date(r.timestamp) : undefined,
    }));

    const results = await waterQualityService.validateReadings(readings);

    return reply.send({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// Compliance Reporting
// ============================================================================

/**
 * GET /water-quality/compliance/:deviceId
 * Generate compliance report
 */
export async function getComplianceReport(
  request: FastifyRequest<{
    Params: {
      deviceId: string;
    };
    Querystring: {
      startDate: string;
      endDate: string;
      parameters?: string; // Comma-separated parameter codes
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { deviceId } = request.params;
    const { startDate, endDate, parameters } = request.query;

    if (!startDate || !endDate) {
      return reply.code(400).send({
        success: false,
        error: 'startDate and endDate are required',
      });
    }

    const parameterCodes = parameters ? parameters.split(',').map(p => p.trim()) : undefined;

    const report = await waterQualityService.generateComplianceReport(
      deviceId,
      new Date(startDate),
      new Date(endDate),
      parameterCodes
    );

    return reply.send({
      success: true,
      data: report,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /water-quality/sampling-requirements
 * Get sampling requirements
 */
export async function getSamplingRequirements(
  request: FastifyRequest<{
    Querystring: {
      parameters?: string; // Comma-separated parameter codes
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { parameters } = request.query;
    const parameterCodes = parameters ? parameters.split(',').map(p => p.trim()) : undefined;

    const requirements = await waterQualityService.getSamplingRequirements(parameterCodes);

    return reply.send({
      success: true,
      data: requirements,
      count: requirements.length,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// Seeding
// ============================================================================

/**
 * POST /water-quality/seed
 * Seed default EPA/AWWA parameters (Admin only)
 */
export async function seedDefaultParameters(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await waterQualityService.seedDefaultParameters();

    return reply.send({
      success: true,
      message: 'Default water quality parameters seeded successfully',
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}
