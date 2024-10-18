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
  constructor(
    @InjectModel('wallet') private walletModel: Model<Wallet>,
    @InjectModel('transaction') private transactionModel: Model<Transaction>,
    @InjectModel('wallet-log') private walletLogModel: Model<WalletLog>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

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
    const log = new this.walletLogModel({
      walletAddress,
      operation,
      amount,
      balanceBefore,
      balanceAfter,
      timestamp: new Date(),
    });
    await log.save({ session });
  }

  async transferFunds(
    senderAddress: string,
    recepientAddress: string,
    amount: number,
    pin: string,
  ): Promise<void> {
    const session = await this.connection.startSession();
    // const session = null;

    session.startTransaction();

    try {
      const senderWallet: Wallet = await this.walletModel
        .findOne({ address: senderAddress })
        .session(session);
      const recepientWallet: Wallet = await this.walletModel
        .findOne({ address: recepientAddress })
        .session(session);

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
      await this.walletModel
        .updateOne({ address: senderAddress }, { $inc: { balance: -amount } })
        .session(session);

      await this.walletModel
        .updateOne({ address: recepientAddress }, { $inc: { balance: amount } })
        .session(session);

      // Log the changes
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

      const transaction = new this.transactionModel({
        from: senderAddress,
        to: recepientAddress,
        amount,
        timestamp,
        transactionHash,
      });

      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
