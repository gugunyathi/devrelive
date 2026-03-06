/**
 * ProcessedPayment — tracks every fulfilled Base Pay transaction.
 * Unique index on txId prevents replay attacks.
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessedPayment extends Document {
  txId: string;
  sender: string;
  recipient: string;
  amount: string;
  purpose: string;        // e.g. 'repair' | 'call'
  userAddress: string;    // authenticated user who triggered the payment
  processedAt: Date;
}

const ProcessedPaymentSchema = new Schema<IProcessedPayment>({
  txId:        { type: String, required: true, unique: true },
  sender:      { type: String, required: true },
  recipient:   { type: String, required: true },
  amount:      { type: String, required: true },
  purpose:     { type: String, required: true },
  userAddress: { type: String, required: true },
  processedAt: { type: Date, default: () => new Date() },
});

const ProcessedPayment: Model<IProcessedPayment> =
  mongoose.models.ProcessedPayment ??
  mongoose.model<IProcessedPayment>('ProcessedPayment', ProcessedPaymentSchema);

export default ProcessedPayment;
