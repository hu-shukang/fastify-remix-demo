import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, envs: Record<string, string>, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaRole = iam.Role.fromRoleArn(this, `${envs.APP_NAME}-lambda-role-${envs.env}`, envs.LAMBDA_ROLE_ARN, {
      mutable: false,
    });

    /** asset bucket */
    const assetBucket = new s3.Bucket(this, envs.ASSET_BUCKET);

    const layer = new lambda.LayerVersion(this, `${envs.APP_NAME}-layer-${envs.env}`, {
      layerVersionName: `${envs.APP_NAME}-layer-${envs.env}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      code: lambda.Code.fromBucket(assetBucket, 'layer'),
    });

    new lambda.Function(this, `${envs.APP_NAME}-server-${envs.env}`, {
      functionName: `${envs.APP_NAME}-server-${envs.env}`,
      description: `${envs.APP_NAME}-server-${envs.env}`,
      code: lambda.Code.fromBucket(assetBucket, 'server'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      layers: [layer],
      environment: envs,
      role: lambdaRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
    });
  }
}
