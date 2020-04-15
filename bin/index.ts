#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { VpcStack } from "../lib/vpc";
import { AlbStack } from "../lib/alb";
import { EcsClusterStack } from "../lib/ecs-cluster";
import { Ec2NrpcStack } from "../lib/ec2-nrpc";
import { EcsXyzBffServiceStack } from "../lib/ecs-xyz-bff-service";
import { EcsAbcBffServiceStack } from "../lib/ecs-abc-bff-service";

const app = new cdk.App();
const vpcStack = new VpcStack(app, "PocVpcStack");
const albStack = new AlbStack(app, "PocAlbStack", { vpc: vpcStack.vpc });
const ecsClusterStack = new EcsClusterStack(app, "PocEcsClusterStack", {
  vpc: vpcStack.vpc
});
const ecsXyzBffServiceStack = new EcsXyzBffServiceStack(
  app,
  "PocEcsXyzBffServiceStack",
  {
    cluster: ecsClusterStack.cluster
  }
);
const ecsAbcBffServiceStack = new EcsAbcBffServiceStack(
  app,
  "PocEcsAbcBffServiceStack",
  {
    cluster: ecsClusterStack.cluster
  }
);
const ec2NrpcStack = new Ec2NrpcStack(
  app,
  "PocEc2NrpcStack",
  {
    vpc: vpcStack.vpc,
    listener: albStack.listener
  }
);
ec2NrpcStack.addDependency(ecsXyzBffServiceStack);
ec2NrpcStack.addDependency(ecsAbcBffServiceStack);
