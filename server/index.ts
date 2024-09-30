import process from "node:process";
import { remixFastify } from "@mcansh/remix-fastify";
import { fastify } from "fastify";
import sourceMapSupport from "source-map-support";

sourceMapSupport.install();

const app = fastify();

await app.register(remixFastify);

const host = process.env.HOST === "true" ? "0.0.0.0" : "127.0.0.1";
const desiredPort = Number(process.env.PORT) || 3000;
let address = await app.listen({ port: desiredPort, host });

console.log(`app ready: ${address}`);
