import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { Workflow } from '../models/workflow.model';
import { WorkflowEngineService } from '../services/workflow-engine.service';

export async function webhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/:workflowId
   * Public inbound endpoint — NO authentication required.
   * External callers POST JSON to trigger a webhook-enabled workflow.
   */
  fastify.post(
    '/webhooks/:workflowId',
    {
      schema: {
        tags: ['Webhooks'],
        summary: 'Trigger a workflow via webhook (public)',
        params: {
          type: 'object',
          properties: { workflowId: { type: 'string' } },
          required: ['workflowId'],
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  executionId: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { workflowId } = request.params as { workflowId: string };

      // 1. Load workflow (must be enabled)
      const workflow = await Workflow.findOne({ workflowId, isEnabled: true }).lean();
      if (!workflow) {
        return reply.status(404).send({ success: false, error: 'Workflow not found or disabled' });
      }

      // 2. Find webhook trigger node
      const triggerNode = (workflow.nodes as any[]).find((n: any) => n.type === 'trigger:webhook');
      if (!triggerNode) {
        return reply.status(422).send({ success: false, error: 'Workflow has no webhook trigger' });
      }

      // 3. Optional HMAC-SHA256 signature validation
      const webhookSecret: string | undefined = triggerNode.data?.config?.webhookSecret;
      if (webhookSecret) {
        const signatureHeader = request.headers['x-hub-signature-256'] as string | undefined;
        if (!signatureHeader) {
          return reply.status(401).send({ success: false, error: 'Missing X-Hub-Signature-256 header' });
        }

        // Use JSON.stringify of parsed body as the signed payload (standard for JSON callers)
        const rawBody = JSON.stringify(request.body ?? {});
        const expected = 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

        // Constant-time comparison to prevent timing attacks
        const expectedBuf = Buffer.from(expected);
        const receivedBuf = Buffer.from(signatureHeader);
        const isValid =
          expectedBuf.length === receivedBuf.length &&
          crypto.timingSafeEqual(expectedBuf, receivedBuf);

        if (!isValid) {
          return reply.status(401).send({ success: false, error: 'Invalid signature' });
        }
      }

      // 4. Execute workflow
      const engineService = new WorkflowEngineService((request.server as any).io);
      const executionId = await engineService.execute(
        workflowId,
        {
          type: 'webhook',
          source: (request.headers['x-forwarded-for'] as string) || request.ip,
          data: (request.body as Record<string, unknown>) ?? {},
        },
        undefined,
        false
      );

      // 5. Return 202 Accepted
      return reply.status(202).send({
        success: true,
        data: { executionId, status: 'accepted' },
      });
    }
  );
}
