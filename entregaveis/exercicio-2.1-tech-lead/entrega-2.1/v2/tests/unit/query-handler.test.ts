import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpRequest, InvocationContext } from '@azure/functions';
import { queryHandler, InputSchema } from '../../src/functions/query/handler.js';
import { AppError } from '../../src/shared/errors.js';
import type { RetrievedChunk, ConflictInfo } from '../../src/shared/types.js';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/services/search.js', () => ({
  searchChunks: vi.fn(),
}));

vi.mock('../../src/services/prompt-builder.js', () => ({
  buildPrompt: vi.fn(),
  detectConflicts: vi.fn(),
}));

vi.mock('../../src/services/completion.js', () => ({
  getCompletion: vi.fn(),
}));

vi.mock('../../src/shared/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Prevent app.http() registration from throwing in test environment
vi.mock('@azure/functions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@azure/functions')>();
  return { ...actual, app: { http: vi.fn() } };
});

import { searchChunks } from '../../src/services/search.js';
import { buildPrompt, detectConflicts } from '../../src/services/prompt-builder.js';
import { getCompletion } from '../../src/services/completion.js';
import { logger } from '../../src/shared/logger.js';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeRequest(body: unknown): HttpRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as HttpRequest;
}

function makeBrokenRequest(): HttpRequest {
  return {
    json: () => Promise.reject(new SyntaxError('Unexpected token')),
  } as unknown as HttpRequest;
}

function makeContext(invocationId = 'test-invocation-id'): InvocationContext {
  return { invocationId } as unknown as InvocationContext;
}

const sampleChunk: RetrievedChunk = {
  id: 'chunk-1',
  content: 'Prazo de devolução: 30 dias corridos.',
  score: 0.95,
  metadata: {
    doc_id: 'POL-001',
    versao: '2',
    data_emissao: '2024-01-15',
    status_vigencia: 'ativa',
  },
};

const noConflict: ConflictInfo = { detected: false, hasActiveVersion: true };

// ── InputSchema ───────────────────────────────────────────────────────────────

describe('InputSchema', () => {
  it('should accept a valid question and default history to empty array', () => {
    const result = InputSchema.safeParse({ question: 'Qual o prazo de devolução?' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.history).toEqual([]);
  });

  it('should accept history with exactly 3 turns', () => {
    const history = [
      { role: 'user', content: 'Pergunta 1' },
      { role: 'assistant', content: 'Resposta 1' },
      { role: 'user', content: 'Pergunta 2' },
    ];
    const result = InputSchema.safeParse({ question: 'Mais uma?', history });
    expect(result.success).toBe(true);
  });

  it('should reject history with 4 turns', () => {
    const history = Array.from({ length: 4 }, (_, i) => ({
      role: 'user' as const,
      content: `Turno ${i}`,
    }));
    const result = InputSchema.safeParse({ question: 'Teste', history });
    expect(result.success).toBe(false);
  });

  it('should reject an empty question', () => {
    const result = InputSchema.safeParse({ question: '' });
    expect(result.success).toBe(false);
  });

  it('should accept a question of exactly 2000 characters', () => {
    const result = InputSchema.safeParse({ question: 'a'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('should reject a question of 2001 characters', () => {
    const result = InputSchema.safeParse({ question: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('should reject when question is missing entirely', () => {
    const result = InputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── queryHandler ──────────────────────────────────────────────────────────────

describe('queryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchChunks).mockResolvedValue([sampleChunk]);
    vi.mocked(detectConflicts).mockReturnValue(noConflict);
    vi.mocked(buildPrompt).mockResolvedValue([]);
    vi.mocked(getCompletion).mockResolvedValue('Devolução em até 30 dias corridos.');
  });

  describe('happy path', () => {
    it('should return 200 with answer and source_documents', async () => {
      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo de devolução?' }),
        makeContext(),
      );

      expect(response.status).toBe(200);
      const body = response.jsonBody as Record<string, unknown>;
      expect(body['answer']).toBe('Devolução em até 30 dias corridos.');
      expect(body['source_documents']).toEqual([sampleChunk.metadata]);
    });

    it('should return conflict_detected: false when there is no conflict', async () => {
      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      const body = response.jsonBody as Record<string, unknown>;
      expect(body['conflict_detected']).toBe(false);
      expect(body['conflict_message']).toBeUndefined();
    });

    it('should call searchChunks with the exact question', async () => {
      await queryHandler(makeRequest({ question: 'Prazo de entrega?' }), makeContext());

      expect(searchChunks).toHaveBeenCalledOnce();
      expect(searchChunks).toHaveBeenCalledWith('Prazo de entrega?');
    });

    it('should forward history to buildPrompt', async () => {
      const history = [{ role: 'user' as const, content: 'Pergunta anterior' }];

      await queryHandler(makeRequest({ question: 'E o SLA?', history }), makeContext());

      expect(buildPrompt).toHaveBeenCalledWith('E o SLA?', [sampleChunk], history);
    });

    it('should pass getCompletion result as answer', async () => {
      vi.mocked(getCompletion).mockResolvedValue('Resposta customizada.');

      const response = await queryHandler(
        makeRequest({ question: 'Qual a política?' }),
        makeContext(),
      );

      expect((response.jsonBody as Record<string, unknown>)['answer']).toBe('Resposta customizada.');
    });
  });

  describe('conflict detection', () => {
    it('should include conflict_message when active version exists', async () => {
      vi.mocked(detectConflicts).mockReturnValue({
        detected: true,
        hasActiveVersion: true,
        message: 'Documento POL-001 possui versão ativa e versões anteriores.',
      });

      const response = await queryHandler(
        makeRequest({ question: 'Qual a política de devolução?' }),
        makeContext(),
      );

      const body = response.jsonBody as Record<string, unknown>;
      expect(response.status).toBe(200);
      expect(body['conflict_detected']).toBe(true);
      expect(body['conflict_message']).toBe('Documento POL-001 possui versão ativa e versões anteriores.');
    });

    it('should include conflict_message and still return 200 when no active version', async () => {
      vi.mocked(detectConflicts).mockReturnValue({
        detected: true,
        hasActiveVersion: false,
        message: 'Confirme com seu supervisor qual versão é válida.',
      });

      const response = await queryHandler(
        makeRequest({ question: 'Qual a política?' }),
        makeContext(),
      );

      const body = response.jsonBody as Record<string, unknown>;
      expect(response.status).toBe(200);
      expect(body['conflict_detected']).toBe(true);
      expect(body['conflict_message']).toContain('supervisor');
    });
  });

  describe('validation errors', () => {
    it('should return 400 with VALIDATION_ERROR when question is missing', async () => {
      const response = await queryHandler(makeRequest({}), makeContext());

      expect(response.status).toBe(400);
      expect((response.jsonBody as Record<string, unknown>)['error']).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when question is an empty string', async () => {
      const response = await queryHandler(makeRequest({ question: '' }), makeContext());

      expect(response.status).toBe(400);
    });

    it('should return 400 when body is not parseable JSON', async () => {
      const response = await queryHandler(makeBrokenRequest(), makeContext());

      expect(response.status).toBe(400);
    });

    it('should return 400 when history exceeds 3 turns', async () => {
      const history = Array.from({ length: 4 }, (_, i) => ({
        role: 'user' as const,
        content: `Turno ${i}`,
      }));

      const response = await queryHandler(
        makeRequest({ question: 'Teste', history }),
        makeContext(),
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 details array when validation fails', async () => {
      const response = await queryHandler(makeRequest({ question: '' }), makeContext());

      const body = response.jsonBody as Record<string, unknown>;
      expect(Array.isArray(body['details'])).toBe(true);
    });
  });

  // ── Desvio 6 — distinção INVALID_JSON vs VALIDATION_ERROR ────────────────────
  describe('error code distinction — INVALID_JSON vs VALIDATION_ERROR', () => {
    it('should return INVALID_JSON (not VALIDATION_ERROR) when body is malformed JSON', async () => {
      const response = await queryHandler(makeBrokenRequest(), makeContext());

      expect(response.status).toBe(400);
      const body = response.jsonBody as Record<string, unknown>;
      expect(body['error']).toBe('INVALID_JSON');
      expect(body['error']).not.toBe('VALIDATION_ERROR');
    });

    it('should return VALIDATION_ERROR (not INVALID_JSON) when body is valid JSON but fails schema', async () => {
      const response = await queryHandler(makeRequest({ question: '' }), makeContext());

      expect(response.status).toBe(400);
      const body = response.jsonBody as Record<string, unknown>;
      expect(body['error']).toBe('VALIDATION_ERROR');
      expect(body['error']).not.toBe('INVALID_JSON');
    });

    it('should return INVALID_JSON with a message field on parse failure', async () => {
      const response = await queryHandler(makeBrokenRequest(), makeContext());

      const body = response.jsonBody as Record<string, unknown>;
      expect(body['error']).toBe('INVALID_JSON');
      expect(typeof body['message']).toBe('string');
    });
  });

  // ── Desvio 7 — requestId do context.invocationId em todos os logs ─────────────
  describe('observability — invocationId as requestId', () => {
    it('should log requestId from context.invocationId on successful request', async () => {
      await queryHandler(makeRequest({ question: 'Qual o prazo?' }), makeContext('abc-123'));

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'abc-123' }),
        expect.any(String),
      );
    });

    it('should log requestId from context.invocationId on INVALID_JSON', async () => {
      await queryHandler(makeBrokenRequest(), makeContext('broken-req-id'));

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'broken-req-id' }),
        expect.any(String),
      );
    });

    it('should log requestId from context.invocationId on AppError', async () => {
      vi.mocked(searchChunks).mockRejectedValue(
        new AppError('Search failed', 502, 'SEARCH_ERROR'),
      );

      await queryHandler(makeRequest({ question: 'SLA?' }), makeContext('err-req-id'));

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'err-req-id' }),
        expect.any(String),
      );
    });
  });

  describe('error handling', () => {
    it('should return AppError statusCode and code when searchChunks throws AppError', async () => {
      vi.mocked(searchChunks).mockRejectedValue(
        new AppError('Search service unavailable', 502, 'SEARCH_ERROR'),
      );

      const response = await queryHandler(
        makeRequest({ question: 'Qual o SLA?' }),
        makeContext(),
      );

      expect(response.status).toBe(502);
      const body = response.jsonBody as Record<string, unknown>;
      expect(body['error']).toBe('SEARCH_ERROR');
      expect(body['message']).toBe('Search service unavailable');
    });

    it('should return AppError statusCode and code when getCompletion throws AppError', async () => {
      vi.mocked(getCompletion).mockRejectedValue(
        new AppError('Completion service unavailable', 502, 'COMPLETION_ERROR'),
      );

      const response = await queryHandler(
        makeRequest({ question: 'Qual o prazo?' }),
        makeContext(),
      );

      expect(response.status).toBe(502);
      expect((response.jsonBody as Record<string, unknown>)['error']).toBe('COMPLETION_ERROR');
    });

    it('should return 500 INTERNAL_ERROR on unexpected Error', async () => {
      vi.mocked(searchChunks).mockRejectedValue(new Error('Unexpected failure'));

      const response = await queryHandler(
        makeRequest({ question: 'Qual o SLA?' }),
        makeContext(),
      );

      expect(response.status).toBe(500);
      expect((response.jsonBody as Record<string, unknown>)['error']).toBe('INTERNAL_ERROR');
    });

    it('should not leak internal error details in 500 response', async () => {
      vi.mocked(searchChunks).mockRejectedValue(new Error('Secret internal message'));

      const response = await queryHandler(
        makeRequest({ question: 'Qual o SLA?' }),
        makeContext(),
      );

      const body = response.jsonBody as Record<string, unknown>;
      expect(JSON.stringify(body)).not.toContain('Secret internal message');
    });
  });
});
