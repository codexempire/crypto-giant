import { Schema, Document } from 'mongoose';

export interface WalletLog extends Document {
  walletAddress: string;
  operation: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const WalletLogSchema = new Schema(
  {
    walletAddress: { type: String, required: true },
    operation: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'wallet-log',
  },
);
