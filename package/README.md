# aws-lambda-mcp-server

AWS Lambda上でMCP（Model Context Protocol）サーバー機能を提供するためのライブラリです。
APIエンドポイントの実装や、各種AWSサービスとの連携を簡易化することを目的としています。

## ライブラリの使い方

### インストール

```sh
pnpm add aws-lambda-mcp-server
# または
npm install aws-lambda-mcp-server
```

### 基本的な利用例

TypeScriptでの利用例です。

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handler } from 'aws-lambda-mcp-server';
import { handle } from 'hono/aws-lambda';

// MCPサーバーのインスタンスを作成
const server = new McpServer({
  name: 'my-mcp-server',
  version: '1.0.0',
});

// MCPサーバーのインスタンスにToolsやResourcesなどを設定する
server.tool(
  "say_hello",
  { who: z.string() },
  async ({ who }) => ({
    content: [{
      type: "text",
      text: `${who} さん、こんにちは！`
    }]
  })
);

// Hono アプリケーションを作成
const app = createHonoApp(server);

// AWS Lambdaのエントリポイントとして利用
export const handler = handle(app);
```

Lambdaの設定で `handler` をエントリポイントに指定してください。
