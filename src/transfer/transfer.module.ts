import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionSchema } from 'src/schema/transaction.schema';
import { WalletLogSchema } from 'src/schema/wallet-log.schema';
import { WalletSchema } from 'src/schema/wallet.schema';
import { ModelName } from 'src/modelname';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ModelName.wallet, schema: WalletSchema },
      { name: ModelName.transaction, schema: TransactionSchema },
      { name: ModelName.walletLog, schema: WalletLogSchema },
    ]),
  ],
  controllers: [TransferController],
  providers: [TransferService],
})
export class TransferModule {}
