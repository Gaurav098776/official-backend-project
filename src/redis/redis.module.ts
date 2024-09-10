// Imports
import { DynamicModule, Module } from '@nestjs/common';

@Module({})
export class RedisModule {
  static register(options: {
    host: string;
    port: string;
    auth_user?: string;
    auth_pass: string;
  }): DynamicModule {
    return { module: RedisModule };
  }
}
