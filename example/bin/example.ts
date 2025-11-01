#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ExampleStack } from '../lib/example-stack.js';

const app = new cdk.App();
const stack = new ExampleStack(app, 'aws-lambda-mcp-server-example', {

});
cdk.RemovalPolicies.of(stack).destroy();
