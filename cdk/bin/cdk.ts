#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import * as dotenv from 'dotenv';
import path from 'path';
import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();
const env = app.node.tryGetContext('env') as string;
const envConfig = dotenv.config({ path: path.join(__dirname, `../../env/.env.${env}`) });
if (envConfig.error || !envConfig.parsed) {
  throw new Error('no env');
}
const envs = envConfig.parsed;

const synthesizer = new cdk.CliCredentialsStackSynthesizer({
  fileAssetsBucketName: envs.ASSET_BUCKET,
  bucketPrefix: `cdk`,
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

new CdkStack(app, 'CdkStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
