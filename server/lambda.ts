import awsLambdaFastify from '@fastify/aws-lambda';
import { app } from './index';

const proxy = awsLambdaFastify(app);

exports.handler = proxy;
