import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Transaction } from 'src/schema/transaction.schema';
import { WalletLog } from 'src/schema/wallet-log.schema';
import { Wallet } from 'src/schema/wallet.schema';

@Injectable()
export class TransferService {
  connection: Connection;
  static connection: Partial<Connection>;
  constructor(
    @InjectModel('wallet') private walletModel: Model<Wallet>,
    @InjectModel('transaction') private transactionModel: Model<Transaction>,
    @InjectModel('wallet-log') private walletLogModel: Model<WalletLog>,
    @InjectConnection() mongoconnection: Connection,
  ) {
    this.connection = mongoconnection;
  }

  private createTransactionHash(
    from: string,
    to: string,
    amount: number,
    timestamp: Date,
  ): string {
    return crypto
      .createHash('sha256')
      .update(from + to + amount.toString() + timestamp.toISOString())
      .digest('hex');
  }

  private async logWalletChange(
    walletAddress: string,
    operation: 'credit' | 'debit',
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    session: any,
  ) {
    await this.walletLogModel.create(
      [
        {
          walletAddress,
          operation,
          amount,
          balanceBefore,
          balanceAfter,
          timestamp: new Date(),
        },
      ],
      { session },
    );
  }

  async transferFunds(
    senderAddress: string,
    recepientAddress: string,
    amount: number,
    pin: string,
  ): Promise<void> {
    const session = await this.connection.startSession();

    session.startTransaction();

    try {
      const senderWallet: Wallet = await this.walletModel.findOne(
        { address: senderAddress },
        null,
        { session },
      );
      const recepientWallet: Wallet = await this.walletModel.findOne(
        { address: recepientAddress },
        null,
        { session },
      );

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      if (!recepientWallet) {
        throw new NotFoundException('Receipient wallets not found');
      }

      const walletPinMatchesThePassword = await bcrypt.compare(
        pin,
        senderWallet.pinHash,
      );

      if (!walletPinMatchesThePassword) {
        throw new ConflictException('Pin incorrect');
      }

      if (senderWallet.balance < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const senderWalletBalanceBefore = senderWallet.balance;
      const recepientWalletBalanceBefore = recepientWallet.balance;

      // Atomic debit and credit
      await this.walletModel.updateOne(
        { address: senderAddress },
        { $inc: { balance: -amount } },
        { session },
      );

      await this.walletModel.updateOne(
        { address: recepientAddress },
        { $inc: { balance: amount } },
        { session },
      );

      await this.logWalletChange(
        senderAddress,
        'debit',
        amount,
        senderWalletBalanceBefore,
        senderWalletBalanceBefore - amount,
        session,
      );
      await this.logWalletChange(
        recepientAddress,
        'credit',
        amount,
        recepientWalletBalanceBefore,
        recepientWalletBalanceBefore + amount,
        session,
      );

      // Create transaction record with timestamp
      const timestamp = new Date();
      const transactionHash = this.createTransactionHash(
        senderAddress,
        recepientAddress,
        amount,
        timestamp,
      );

      await this.transactionModel.create(
        [
          {
            from: senderAddress,
            to: recepientAddress,
            amount,
            timestamp,
            transactionHash,
          },
        ],
        { session },
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
