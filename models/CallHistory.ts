import mongoose from 'mongoose';

const CallHistorySchema = new mongoose.Schema({
  channelName: { type: String, required: true },
  hostAddress: { type: String, required: true },
  participants: [{ type: String }], // Array of addresses
  duration: Number,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  transcript: [{
    role: String,
    text: String,
    timestamp: Date
  }],
});

export default mongoose.models.CallHistory || mongoose.model('CallHistory', CallHistorySchema);
