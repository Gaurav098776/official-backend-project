// Imports
import { Injectable } from '@nestjs/common';
import { k422ErrorMessage, kInternalError } from 'src/constants/responses';

@Injectable()
export class FunService {
  async promiseWithLimit(timeOut: number, callback) {
    try {
      const isOpen = await new Promise(async (resolve) => {
        try {
          setTimeout(() => resolve(k422ErrorMessage('Limit exceeds')), timeOut);
          callback((value) => {
            resolve(value);
          });
        } catch (error) {
          resolve(kInternalError);
        }
      });
      return isOpen;
    } catch (error) {
      return kInternalError;
    }
  }
}
