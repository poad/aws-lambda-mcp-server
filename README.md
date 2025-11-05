# aws-lambda-mcp-server

[![npm version](https://badge.fury.io/js/aws-lambda-mcp-server.svg)](https://badge.fury.io/js/aws-lambda-mcp-server)

このリポジトリは、AWS Lambda上で動作するMCPサーバーの実装・関連ツール・サンプルを管理しています。

## ディレクトリ構成

- package/: ライブラリ本体のソースコード・npmパッケージ用設定
- example/: 利用例・サンプルコード
- .github/: CI/CDやセキュリティ関連の設定
- その他: 各種ドキュメント・管理ファイル

## 使い方

```sh
pnpm add aws-lambda-mcp-server
# または
npm install aws-lambda-mcp-server
```

### 基本的な利用例

TypeScriptでの利用例です。

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHonoApp } from 'aws-lambda-mcp-server';
import { handle } from 'hono/aws-lambda';
import { z } from 'zod';

// MCPサーバーのファクトリ関数を用意
const createMcpServer = () => {
  const server = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0',
  });

  // MCPサーバーのインスタンスにToolsやResourcesなどを設定する
  server.tool(
    'say_hello',
    { who: z.string() },
    async ({ who }) => ({
      content: [{
        type: 'text',
        text: `${who} さん、こんにちは！`
      }]
    })
  );
  return server;
};

// Hono アプリケーションを作成
const app = createHonoApp(createMcpServer);

// AWS Lambdaのエントリポイントとして利用
export const handler = handle(app);
```
