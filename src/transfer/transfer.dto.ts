import {
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  Length,
  Min,
  Matches,
} from 'class-validator';

export class TransferDto {
  @Matches(
    /^0x[a-fA-F0-9]{40}$|^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    { message: 'Invalid crypto address format' },
  )
  @IsNotEmpty()
  @IsString()
  senderAddress: string;

  @Matches(
    /^0x[a-fA-F0-9]{40}$|^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    { message: 'Invalid crypto address format' },
  )
  @IsNotEmpty()
  @IsString()
  recepientAddress: string;

  @Min(1)
  @IsNumber()
  amount: number;

  @Length(4, 4)
  @IsNumberString()
  pin: string;
}
