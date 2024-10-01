import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, envs: Record<string, string>, props?: cdk.StackProps) {
    super(scope, id, props);

    const codepipelineRole = iam.Role.fromRoleArn(
      this,
      `${envs.APP_NAME}-codepipeline-role-${envs.ENV}`,
      envs.CODE_PIPELINE_ROLE_ARN,
      { mutable: false },
    );

    /** asset bucket */
    const assetBucket = new s3.Bucket(this, envs.ASSET_BUCKET);

    const buildProject = new codebuild.PipelineProject(this, `${envs.APP_NAME}-build-${envs.ENV}`, {
      projectName: `${envs.APP_NAME}-build-${envs.ENV}`,
      role: codepipelineRole,
      queuedTimeout: cdk.Duration.hours(0.5),
      timeout: cdk.Duration.hours(0.5),
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          ENV: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: envs.ENV,
          },
          SYNTH_TEMPLETE: {
            type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
            value: `${envs.APP_NAME}-synth-template-${envs.ENV}.yaml`,
          },
        },
      },
    });

    const pipeline = new codepipeline.Pipeline(this, `${envs.APP_NAME}-pipeline-${envs.ENV}`, {
      pipelineName: `${envs.APP_NAME}-pipeline-${envs.ENV}`,
      artifactBucket: assetBucket,
      role: codepipelineRole,
    });

    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    const sourceAction = new codepipeline_actions.GitHubSourceAction({
      actionName: 'GitHub_Source',
      owner: 'hu-shukang',
      repo: 'fastify-remix-demo',
      branch: envs.BRANCH,
      oauthToken: cdk.SecretValue.secretsManager('github-token', {
        jsonField: 'oauthToken',
      }),
      output: sourceOutput,
      trigger: codepipeline_actions.GitHubTrigger.WEBHOOK,
      runOrder: 1,
    });

    const buildAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
      role: codepipelineRole,
      runOrder: 2,
    });

    const deployAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'CloudFormation-CreateUpdateStack',
      stackName: `${envs.APP_NAME}-${envs.ENV}`,
      adminPermissions: true,
      templatePath: buildOutput.atPath(`${envs.APP_NAME}-synth-template-${envs.ENV}.yaml`),
      deploymentRole: codepipelineRole,
      replaceOnFailure: true,
      role: codepipelineRole,
      runOrder: 3,
    });

    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction],
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [buildAction],
    });

    pipeline.addStage({
      stageName: 'Deploy',
      actions: [deployAction],
    });
  }
}
