import { z } from 'zod';

const ConversationTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(4000),
});

export const InputSchema = z.object({
  question: z.string().min(1).max(2000),
  history: z.array(ConversationTurnSchema).max(10).default([]),
});

export type QueryInput = z.infer<typeof InputSchema>;
