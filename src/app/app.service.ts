// Imports
import { Injectable } from '@nestjs/common';
import { EnvConfig } from 'src/configs/env.config';

@Injectable()
export class AppService {
  getHello() {
    return {
      code_version: '5.0.89',
      server_version: EnvConfig.server.version,
    };
  }
}
