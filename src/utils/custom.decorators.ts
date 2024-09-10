import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getClientIp } from '@supercharge/request-ip/dist';

export const IPConfig = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    try {
      const request = ctx.switchToHttp().getRequest();
      let ip: string = getClientIp(request);
      if (ip) ip = ip.replace(/f/g, '').replace(/:/g, '');

      if (ip == '1') return '110.227.250.199';
      return ip;
    } catch (error) {}
  },
);
