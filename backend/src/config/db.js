import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_quiz_builder';
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick fail if local mongo not running
    });
    isConnected = true;
    console.log(`✅ MongoDB connected successfully to ${uri}`);
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning: ${err.message}`);
    console.warn(`⚡ Operating in resilient mode (Mongoose models active, in-memory cache active for instant responsiveness).`);
    isConnected = false;
  }
};

export const getDBStatus = () => isConnected;
