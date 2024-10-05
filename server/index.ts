import process from 'node:process';
import { remixFastify } from '@mcansh/remix-fastify';
import { fastify } from 'fastify';

export const app = fastify();
console.log('start remix');
await app.register(remixFastify);
console.log('end remix');
app.get('/hello', async function handler(request, reply) {
  return { hello: 'world' };
});

if (process.env.ENV === 'local') {
  const host = process.env.HOST === 'true' ? '0.0.0.0' : '127.0.0.1';
  const desiredPort = Number(process.env.PORT) || 3000;
  let address = await app.listen({ port: desiredPort, host });
  console.log(`app ready: ${address}`);
}
