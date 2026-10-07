import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { createRequire } from 'module';
import { connectDB, getDBStatus } from './config/db.js';
import { setupQuizSocket, createPreloadedRoom, generateRoomCode, getActiveRoom } from './socket/quizSocket.js';
import { Room } from './models/Room.js';
import { QuizSession } from './models/QuizSession.js';
import { generateQuizFromPDFText, suggestTopicsFromPDF } from './services/aiService.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

// Configure Multer for in-memory PDF uploads (max 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files (.pdf) are supported.'));
    }
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

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

async function extractTextFromPdfBuffer(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || '').replace(/\r\n/g, '\n').trim();
    if (text.length >= 20) {
      return { text, pageCount: data.numpages || 1 };
    }
  } catch (err) {
    console.warn('[PDF Primary Parser Warning]:', err.message);
  }

  // Resilient text stream extractor fallback for uncompressed or non-standard PDF streams
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

    const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = arrayTjRegex.exec(rawString)) !== null) {
      const inner = match[1];
      const partRegex = /\(([^)]+)\)/g;
      let part;
      let line = '';
      while ((part = partRegex.exec(inner)) !== null) {
        line += part[1];
      }
      if (line.trim()) textMatches.push(line.trim());
    }

    if (textMatches.length > 0) {
      const combined = textMatches.join('\n').trim();
      return { text: combined, pageCount: 1 };
    }
  } catch (fallbackErr) {
    console.warn('[PDF Fallback Parser Warning]:', fallbackErr.message);
  }

  return { text: '', pageCount: 1 };
}

// 1. PDF Parsing Endpoint: Extracts raw text and detects prospective topics
app.post('/api/parse-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    const { text: cleanText, pageCount } = await extractTextFromPdfBuffer(req.file.buffer);

    if (!cleanText || cleanText.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from this PDF. Please ensure the document is not an un-OCR scanned image.'
      });
    }

    const suggestedTopics = suggestTopicsFromPDF(cleanText);
    const previewSnippet = cleanText.slice(0, 1200);

    console.log(`[PDF Parsed] "${req.file.originalname}" (${pageCount} pages, ${cleanText.length} chars)`);

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
    console.error('[PDF Parse Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to parse PDF document.', error: err.message });
  }
});

// 2. Generate Structured Quiz from PDF text strictly enforcing topic-wise split
app.post('/api/generate-from-pdf', upload.single('pdf'), async (req, res) => {
  try {
    let pdfText = req.body.pdfText;
    let filename = req.body.filename || 'Educational Material';
    let pageCount = Number(req.body.pageCount) || 1;

    // If PDF file was passed directly in multipart form
    if (req.file && req.file.buffer) {
      const extracted = await extractTextFromPdfBuffer(req.file.buffer);
      pdfText = extracted.text || '';
      filename = req.file.originalname;
      pageCount = extracted.pageCount || 1;
    }

    if (!pdfText || pdfText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'No source PDF text provided.' });
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

    // Generate questions strictly conforming to the topic distribution schema
    const questions = await generateQuizFromPDFText({
      pdfText,
      totalQuestions,
      topicDistribution,
      difficulty,
      customApiKey
    });

    // Generate unique Room Code
    let roomCode = generateRoomCode();
    while (getActiveRoom(roomCode)) {
      roomCode = generateRoomCode();
    }

    // Register preloaded room in active game engine
    const cleanTopic = sourceTitle.replace(/\.pdf$/i, '').slice(0, 100);
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

    // Save to MongoDB QuizSession schema associated with the creator's new Room Code
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
        console.log(`[DB Saved] QuizSession and Room preloaded for code: ${roomCode}`);
      } catch (dbErr) {
        console.warn('[DB Error on PDF Quiz Save]:', dbErr.message);
      }
    }

    // If host socket is connected, join to room immediately
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
    console.error('[PDF Generation Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to generate quiz from document.', error: err.message });
  }
});

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
