import { Test, TestingModule } from '@nestjs/testing';
import { TransferService } from './transfer.service';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Wallet } from 'src/schema/wallet.schema';
import { Transaction } from 'src/schema/transaction.schema';
import { WalletLog } from 'src/schema/wallet-log.schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

describe('TransferService', () => {
  let service: TransferService;
  let walletModel: any;
  let transactionModel: any;
  let walletLogModel: any;
  let connection: any;
  let session: any;

  beforeEach(async () => {
    session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    };

    walletModel = {
      findOne: jest.fn(() => ({
        session: jest.fn(),
      })),
      updateOne: jest.fn(),
    };

    transactionModel = {
      create: jest.fn(),
      save: jest.fn(),
    };

    walletLogModel = {
      create: jest.fn(),
      save: jest.fn(),
    };

    connection = {
      startSession: jest.fn().mockResolvedValue(session),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: getModelToken('wallet'), useValue: walletModel },
        { provide: getModelToken('transaction'), useValue: transactionModel },
        { provide: getModelToken('wallet-log'), useValue: walletLogModel },
        { provide: getConnectionToken(), useValue: connection },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should transfer funds successfully', async () => {
    const senderWallet = {
      address: 'sender',
      balance: 1000,
      pinHash: 'hashedPin',
    };
    const recipientWallet = { address: 'recipient', balance: 500 };
    const amount = 100;
    const pin = '1234';

    walletModel.findOne
      .mockResolvedValueOnce(senderWallet)
      .mockResolvedValueOnce(recipientWallet);

    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

    walletModel.updateOne.mockResolvedValueOnce({}).mockResolvedValueOnce({});

    const mockTransaction = { create: jest.fn() };
    transactionModel.save.mockResolvedValue(mockTransaction);
    walletLogModel.save.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    await service.transferFunds('sender', 'recipient', amount, pin);
    expect(session.startTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).toHaveBeenCalled();

    expect(walletModel.updateOne).toHaveBeenCalledWith(
      { address: 'sender' },
      { $inc: { balance: -amount } },
      { session },
    );
    expect(walletModel.updateOne).toHaveBeenCalledWith(
      { address: 'recipient' },
      { $inc: { balance: amount } },
      { session },
    );

    expect(walletLogModel.create).toHaveBeenCalledTimes(2);
    expect(transactionModel.create).toHaveBeenCalled();
  });

  it('should throw NotFoundException if sender wallet not found', async () => {
    walletModel.findOne.mockResolvedValueOnce(null);

    await expect(
      service.transferFunds('sender', 'recipient', 100, '1234'),
    ).rejects.toThrow(NotFoundException);

    expect(session.abortTransaction).toHaveBeenCalled();
  });

  it('should throw ConflictException if PIN is incorrect', async () => {
    const senderWallet = {
      address: 'sender',
      balance: 1000,
      pinHash: bcrypt.hashSync('1234', 10),
    };
    const recipientWallet = { address: 'recipient', balance: 500 };

    walletModel.findOne
      .mockResolvedValueOnce(senderWallet)
      .mockResolvedValueOnce(recipientWallet);

    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

    await expect(
      service.transferFunds('sender', 'recipient', 100, '2345'),
    ).rejects.toThrow(ConflictException);

    expect(session.abortTransaction).toHaveBeenCalled();
  });

  it('should throw BadRequestException if sender balance is insufficient', async () => {
    const senderWallet = {
      address: 'sender',
      balance: 50,
      pinHash: bcrypt.hashSync('1234', 10),
    };
    const recipientWallet = { address: 'recipient', balance: 500 };

    walletModel.findOne
      .mockResolvedValueOnce(senderWallet)
      .mockResolvedValueOnce(recipientWallet);

    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

    await expect(
      service.transferFunds('sender', 'recipient', 100, '1234'),
    ).rejects.toThrow(BadRequestException);

    expect(session.abortTransaction).toHaveBeenCalled();
  });
});
