import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, envs: Record<string, string>, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaRole = iam.Role.fromRoleArn(this, `${envs.APP_NAME}-lambda-role-${envs.ENV}`, envs.LAMBDA_ROLE_ARN, {
      mutable: false,
    });

    /* asset bucket */
    const assetBucketArn = cdk.Fn.importValue(`${envs.ASSET_BUCKET}-arn`);
    const assetBucket = s3.Bucket.fromBucketArn(this, envs.ASSET_BUCKET, assetBucketArn);

    const layerCode = lambda.Code.fromBucket(assetBucket, 'layer.zip');
    const layerS3Location = layerCode.bind(this).s3Location;
    const layer = new lambda.LayerVersion(this, `${envs.APP_NAME}-layer-${envs.ENV}`, {
      layerVersionName: `${envs.APP_NAME}-layer-${envs.ENV}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      code: layerCode,
    });

    const serverLambdaCode = lambda.Code.fromBucket(assetBucket, 'server.zip');
    const serverLambdaS3Location = serverLambdaCode.bind(this).s3Location;
    new lambda.Function(this, `${envs.APP_NAME}-server-${envs.ENV}`, {
      functionName: `${envs.APP_NAME}-server-${envs.ENV}`,
      description: `${envs.APP_NAME}-server-${envs.ENV}`,
      code: serverLambdaCode,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      layers: [layer],
      environment: envs,
      role: lambdaRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 512,
    });

    new cdk.CfnOutput(this, `${envs.APP_NAME}-layer-${envs.ENV}-s3-location`, {
      value: `s3://${layerS3Location?.bucketName}/${layerS3Location?.objectKey}`,
      exportName: `${envs.APP_NAME}-layer-${envs.ENV}-s3-location`,
    });

    new cdk.CfnOutput(this, `${envs.APP_NAME}-server-lambda-${envs.ENV}-s3-location`, {
      value: `s3://${serverLambdaS3Location?.bucketName}/${serverLambdaS3Location?.objectKey}`,
      exportName: `${envs.APP_NAME}-server-lambda-${envs.ENV}-s3-location`,
    });
  }
}
