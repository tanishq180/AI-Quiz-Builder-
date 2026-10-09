import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
  explanation: { type: String, default: '' },
  subFocus: { type: String, default: '' },
  timeLimit: { type: Number, default: 15 }
}, { _id: false });

const quizLibrarySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'Standard'],
    default: 'Medium'
  },
  sourceType: {
    type: String,
    enum: ['PDF', 'TOPIC_PROMPT', 'DOCX', 'TEXT', 'MANUAL'],
    default: 'TOPIC_PROMPT'
  },
  questions: [questionSchema],
  questionCount: {
    type: Number,
    required: true
  },
  creatorName: {
    type: String,
    default: 'Creator'
  },
  tags: [{
    type: String,
    trim: true
  }],
  playsCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const QuizLibrary = mongoose.models.QuizLibrary || mongoose.model('QuizLibrary', quizLibrarySchema);
