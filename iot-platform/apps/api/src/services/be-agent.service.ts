/**
 * BeAgentService (ADR-058)
 *
 * OpenAI-compatible chat adapter for the BE Agent widget.
 * Reads AI endpoint config from SystemConfig (runtime) → config.ai (env fallback).
 * Stub mode when AI_CHAT_ENDPOINT is empty — simulates streaming, no external calls.
 * Streams tokens via Socket.io be-agent:token events to the requestId room.
 */
import type { Server as SocketIOServer } from 'socket.io';
import { config } from '../config/config.js';
import { SystemConfig } from '../models/system-config.model.js';
import { DeviceDerivedState } from '../models/device-derived-state.model.js';
import { AlarmInstance } from '../models/alarm-instance.model.js';

interface AiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

async function resolveAiConfig(): Promise<AiConfig> {
  const [epDoc, keyDoc, modelDoc] = await Promise.all([
    SystemConfig.findById('be_agent_endpoint').lean(),
    SystemConfig.findById('be_agent_api_key').lean(),
    SystemConfig.findById('be_agent_model').lean(),
  ]);
  return {
    endpoint: epDoc?.value || config.ai.endpoint,
    apiKey: keyDoc?.value || config.ai.apiKey,
    model: modelDoc?.value || config.ai.model,
  };
}

async function buildSystemPrompt(deviceId?: string): Promise<string> {
  let ctx =
    'You are BE Sense, an intelligent IoT operations assistant. ' +
    'Help users understand their device data, diagnose issues, and optimise operations. ' +
    'Be concise and practical.';

  if (!deviceId) return ctx;

  try {
    const derived = await DeviceDerivedState.findOne({ deviceId }).lean();
    if (derived?.derived && Object.keys(derived.derived).length > 0) {
      ctx += `\n\nDevice: ${deviceId}\nCurrent state: ${JSON.stringify(derived.derived)}`;
    }

    const alarms = await AlarmInstance.find({
      deviceId,
      state: { $in: ['ACTIVE_UNACKED', 'ACTIVE_ACKED'] },
    })
      .sort({ triggerTimestamp: -1 })
      .limit(3)
      .lean();

    if (alarms.length > 0) {
      const summary = alarms
        .map((a) => `${a.tagName} (${a.priority}): ${a.state}`)
        .join('; ');
      ctx += `\n\nActive alarms: ${summary}`;
    }
  } catch {
    // Context fetch failure is non-fatal
  }

  return ctx;
}

async function emitStub(
  io: SocketIOServer,
  requestId: string,
  message: string
): Promise<void> {
  const reply =
    `[Stub mode] Received: "${message}". ` +
    `Set AI_CHAT_ENDPOINT (or configure via Admin → BE Agent Settings) to connect a real LLM. ` +
    `Compatible with Ollama, vLLM, Azure OpenAI, Groq, or any OpenAI-compatible endpoint.`;

  for (const word of reply.split(' ')) {
    await new Promise((r) => setTimeout(r, 60));
    io.to(`be-agent:${requestId}`).emit('be-agent:token', {
      requestId,
      token: word + ' ',
      done: false,
    });
  }

  io.to(`be-agent:${requestId}`).emit('be-agent:token', {
    requestId,
    token: '',
    done: true,
  });
}

export async function beAgentChat(
  message: string,
  requestId: string,
  io: SocketIOServer,
  deviceId?: string
): Promise<void> {
  const aiConfig = await resolveAiConfig();

  if (!aiConfig.endpoint) {
    await emitStub(io, requestId, message);
    return;
  }

  const systemPrompt = await buildSystemPrompt(deviceId);

  try {
    // Dynamic import so server boots even before `openai` is installed
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({
      baseURL: aiConfig.endpoint,
      apiKey: aiConfig.apiKey,
    });

    const stream = await client.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (token) {
        io.to(`be-agent:${requestId}`).emit('be-agent:token', {
          requestId,
          token,
          done: false,
        });
      }
    }
  } catch (err: any) {
    // Surface error to client, then close stream
    io.to(`be-agent:${requestId}`).emit('be-agent:token', {
      requestId,
      token: `[Error: ${err.message}]`,
      done: false,
    });
  }

  io.to(`be-agent:${requestId}`).emit('be-agent:token', {
    requestId,
    token: '',
    done: true,
  });
}
