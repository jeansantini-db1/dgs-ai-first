import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { logger } from '../../shared/logger.js';
import { AppError } from '../../shared/errors.js';
import { searchChunks } from '../../services/search.js';
import { buildPrompt, detectConflicts } from '../../services/prompt-builder.js';
import { getCompletion } from '../../services/completion.js';

export const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .max(3)
    .default([]),
});

export type QueryInput = z.infer<typeof InputSchema>;

export async function queryHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    logger.warn({ requestId }, 'Invalid JSON in request body');
    return {
      status: 400,
      jsonBody: { error: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    };
  }

  const parsed = InputSchema.safeParse(rawBody);
  if (!parsed.success) {
    logger.warn({ requestId, errors: parsed.error.issues }, 'Invalid query input');
    return {
      status: 400,
      jsonBody: { error: 'VALIDATION_ERROR', details: parsed.error.issues },
    };
  }

  const { question, history } = parsed.data;
  logger.info({ requestId, questionLength: question.length, historyTurns: history.length }, 'Processing query');

  try {
    const chunks = await searchChunks(question);
    const conflict = detectConflicts(chunks);

    if (conflict.detected && !conflict.hasActiveVersion) {
      logger.warn({ requestId, conflictMessage: conflict.message }, 'Document conflict without active version');
    }

    const messages = await buildPrompt(question, chunks, history);
    const answer = await getCompletion(messages);

    logger.info({ requestId, chunkCount: chunks.length, conflictDetected: conflict.detected }, 'Query handled successfully');

    return {
      status: 200,
      jsonBody: {
        answer,
        source_documents: chunks.map((c) => c.metadata),
        conflict_detected: conflict.detected,
        ...(conflict.detected && { conflict_message: conflict.message }),
      },
    };
  } catch (err) {
    if (err instanceof AppError) {
      logger.error({ requestId, code: err.code, status: err.statusCode }, err.message);
      return {
        status: err.statusCode,
        jsonBody: { error: err.code, message: err.message },
      };
    }
    logger.error({ requestId, err }, 'Unexpected error in queryHandler');
    return {
      status: 500,
      jsonBody: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    };
  }
}

app.http('query', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'query',
  handler: queryHandler,
});
