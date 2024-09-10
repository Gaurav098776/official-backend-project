import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CryptService } from 'src/utils/crypt.service';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(private readonly cryptService: CryptService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((response) => {
        let data = JSON.stringify(response?.data);
        data = this.cryptService.encryptResponse(data);
        return { ...response, data };
      }),
    );
  }
}
