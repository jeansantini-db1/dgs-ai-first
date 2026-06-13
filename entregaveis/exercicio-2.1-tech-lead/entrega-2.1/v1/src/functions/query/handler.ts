import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';

import { AppError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import { searchChunks } from '../../services/search.js';
import { buildPrompt } from '../../services/prompt-builder.js';
import { getCompletion } from '../../services/completion.js';
import { InputSchema } from './validator.js';
import { buildQueryResponse } from './response-builder.js';

export async function queryHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;
  logger.info({ requestId }, 'POST /api/query received');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      status: 400,
      jsonBody: { error: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    };
  }

  const parseResult = InputSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      status: 400,
      jsonBody: {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body.',
        details: parseResult.error.flatten(),
      },
    };
  }

  const { question, history } = parseResult.data;

  try {
    const chunks = await searchChunks(question);
    const { messages } = await buildPrompt(question, chunks, history);
    const answer = await getCompletion(messages);
    const responseBody = buildQueryResponse(answer, chunks);

    logger.info(
      { requestId, chunkCount: chunks.length, conflictDetected: responseBody.conflict_detected },
      'Query handled successfully',
    );

    return { status: 200, jsonBody: responseBody };
  } catch (err) {
    if (err instanceof AppError) {
      logger.warn({ requestId, code: err.code, message: err.message }, 'AppError handling query');
      return {
        status: err.statusCode,
        jsonBody: { error: err.code, message: err.message },
      };
    }

    logger.error({ requestId, err }, 'Unexpected error handling query');
    return {
      status: 500,
      jsonBody: { error: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
    };
  }
}

app.http('query', {
  methods: ['POST'],
  route: 'query',
  authLevel: 'function',
  handler: queryHandler,
});
