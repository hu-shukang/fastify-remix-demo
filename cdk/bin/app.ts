#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();
const env = app.node.tryGetContext('env') as string;
const envFilePath = path.join(__dirname, `../../env/.env.${env}`);
const envConfig = dotenv.config({ path: envFilePath });
if (envConfig.error || !envConfig.parsed) {
  throw new Error('no env');
}
const envs = envConfig.parsed;
const synthesizer = new cdk.CliCredentialsStackSynthesizer({
  fileAssetsBucketName: 'hsk-cdk',
  bucketPrefix: `${envs.APP_NAME}-cdk`,
  qualifier: envs.APP_NAME,
});

new InfraStack(app, `InfraStack-${envs.ENV}`, envs, {
  stackName: `InfraStack-${envs.ENV}`,
  synthesizer: synthesizer,
  env: {
    account: envs.AWS_ACCOUNT,
    region: envs.REGION,
  },
});
