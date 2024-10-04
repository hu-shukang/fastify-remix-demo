import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, envs: Record<string, string>, props?: cdk.StackProps) {
    super(scope, id, props);
    const timestamp = this.node.tryGetContext('timestamp') as string;
    const lambdaRole = iam.Role.fromRoleArn(this, `${envs.APP_NAME}-lambda-role-${envs.ENV}`, envs.LAMBDA_ROLE_ARN, {
      mutable: false,
    });

    /* asset bucket */
    const assetBucketArn = cdk.Fn.importValue(`${envs.ASSET_BUCKET}-arn`);
    const assetBucket = s3.Bucket.fromBucketArn(this, envs.ASSET_BUCKET, assetBucketArn);

    /* web bucket */
    const webBucketArn = cdk.Fn.importValue(`${envs.WEB_BUCKET}-arn`);
    const webBucket = s3.Bucket.fromBucketArn(this, envs.WEB_BUCKET, webBucketArn);

    const layer = new lambda.LayerVersion(this, `${envs.APP_NAME}-layer-${envs.ENV}`, {
      layerVersionName: `${envs.APP_NAME}-layer-${envs.ENV}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      code: lambda.Code.fromBucket(assetBucket, `layer-${timestamp}.zip`),
    });

    const serverLambda = new lambda.Function(this, `${envs.APP_NAME}-server-${envs.ENV}`, {
      functionName: `${envs.APP_NAME}-server-${envs.ENV}`,
      description: `${envs.APP_NAME}-server-${envs.ENV}`,
      code: lambda.Code.fromBucket(assetBucket, `server-${timestamp}.zip`),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda.handler',
      layers: [layer],
      environment: envs,
      role: lambdaRole,
      timeout: cdk.Duration.minutes(15),
      memorySize: 2048,
    });

    // 创建 API Gateway
    const api = new apigateway.LambdaRestApi(this, `${envs.APP_NAME}-api-${envs.ENV}`, {
      restApiName: `${envs.APP_NAME}-api-${envs.ENV}`,
      handler: serverLambda,
      proxy: true,
      deployOptions: { stageName: envs.ENV },
    });

    const apiGatewayDomainName = `${api.restApiId}.execute-api.${this.region}.amazonaws.com`;
    const oai = new cloudfront.OriginAccessIdentity(this, `${envs.APP_NAME}-oai-${envs.ENV}`);

    const staticBehavior: cloudfront.BehaviorOptions = {
      origin: origins.S3BucketOrigin.withOriginAccessIdentity(webBucket, { originAccessIdentity: oai }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    };

    // 允许 OAI 访问 S3 存储桶
    webBucket.grantRead(oai);

    // 创建 CloudFront 分配
    new cloudfront.Distribution(this, `${envs.APP_NAME}-cloudfront-${envs.ENV}`, {
      // 默认行为，用于所有非静态文件的请求，指向 Lambda
      defaultBehavior: {
        origin: new origins.HttpOrigin(apiGatewayDomainName, {
          originPath: `/${envs.ENV}`,
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // 强制 HTTPS
      },
      // 添加针对静态文件的行为，指向 S3
      additionalBehaviors: {
        '/assets/*': staticBehavior,
      },
    });
  }
}
