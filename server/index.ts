import process from 'node:process';
import { remixFastify } from '@mcansh/remix-fastify';
import { fastify } from 'fastify';
import sourceMapSupport from 'source-map-support';

sourceMapSupport.install();

export const app = fastify();

app.register(remixFastify);

if (process.env.ENV === 'local') {
  const host = process.env.HOST === 'true' ? '0.0.0.0' : '127.0.0.1';
  const desiredPort = Number(process.env.PORT) || 3000;
  app
    .listen({ port: desiredPort, host })
    .then((address) => {
      console.log(`app ready: ${address}`);
    })
    .catch(console.error);
}
