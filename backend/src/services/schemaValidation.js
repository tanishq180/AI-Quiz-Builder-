import { z } from 'zod';

export const createRoomSchema = z.object({
  hostName: z.string().trim().min(1, 'Host name required').max(24, 'Max 24 characters'),
  topic: z.string().trim().min(1, 'Topic required').max(120, 'Max 120 characters').default('General Knowledge'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Standard']).default('Medium'),
  questionCount: z.coerce.number().int().min(2).max(20).default(5),
  timePerQuestion: z.coerce.number().int().min(5).max(60).default(15),
  avatarSeed: z.string().max(8).optional().default('⚡'),
  gameMode: z.enum(['STANDARD', 'BATTLE_ROYALE', 'SOLO_PRACTICE']).optional().default('STANDARD')
});

export const joinRoomSchema = z.object({
  username: z.string().trim().min(1, 'Username required').max(24, 'Max 24 characters'),
  roomCode: z.string().trim().length(6, 'Room code must be exactly 6 characters').toUpperCase(),
  avatarSeed: z.string().max(8).optional().default('⚡')
});

export const submitAnswerSchema = z.object({
  roomCode: z.string().trim().length(6).toUpperCase(),
  questionIndex: z.coerce.number().int().min(0),
  answerIndex: z.coerce.number().int().min(0).max(3)
});

export const reactionSchema = z.object({
  roomCode: z.string().trim().length(6).toUpperCase(),
  emoji: z.string().min(1).max(10)
});

export const hostActionSchema = z.object({
  roomCode: z.string().trim().length(6).toUpperCase(),
  action: z.enum(['KICK_PLAYER', 'PAUSE_TIMER', 'RESUME_TIMER', 'SKIP_QUESTION']),
  targetSocketId: z.string().optional()
});

export const parsePdfSchema = z.object({
  filename: z.string().optional()
});

export const saveQuizToLibrarySchema = z.object({
  title: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(120),
  difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Standard']).default('Medium'),
  sourceType: z.enum(['PDF', 'TOPIC_PROMPT', 'DOCX', 'TEXT', 'MANUAL']).default('MANUAL'),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    options: z.array(z.string()).min(2),
    correctIndex: z.number().int().min(0),
    explanation: z.string().optional(),
    subFocus: z.string().optional(),
    timeLimit: z.number().optional().default(15)
  })).min(1),
  creatorName: z.string().optional().default('Creator')
});
