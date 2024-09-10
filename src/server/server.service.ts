import * as os from 'os';
const cluster = require('cluster');
import { Injectable } from '@nestjs/common';

const numCPUs = os.cpus().length;

@Injectable()
export class ServerService {
  static cluster(callback: any): void {
    try {
      if (cluster.isMaster) {
        console.log(`Master server started on ${process.pid}`);
        for (let i = 0; i < numCPUs; i++) {
          try {
            cluster.fork();
          } catch (error) {}
        }
        cluster.on('exit', (worker) => {
          console.log(`Worker ${worker.process.pid} died. Restarting`);
          cluster.fork();
        });
      } else {
        console.log(`Cluster server started on ${process.pid}`);
        callback();
      }
    } catch (error) {}
  }
}
