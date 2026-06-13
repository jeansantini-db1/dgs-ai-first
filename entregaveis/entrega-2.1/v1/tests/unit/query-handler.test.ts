import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpRequest, InvocationContext } from '@azure/functions';

// Prevent app.http() registration from failing without an Azure runtime
vi.mock('@azure/functions', async (importActual) => {
  const actual = await importActual<typeof import('@azure/functions')>();
  return { ...actual, app: { http: vi.fn() } };
});

// Mock external service calls
vi.mock('../../src/services/search.js');
vi.mock('../../src/services/prompt-builder.js');
vi.mock('../../src/services/completion.js');

// Silence pino output during tests
vi.mock('../../src/shared/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { queryHandler } from '../../src/functions/query/handler.js';
import { searchChunks } from '../../src/services/search.js';
import { buildPrompt } from '../../src/services/prompt-builder.js';
import { getCompletion } from '../../src/services/completion.js';
import { AppError } from '../../src/shared/errors.js';
import type { Chunk, ConversationTurn } from '../../src/shared/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activeChunk: Chunk = {
  id: 'chunk-1',
  content: 'O prazo de entrega padrão é 5 dias úteis.',
  metadata: {
    doc_id: 'SLA-2024',
    versao: '2',
    data_emissao: '2024-01-01',
    status_vigencia: 'ativa',
  },
  score: 0.95,
};

const supersededChunk: Chunk = {
  id: 'chunk-2',
  content: 'O prazo de entrega padrão era 7 dias úteis.',
  metadata: {
    doc_id: 'SLA-2024',
    versao: '1',
    data_emissao: '2023-01-01',
    status_vigencia: 'supersedida',
  },
  score: 0.80,
};

const stubMessages = [
  { role: 'system' as const, content: 'system' },
  { role: 'user' as const, content: 'Qual o prazo?' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): HttpRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as HttpRequest;
}

function makeBrokenRequest(): HttpRequest {
  return {
    json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
  } as unknown as HttpRequest;
}

function makeContext(invocationId = 'test-id'): InvocationContext {
  return { invocationId } as unknown as InvocationContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('queryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('input validation', () => {
    it('should return 400 with INVALID_JSON when body is not parseable', async () => {
      const response = await queryHandler(makeBrokenRequest(), makeContext());

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({ error: 'INVALID_JSON' });
    });

    it('should return 400 with VALIDATION_ERROR when question is missing', async () => {
      const response = await queryHandler(makeRequest({ history: [] }), makeContext());

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({ error: 'VALIDATION_ERROR' });
    });

    it('should return 400 with VALIDATION_ERROR when question is an empty string', async () => {
      const response = await queryHandler(makeRequest({ question: '' }), makeContext());

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({ error: 'VALIDATION_ERROR' });
    });

    it('should return 400 with VALIDATION_ERROR when question exceeds 2000 characters', async () => {
      const response = await queryHandler(
        makeRequest({ question: 'a'.repeat(2001) }),
        makeContext(),
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({ error: 'VALIDATION_ERROR' });
    });

    it('should return 400 with VALIDATION_ERROR when history role is invalid', async () => {
      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?', history: [{ role: 'bot', content: 'Olá' }] }),
        makeContext(),
      );

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({ error: 'VALIDATION_ERROR' });
    });
  });

  // -------------------------------------------------------------------------
  describe('successful query', () => {
    it('should return 200 with answer and source_documents', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 1, hasConflict: false });
      vi.mocked(getCompletion).mockResolvedValue('O prazo é 5 dias úteis.');

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo de entrega?' }),
        makeContext(),
      );

      expect(response.status).toBe(200);
      expect(response.jsonBody).toMatchObject({
        answer: 'O prazo é 5 dias úteis.',
        source_documents: [activeChunk.metadata],
        conflict_detected: false,
      });
    });

    it('should default history to [] when not provided in body', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 1, hasConflict: false });
      vi.mocked(getCompletion).mockResolvedValue('Resposta.');

      await queryHandler(makeRequest({ question: 'Qual o prazo?' }), makeContext());

      expect(vi.mocked(buildPrompt)).toHaveBeenCalledWith('Qual o prazo?', [activeChunk], []);
    });

    it('should forward provided history to buildPrompt', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 1, hasConflict: false });
      vi.mocked(getCompletion).mockResolvedValue('Resposta.');

      const history: ConversationTurn[] = [
        { role: 'user', content: 'Olá' },
        { role: 'assistant', content: 'Olá! Como posso ajudar?' },
      ];

      await queryHandler(makeRequest({ question: 'Qual o prazo?', history }), makeContext());

      expect(vi.mocked(buildPrompt)).toHaveBeenCalledWith('Qual o prazo?', [activeChunk], history);
    });

    it('should call searchChunks with the question text', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 1, hasConflict: false });
      vi.mocked(getCompletion).mockResolvedValue('Resposta.');

      await queryHandler(makeRequest({ question: 'Qual o prazo?' }), makeContext());

      expect(vi.mocked(searchChunks)).toHaveBeenCalledWith('Qual o prazo?');
    });
  });

  // -------------------------------------------------------------------------
  describe('conflict detection', () => {
    it('should set conflict_detected=true when active and superseded chunks coexist', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk, supersededChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 2, hasConflict: true });
      vi.mocked(getCompletion).mockResolvedValue('Resposta com versão ativa.');

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(200);
      expect(response.jsonBody).toMatchObject({
        conflict_detected: true,
        conflict_message: expect.stringContaining('conflitantes'),
      });
    });

    it('should omit conflict_message when conflict_detected=false', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 1, hasConflict: false });
      vi.mocked(getCompletion).mockResolvedValue('Resposta clara.');

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(200);
      expect(response.jsonBody).toMatchObject({ conflict_detected: false });
      expect((response.jsonBody as Record<string, unknown>).conflict_message).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  describe('error handling', () => {
    it('should return AppError.statusCode when searchChunks throws AppError', async () => {
      vi.mocked(searchChunks).mockRejectedValue(
        new AppError('SEARCH_UNAVAILABLE', 'Azure AI Search is unreachable', 502),
      );

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(502);
      expect(response.jsonBody).toMatchObject({ error: 'SEARCH_UNAVAILABLE' });
    });

    it('should return 502 when getCompletion throws AppError', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockResolvedValue({ messages: stubMessages, chunkCount: 1, hasConflict: false });
      vi.mocked(getCompletion).mockRejectedValue(
        new AppError('COMPLETION_UNAVAILABLE', 'Azure OpenAI is unreachable', 502),
      );

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(502);
      expect(response.jsonBody).toMatchObject({ error: 'COMPLETION_UNAVAILABLE' });
    });

    it('should return 500 when buildPrompt throws CONTEXT_BUDGET_EXCEEDED AppError', async () => {
      vi.mocked(searchChunks).mockResolvedValue([activeChunk]);
      vi.mocked(buildPrompt).mockRejectedValue(
        new AppError('CONTEXT_BUDGET_EXCEEDED', 'System prompt exceeds budget', 500),
      );

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(500);
      expect(response.jsonBody).toMatchObject({ error: 'CONTEXT_BUDGET_EXCEEDED' });
    });

    it('should return 500 with INTERNAL_ERROR when an unexpected (non-AppError) is thrown', async () => {
      vi.mocked(searchChunks).mockRejectedValue(new Error('Unexpected failure'));

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(500);
      expect(response.jsonBody).toMatchObject({ error: 'INTERNAL_ERROR' });
    });
  });
});
