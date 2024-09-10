// Imports
import { Injectable, OnModuleInit } from '@nestjs/common';
import { appEmitter } from 'src/constants/globals';

@Injectable()
export class DocService implements OnModuleInit {
  onModuleInit() {
    appEmitter.once('init', (app) => {
      this.buildDocumentSite(app);
    });
  }

  endPointData = {};

  async list() {
    return this.endPointData;
  }

  private async buildDocumentSite(app) {
    this.endPointData = this.getEndpoints(app);
    // console.log(this.endPointData);
  }

  getEndpoints(app) {
    const server = app.getHttpServer();
    const router = server._events.request._router;

    const availableRoutes: { endPoint: string; method: string }[] = router.stack
      .map((layer) => {
        if (layer.route) {
          return {
            endPoint: layer.route?.path,
            method: layer.route?.stack[0].method,
          };
        }
      })
      .filter((item) => item !== undefined);

    const coreModules: any = {};
    for (let index = 0; index < availableRoutes.length; index++) {
      const routeData = availableRoutes[index];
      const endPoint = routeData.endPoint;
      const hirarchySpans = endPoint
        .split('/')
        .filter((el) => el.trim() != '' && el);

      if (!coreModules[hirarchySpans[0]]) coreModules[hirarchySpans[0]] = {};
      for (let i = 1; i < hirarchySpans.length; i++) {
        const name = hirarchySpans[i];
        const isLast = i == hirarchySpans.length - 1;
        if (i == 1 && !coreModules[hirarchySpans[0]][name]) {
          coreModules[hirarchySpans[0]][name] = isLast
            ? {
                endPoint,
                method: routeData.method,
              }
            : {};
        } else if (
          i == 2 &&
          !coreModules[hirarchySpans[0]][hirarchySpans[1]][name]
        ) {
          coreModules[hirarchySpans[0]][hirarchySpans[1]][name] = {
            endPoint,
            method: routeData.method,
          };
        }
      }
    }

    return coreModules;
  }
}
