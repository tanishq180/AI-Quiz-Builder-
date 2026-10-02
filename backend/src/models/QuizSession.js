import mongoose from 'mongoose';

const answerItemSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
  userAnswer: { type: Number, default: -1 }, // -1 if not answered / timed out
  timeSpent: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 }
}, { _id: false });

const quizSessionSchema = new mongoose.Schema({
  roomCode: { 
    type: String, 
    required: true, 
    index: true 
  },
  // Map of socketId to Array of answer items
  playerData: {
    type: Map,
    of: [answerItemSchema],
    default: {}
  },
  // Preloaded curriculum questions for PDF-based games
  preloadedQuestions: {
    type: Array,
    default: []
  },
  sourceDocument: {
    filename: { type: String },
    pageCount: { type: Number },
    topicDistribution: { type: Array, default: [] },
    totalQuestions: { type: Number }
  },
  topic: { type: String },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, { timestamps: true });

export const QuizSession = mongoose.models.QuizSession || mongoose.model('QuizSession', quizSessionSchema);
