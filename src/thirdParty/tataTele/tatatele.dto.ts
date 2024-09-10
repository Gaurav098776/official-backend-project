import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MakeAgentToCustomerCallDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  from: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  to: number;

  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  adminId: number;

  @IsNumber()
  @Type(() => Number)
  roleId: number;
}
