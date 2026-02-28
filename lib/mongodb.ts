import mongoose from 'mongoose';

let cached = (global as any).mongoose as { conn: mongoose.Mongoose | null; promise: Promise<mongoose.Mongoose> | null };

if (!(global as any).mongoose) {
  (global as any).mongoose = { conn: null, promise: null };
  cached = (global as any).mongoose;
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
