import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let reconnectTimer = null;
let reconnectDelayMs = 5000;
const MAX_RECONNECT_DELAY_MS = 60000;

// Setup event listeners for dynamic connection state tracking
mongoose.connection.on('connected', () => {
  isConnected = true;
  reconnectDelayMs = 5000; // Reset backoff upon successful connection
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  console.log(`✅ MongoDB connected successfully.`);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn(`⚠️ MongoDB disconnected. Scheduling background reconnect...`);
  scheduleReconnect();
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.warn(`⚠️ MongoDB connection error: ${err.message}`);
});

function scheduleReconnect() {
  if (reconnectTimer) return;
  
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_quiz_builder';
    console.log(`🔄 Attempting MongoDB background reconnect (${reconnectDelayMs / 1000}s backoff)...`);
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
    } catch (err) {
      reconnectDelayMs = Math.min(reconnectDelayMs * 1.5, MAX_RECONNECT_DELAY_MS);
      scheduleReconnect();
    }
  }, reconnectDelayMs);

  if (reconnectTimer.unref) reconnectTimer.unref();
}

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_quiz_builder';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick initial check
    });
    isConnected = true;
  } catch (err) {
    console.warn(`⚠️ MongoDB initial connection warning: ${err.message}`);
    console.warn(`⚡ Operating in resilient mode (in-memory cache active, background auto-reconnect running).`);
    isConnected = false;
    scheduleReconnect();
  }
};

export const getDBStatus = () => isConnected;
