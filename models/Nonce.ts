import mongoose from 'mongoose';

const NonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // TTL: auto-delete after 10 minutes
});

export default mongoose.models.Nonce || mongoose.model('Nonce', NonceSchema);
