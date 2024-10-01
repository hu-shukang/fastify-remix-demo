import awsLambdaFastify from '@fastify/aws-lambda';
import { app } from './index';

export const handler = awsLambdaFastify(app);
