import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true },
  name: String,
  email: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
