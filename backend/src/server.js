import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { createRequire } from 'module';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import mammoth from 'mammoth';

import { connectDB, getDBStatus } from './config/db.js';
import { setupQuizSocket, createPreloadedRoom, generateRoomCode, getActiveRoom } from './socket/quizSocket.js';
import { Room } from './models/Room.js';
import { QuizSession } from './models/QuizSession.js';
import { QuizLibrary } from './models/QuizLibrary.js';
import { 
  generateQuizFromPDFText, 
  suggestTopicsFromPDF, 
  extractTextFromScannedPdfBufferWithAI 
} from './services/aiService.js';
import { saveQuizToLibrarySchema } from './services/schemaValidation.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
  clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Configure Multer for in-memory document uploads (PDF, DOCX, TXT, MD up to 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    const isAllowed = 
      ext.endsWith('.pdf') || 
      ext.endsWith('.docx') || 
      ext.endsWith('.txt') || 
      ext.endsWith('.md') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain';

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Supported formats: PDF (.pdf), Word (.docx), Text (.txt), or Markdown (.md).'));
    }
  }
});

// Production-aware CORS Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin ${origin} not permitted.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Rate Limiters for Security & Quota Protection
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const pdfGenerateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Rate limit exceeded: Max 30 document parses / AI quiz generations per 15 minutes. Please try again later.' }
});

app.use('/api', generalApiLimiter);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: isProduction ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

// Optional Redis Adapter for clustered production environments
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`;
    const pubClient = new Redis(redisUrl, { retryStrategy: () => null }); // don't crash if offline
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.warn('[Redis pubClient warning]:', err.message));
    subClient.on('error', (err) => console.warn('[Redis subClient warning]:', err.message));

    io.adapter(createAdapter(pubClient, subClient));
    console.log('🔌 [Redis Adapter] Socket.io configured with distributed Redis adapter');
  } catch (redisErr) {
    console.warn('⚠️ [Redis Adapter Skipped]: Operating with high-performance in-memory socket adapter.');
  }
}

// In-Memory Library Store Fallback (when MongoDB is offline)
const inMemoryLibrary = new Map();

// Setup Real-time Game Engine
setupQuizSocket(io);

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    mongodbConnected: getDBStatus()
  });
});

/**
 * Universal document text extractor supporting PDF, DOCX, TXT, MD
 */
async function extractTextFromDocument(file, customApiKey = null) {
  const filename = file.originalname.toLowerCase();
  const buffer = file.buffer;

  // 1. Text & Markdown files
  if (filename.endsWith('.txt') || filename.endsWith('.md')) {
    const text = buffer.toString('utf-8').trim();
    return { text, pageCount: Math.ceil(text.length / 2500) || 1 };
  }

  // 2. Microsoft Word DOCX files
  if (filename.endsWith('.docx')) {
    try {
      const docxResult = await mammoth.extractRawText({ buffer });
      const text = (docxResult.value || '').trim();
      return { text, pageCount: Math.ceil(text.length / 2500) || 1 };
    } catch (docxErr) {
      console.warn('[DOCX Parser Error]:', docxErr.message);
    }
  }

  // 3. PDF Parsing
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || '').replace(/\r\n/g, '\n').trim();
    if (text.length >= 30) {
      return { text, pageCount: data.numpages || 1 };
    }
  } catch (err) {
    console.warn('[PDF Primary Parser Warning]:', err.message);
  }

  // Resilient text stream extractor fallback for uncompressed streams
  try {
    const rawString = buffer.toString('binary');
    const textMatches = [];
    const tjRegex = /\(([^)]+)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(rawString)) !== null) {
      const unescaped = match[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, '\n')
        .trim();
      if (unescaped) textMatches.push(unescaped);
    }

    if (textMatches.length > 0) {
      const combined = textMatches.join('\n').trim();
      if (combined.length >= 30) {
        return { text: combined, pageCount: 1 };
      }
    }
  } catch (fallbackErr) {
    console.warn('[PDF Fallback Parser Warning]:', fallbackErr.message);
  }

  // 4. Multimodal OCR via Google Gemini for Scanned / Photocopied PDF documents
  console.log('[Document Parsing] Standard digital text under 30 chars. Attempting Multimodal AI OCR...');
  try {
    const ocrText = await extractTextFromScannedPdfBufferWithAI(buffer, customApiKey);
    if (ocrText && ocrText.length >= 30) {
      return { text: ocrText, pageCount: Math.ceil(ocrText.length / 2000) || 1 };
    }
  } catch (ocrErr) {
    console.warn('[AI Multimodal OCR failed]:', ocrErr.message);
  }

  return { text: '', pageCount: 1 };
}

// 1. Universal Document Parsing Endpoint (PDF, DOCX, TXT, MD)
app.post('/api/parse-pdf', pdfGenerateLimiter, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No document file uploaded.' });
    }

    const customApiKey = req.body.customApiKey || null;
    const { text: cleanText, pageCount } = await extractTextFromDocument(req.file, customApiKey);

    if (!cleanText || cleanText.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from this document. If using a scanned image PDF, please supply your personal Gemini API key in the navbar to activate AI OCR.'
      });
    }

    const suggestedTopics = suggestTopicsFromPDF(cleanText);
    const previewSnippet = cleanText.slice(0, 1200);

    console.log(`[Document Parsed] "${req.file.originalname}" (${pageCount} pages, ${cleanText.length} chars)`);

    res.json({
      success: true,
      filename: req.file.originalname,
      pageCount,
      totalCharacters: cleanText.length,
      extractedText: cleanText,
      suggestedTopics,
      previewSnippet
    });
  } catch (err) {
    console.error('[Document Parse Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to parse document.', error: err.message });
  }
});

// 2. Generate Structured Quiz from document text
app.post('/api/generate-from-pdf', pdfGenerateLimiter, upload.single('pdf'), async (req, res) => {
  try {
    let pdfText = req.body.pdfText;
    let filename = req.body.filename || 'Educational Material';
    let pageCount = Number(req.body.pageCount) || 1;

    // If file was passed directly in multipart form
    if (req.file && req.file.buffer) {
      const extracted = await extractTextFromDocument(req.file, req.body.customApiKey);
      pdfText = extracted.text || '';
      filename = req.file.originalname;
      pageCount = extracted.pageCount || 1;
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'No source document text provided.' });
    }

    // Parse configuration payload
    let topicDistribution = req.body.topicDistribution;
    if (typeof topicDistribution === 'string') {
      try {
        topicDistribution = JSON.parse(topicDistribution);
      } catch (e) {
        topicDistribution = [];
      }
    }

    const totalQuestions = Number(req.body.totalQuestions) || 5;
    const difficulty = req.body.difficulty || 'Medium';
    const hostName = (req.body.hostName || 'Creator Host').trim();
    const avatarSeed = req.body.avatarSeed || '⚡';
    const timePerQuestion = Number(req.body.timePerQuestion) || 15;
    const customApiKey = req.body.customApiKey || null;
    const hostSocketId = req.body.hostSocketId || null;
    const sourceTitle = req.body.sourceTitle || filename;

    console.log(`[Creator Portal] Generating quiz for "${filename}" (${totalQuestions} Qs, ${difficulty})`);

    const questions = await generateQuizFromPDFText({
      pdfText,
      totalQuestions,
      topicDistribution,
      difficulty,
      customApiKey
    });

    let roomCode = generateRoomCode();
    while (getActiveRoom(roomCode)) {
      roomCode = generateRoomCode();
    }

    const cleanTopic = sourceTitle.replace(/\.(pdf|docx|txt|md)$/i, '').slice(0, 100);
    const preloadedRoom = createPreloadedRoom({
      roomCode,
      hostName,
      topic: cleanTopic,
      difficulty,
      questionCount: questions.length,
      timePerQuestion,
      questions,
      avatarSeed,
      hostSocketId,
      pdfText,
      topicDistribution,
      customApiKey
    });

    // Save to MongoDB QuizSession & QuizLibrary
    if (getDBStatus()) {
      try {
        await QuizSession.create({
          roomCode,
          topic: cleanTopic,
          preloadedQuestions: questions,
          sourceDocument: {
            filename,
            pageCount,
            topicDistribution,
            totalQuestions: questions.length
          },
          startedAt: new Date()
        });

        await Room.create({
          roomCode,
          hostSocketId: hostSocketId || 'HOST_PENDING',
          topic: cleanTopic,
          status: 'LOBBY',
          settings: preloadedRoom.settings,
          players: preloadedRoom.players
        });

        // Auto-save to QuizLibrary for future re-hosting
        await QuizLibrary.create({
          title: cleanTopic,
          topic: cleanTopic,
          difficulty,
          sourceType: filename.endsWith('.docx') ? 'DOCX' : filename.endsWith('.txt') || filename.endsWith('.md') ? 'TEXT' : 'PDF',
          questions,
          questionCount: questions.length,
          creatorName: hostName,
          tags: topicDistribution.map(t => t.topic).filter(Boolean)
        });
      } catch (dbErr) {
        console.warn('[DB Error on PDF Quiz Save]:', dbErr.message);
      }
    }

    if (hostSocketId && io.sockets.sockets.has(hostSocketId)) {
      const socket = io.sockets.sockets.get(hostSocketId);
      socket.join(roomCode);
      socket.emit('room_created', {
        roomCode,
        room: {
          roomCode,
          hostSocketId,
          topic: cleanTopic,
          status: 'LOBBY',
          settings: preloadedRoom.settings,
          players: preloadedRoom.players
        }
      });
    }

    res.json({
      success: true,
      roomCode,
      topic: cleanTopic,
      totalQuestions: questions.length,
      questions,
      room: {
        roomCode,
        hostSocketId: preloadedRoom.hostSocketId,
        topic: cleanTopic,
        status: 'LOBBY',
        settings: preloadedRoom.settings,
        players: preloadedRoom.players
      }
    });

  } catch (err) {
    console.error('[Document Generation Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to generate quiz from document.', error: err.message });
  }
});

// 3. Quiz Library Endpoints (Question Bank & Reusable Quizzes)
app.get('/api/library', async (req, res) => {
  try {
    const { search } = req.query;
    if (getDBStatus()) {
      let query = {};
      if (search) {
        query = {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { topic: { $regex: search, $options: 'i' } }
          ]
        };
      }
      const quizzes = await QuizLibrary.find(query).sort({ createdAt: -1 }).limit(30);
      return res.json({ success: true, quizzes });
    }

    // In-memory fallback
    const all = Array.from(inMemoryLibrary.values());
    const filtered = search 
      ? all.filter(q => q.title.toLowerCase().includes(search.toLowerCase()) || q.topic.toLowerCase().includes(search.toLowerCase()))
      : all;
    res.json({ success: true, quizzes: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/library', async (req, res) => {
  try {
    const validation = saveQuizToLibrarySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.error.format() });
    }

    const quizData = validation.data;
    if (getDBStatus()) {
      const created = await QuizLibrary.create(quizData);
      return res.json({ success: true, quiz: created });
    }

    const id = `lib-${Date.now()}`;
    const item = { ...quizData, _id: id, createdAt: new Date(), playsCount: 0 };
    inMemoryLibrary.set(id, item);
    res.json({ success: true, quiz: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/library/:id/launch', async (req, res) => {
  try {
    const { id } = req.params;
    let quiz = null;

    if (getDBStatus()) {
      quiz = await QuizLibrary.findById(id);
    } else {
      quiz = inMemoryLibrary.get(id);
    }

    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Saved quiz not found in library.' });
    }

    let roomCode = generateRoomCode();
    while (getActiveRoom(roomCode)) {
      roomCode = generateRoomCode();
    }

    const hostName = (req.body.hostName || 'Library Host').trim();
    const avatarSeed = req.body.avatarSeed || '⚡';
    const timePerQuestion = Number(req.body.timePerQuestion) || 15;

    const preloadedRoom = createPreloadedRoom({
      roomCode,
      hostName,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questionCount: quiz.questions.length,
      timePerQuestion,
      questions: quiz.questions,
      avatarSeed
    });

    if (getDBStatus()) {
      await QuizLibrary.findByIdAndUpdate(id, { $inc: { playsCount: 1 } });
    } else if (inMemoryLibrary.has(id)) {
      const item = inMemoryLibrary.get(id);
      item.playsCount = (item.playsCount || 0) + 1;
    }

    res.json({
      success: true,
      roomCode,
      topic: quiz.topic,
      totalQuestions: quiz.questions.length,
      room: sanitizeRoom(preloadedRoom)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function sanitizeRoom(room) {
  return {
    roomCode: room.roomCode,
    hostSocketId: room.hostSocketId,
    topic: room.topic,
    status: room.status,
    settings: room.settings,
    players: room.players
  };
}

// Fetch Room details
app.get('/api/rooms/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    if (getDBStatus()) {
      const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
      if (room) return res.json({ success: true, room });
    }
    res.status(404).json({ success: false, message: 'Room not found in persistent store' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch past quiz session history
app.get('/api/sessions/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    if (getDBStatus()) {
      const session = await QuizSession.findOne({ roomCode: roomCode.toUpperCase() }).sort({ createdAt: -1 });
      if (session) return res.json({ success: true, session });
    }
    res.status(404).json({ success: false, message: 'Session history not found' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server and connect to DB
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Quiz Builder Backend running on port ${PORT}`);
    console.log(`🔌 WebSocket Server active and listening for room connections`);
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
});
