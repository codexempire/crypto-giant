import { Test, TestingModule } from '@nestjs/testing';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';
import { TransferDto } from './transfer.dto';
import { faker } from '@faker-js/faker';

describe('TransferController', () => {
  let controller: TransferController;
  let service: TransferService;

  const mockTransferService = {
    transferFunds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        {
          provide: TransferService,
          useValue: mockTransferService,
        },
      ],
    }).compile();

    controller = module.get<TransferController>(TransferController);
    service = module.get<TransferService>(TransferService);
  });

  it('should call transferFunds with random generated values', async () => {
    const transferDto: TransferDto = {
      senderAddress: faker.finance.bitcoinAddress(),
      recepientAddress: faker.finance.bitcoinAddress(),
      amount: Number(faker.finance.amount({ min: 10, max: 100, dec: 2 })),
      pin: '1235',
    };

    await controller.initiateTransfer(transferDto);

    expect(service.transferFunds).toHaveBeenCalledWith(
      transferDto.senderAddress,
      transferDto.recepientAddress,
      transferDto.amount,
      transferDto.pin,
    );
  });
});
