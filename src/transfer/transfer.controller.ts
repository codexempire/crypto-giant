import { Body, Controller, Post } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferDto } from './transfer.dto';

@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  async initiateTransfer(
    @Body() transferDto: TransferDto,
  ): Promise<{ message: string }> {
    const { senderAddress, recepientAddress, amount, pin } = transferDto;

    await this.transferService.transferFunds(
      senderAddress,
      recepientAddress,
      amount,
      pin,
    );

    return { message: 'Transfer successful' };
  }
}
