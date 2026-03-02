import type { FastifyRequest, FastifyReply } from 'fastify';
import { WaterQualityService } from '../services/water-quality.service';
import type { IWaterQualityParameter } from '../models/water-quality-parameter.model';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';

const waterQualityService = new WaterQualityService();

/**
 * WaterQualityController
 *
 * EPA/AWWA water quality parameter management and validation.
 * Zero try/catch — errors propagate to global error handler.
 */
export class WaterQualityController {
  async createParameter(request: FastifyRequest<{ Body: Partial<IWaterQualityParameter> }>, reply: FastifyReply) {
    const parameter = await waterQualityService.createParameter(request.body);
    return sendCreated(reply, parameter);
  }

  async listParameters(
    request: FastifyRequest<{ Querystring: { category?: string; isRegulated?: string } }>,
    reply: FastifyReply
  ) {
    const { category, isRegulated } = request.query;

    const filter: any = {};
    if (category) filter.category = category;
    if (isRegulated !== undefined) filter.isRegulated = isRegulated === 'true';

    const parameters = await waterQualityService.listParameters(filter);
    return sendSuccess(reply, parameters);
  }

  async getParameter(request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) {
    const parameter = await waterQualityService.getParameterByCode(request.params.code);

    if (!parameter) {
      throw new NotFoundError('Parameter');
    }

    return sendSuccess(reply, parameter);
  }

  async updateParameter(
    request: FastifyRequest<{ Params: { code: string }; Body: Partial<IWaterQualityParameter> }>,
    reply: FastifyReply
  ) {
    const parameter = await waterQualityService.updateParameter(request.params.code, request.body);

    if (!parameter) {
      throw new NotFoundError('Parameter');
    }

    return sendSuccess(reply, parameter);
  }

  async deleteParameter(request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) {
    const deleted = await waterQualityService.deleteParameter(request.params.code);

    if (!deleted) {
      throw new NotFoundError('Parameter');
    }

    return sendDeleted(reply, 'Parameter deleted successfully');
  }

  async validateReading(
    request: FastifyRequest<{ Body: { parameterCode: string; value: number; timestamp?: string } }>,
    reply: FastifyReply
  ) {
    const { parameterCode, value, timestamp } = request.body;
    const result = await waterQualityService.validateReading(
      parameterCode, value, timestamp ? new Date(timestamp) : new Date()
    );
    return sendSuccess(reply, result);
  }

  async validateBatchReadings(
    request: FastifyRequest<{ Body: { readings: Array<{ parameterCode: string; value: number; timestamp?: string }> } }>,
    reply: FastifyReply
  ) {
    const readings = request.body.readings.map(r => ({
      parameterCode: r.parameterCode,
      value: r.value,
      timestamp: r.timestamp ? new Date(r.timestamp) : undefined,
    }));

    const results = await waterQualityService.validateReadings(readings);
    return sendSuccess(reply, results);
  }

  async getComplianceReport(
    request: FastifyRequest<{
      Params: { deviceId: string };
      Querystring: { startDate: string; endDate: string; parameters?: string };
    }>,
    reply: FastifyReply
  ) {
    const { deviceId } = request.params;
    const { startDate, endDate, parameters } = request.query;

    if (!startDate || !endDate) {
      throw new BadRequestError('startDate and endDate are required');
    }

    const parameterCodes = parameters ? parameters.split(',').map(p => p.trim()) : undefined;
    const report = await waterQualityService.generateComplianceReport(
      deviceId, new Date(startDate), new Date(endDate), parameterCodes
    );

    return sendSuccess(reply, report);
  }

  async getSamplingRequirements(
    request: FastifyRequest<{ Querystring: { parameters?: string } }>,
    reply: FastifyReply
  ) {
    const { parameters } = request.query;
    const parameterCodes = parameters ? parameters.split(',').map(p => p.trim()) : undefined;
    const requirements = await waterQualityService.getSamplingRequirements(parameterCodes);
    return sendSuccess(reply, requirements);
  }

  async seedDefaultParameters(_request: FastifyRequest, reply: FastifyReply) {
    await waterQualityService.seedDefaultParameters();
    return sendSuccess(reply, { message: 'Default water quality parameters seeded successfully' });
  }
}

export const waterQualityController = new WaterQualityController();

// Legacy named function exports
export const createParameter = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.createParameter(req, reply);
export const listParameters = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.listParameters(req, reply);
export const getParameter = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.getParameter(req, reply);
export const updateParameter = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.updateParameter(req, reply);
export const deleteParameter = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.deleteParameter(req, reply);
export const validateReading = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.validateReading(req, reply);
export const validateBatchReadings = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.validateBatchReadings(req, reply);
export const getComplianceReport = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.getComplianceReport(req, reply);
export const getSamplingRequirements = (req: FastifyRequest<any>, reply: FastifyReply) => waterQualityController.getSamplingRequirements(req, reply);
export const seedDefaultParameters = (req: FastifyRequest, reply: FastifyReply) => waterQualityController.seedDefaultParameters(req, reply);
