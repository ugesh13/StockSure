import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { processChatMessage } from '../services/chat.ts';

const ChatBody = z.object({
  message: z.string().min(1, 'Message is required').max(500, 'Message cannot exceed 500 characters'),
  context: z
    .object({
      city: z.string().optional(),
    })
    .optional(),
});

export async function chatRoutes(app: FastifyInstance) {
  app.post(
    '/chat',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (req) => {
      const b = ChatBody.parse(req.body);
      return processChatMessage(b.message, b.context);
    }
  );
}
