#!/usr/bin/env node
import { ExampleStack } from '../lib/example-stack.js';

import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const stack = new ExampleStack(app, 'AwsLambdaMcpServerExample', {});
cdk.RemovalPolicies.of(stack).destroy();
