// Imports
import { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type UserOnlineTimeDocument = UserOnlineTime & Document;

@Schema()
export class UserOnlineTime {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  time: Date;
}

// Schema -> MongoDB
export const UserOnlineTimeSchema =
  SchemaFactory.createForClass(UserOnlineTime);
