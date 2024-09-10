// Imports
import { Module } from '@nestjs/common';
import { DocService } from './doc.service';
import { DocController } from './doc.controller';

@Module({
  controllers: [DocController],
  providers: [DocService],
  exports: [DocService],
})
export class DocModule {}
