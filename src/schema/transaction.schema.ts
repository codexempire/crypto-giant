import { Schema, Document } from 'mongoose';

export interface Transaction extends Document {
  from: string;
  to: string;
  amount: number;
  transactionHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    amount: { type: Number, required: true },
    transactionHash: { type: String, unique: true },
  },
  {
    timestamps: true,
    collection: 'transaction',
  },
);
