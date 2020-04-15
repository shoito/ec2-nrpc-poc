import * as cdk from "@aws-cdk/core";
import * as autoscaling from "@aws-cdk/aws-autoscaling";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as elb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as iam from "@aws-cdk/aws-iam";

export interface ExtendedStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  listener: elb.ApplicationListener;
}

export class Ec2NrpcStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ExtendedStackProps) {
    super(scope, id, props);

    const PORT = 80;

    const sg = new ec2.SecurityGroup(this, "poc-nrpc-service-sg", {
      securityGroupName: "poc-nrpc-service-sg",
      vpc: props.vpc,
      allowAllOutbound: true
    });
    sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(PORT));

    const role = new iam.Role(this, "poc-nrpc-role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")]
    });

    const userData = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    userData.addCommands(
      "yum install -y nginx",
      "curl -o /etc/nginx/nginx.conf https://raw.githubusercontent.com/shoito/ec2-nrpc-poc/master/containers/nrpc/nginx.conf",
      "mkdir -p /var/cache/nginx/xyz /var/cache/nginx/abc",
      "chkconfig nginx on",
      "service nginx start"
    );

    const asg = new autoscaling.AutoScalingGroup(this, "poc-nrpc-asg", {
      vpc: props.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage(),
      desiredCapacity: 2,
      role,
      userData
    });

    props.listener.addTargets("poc-nrpc-tg", {
      targetGroupName: "poc-nrpc-tg",
      protocol: elb.ApplicationProtocol.HTTP,
      port: PORT,
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(15),
        timeout: cdk.Duration.seconds(10)
      },
      targets: [asg]
    });
  }
}
