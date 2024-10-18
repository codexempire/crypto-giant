import { Schema, Document } from 'mongoose';

export interface Wallet extends Document {
  address: string;
  balance: number;
  pinHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export const WalletSchema = new Schema(
  {
    address: { type: String, unique: true, required: true },
    balance: { type: Number, default: 0 },
    pinHash: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'wallet',
  },
);
