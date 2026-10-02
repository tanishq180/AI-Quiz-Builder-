import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  username: { type: String, required: true, trim: true, maxlength: 24 },
  score: { type: Number, default: 0 },
  isReady: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  avatarSeed: { type: String, default: '⚡' },
  isDisconnected: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomCode: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    uppercase: true,
    trim: true,
    minlength: 6,
    maxlength: 6
  },
  hostSocketId: { type: String, required: true },
  topic: { type: String, required: true, trim: true, maxlength: 120 },
  status: { 
    type: String, 
    enum: ['LOBBY', 'GENERATING', 'IN_PROGRESS', 'FINISHED'], 
    default: 'LOBBY' 
  },
  settings: {
    questionCount: { type: Number, default: 5, min: 2, max: 15 },
    timePerQuestion: { type: Number, default: 15, min: 5, max: 60 },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' }
  },
  players: [playerSchema],
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-expire after 24 hrs
}, { timestamps: true });

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
