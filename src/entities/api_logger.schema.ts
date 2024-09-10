// Imports
import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type APILoggerDocument = APILogger & Document;

@Schema()
export class APILogger {
  @Prop({ required: true })
  apiEndpoint: string;

  @Prop({ required: false })
  type: string;

  @Prop({ required: false })
  userId: string;

  @Prop({ required: false })
  adminId: number;

  @Prop({ required: false })
  loanId: number;

  @Prop({ required: false })
  body: string;

  @Prop({ required: false })
  headers: string;

  @Prop({ required: false })
  data: string;

  @Prop({ required: false })
  ip: string;

  @Prop({ required: false })
  sourceId: string;

  @Prop({ required: false })
  traceId: number;
}

export const APILoggerSchema = SchemaFactory.createForClass(APILogger);
