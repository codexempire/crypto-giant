import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransferModule } from './transfer/transfer.module';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionSchema } from './schema/transaction.schema';
import { WalletLogSchema } from './schema/wallet-log.schema';
import { WalletSchema } from './schema/wallet.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule.forRoot()],
      useFactory(config: ConfigService) {
        return {
          uri: config.get<string>('MONGODB_URL'),
        };
      },
      inject: [ConfigService],
    }),
    // MongooseModule.forFeature([
    //   { name: 'wallet', schema: WalletSchema },
    //   { name: 'transaction', schema: TransactionSchema },
    //   { name: 'walletog', schema: WalletLogSchema },
    // ]),
    TransferModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
