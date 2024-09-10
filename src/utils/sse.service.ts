import { Injectable } from '@nestjs/common';
import { k500Error } from 'src/constants/misc';
const SSE = require('express-sse');

@Injectable()
export class SseService {
  sse: any;
  constructor() {
    this.sse = new SSE(["array", "containing", "initial", "content", "(optional)"]);
  }

  send(eventName: string, content: any){
    this.sse.send(content, eventName);
  }
}
