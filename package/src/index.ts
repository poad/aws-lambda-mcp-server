import { Logger } from '@aws-lambda-powertools/logger';
import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Context, Hono } from 'hono';
import { BlankEnv, BlankInput } from 'hono/types';

const logger = new Logger();

const methodNotAllowedHandler = async (
  c: Context<BlankEnv, '/mcp', BlankInput>,
) => {
  return c.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'メソッドは許可されていません。',
      },
      id: null,
    },
    { status: 405 },
  );
};

const handleError = (
  c: Context<BlankEnv, '/mcp', BlankInput>,
  reason: unknown,
  logMessage: string,
) => {
  const errorDetails = reason instanceof Error
    ? { message: reason.message, stack: reason.stack, name: reason.name }
    : { reason };
  logger.error(logMessage, errorDetails);
  return c.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: '内部サーバーエラー',
      },
      id: null,
    },
    { status: 500 },
  );
};

const closeResources = async (server: McpServer, transport: StreamableHTTPTransport) => {
  // 両方のクローズを確実に実行（片方が失敗してももう片方を実行）
  const closeResults = await Promise.allSettled([
    transport.close(),
    server.close(),
  ]);

  // クローズエラーをログ出力
  closeResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      const resourceName = index === 0 ? 'transport' : 'server';
      const error = result.reason;
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;
      logger.error(`Error closing ${resourceName}:`, { error: errorDetails });
    }
  });
};

const handleRequest = async (server: McpServer, c: Context<BlankEnv, '/mcp', BlankInput>) => {
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: undefined, // セッションIDを生成しない（ステートレスモード）
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    logger.trace('MCP リクエストを受信');
    return await transport.handleRequest(c);
  } catch (error) {
    try {
      await closeResources(server, transport);
    } catch (closeError) {
      const errorDetails = closeError instanceof Error
        ? { message: closeError.message, stack: closeError.stack }
        : closeError;
      logger.error('Transport close failed after connection error:', { closeError: errorDetails });
    }
    return handleError(c, error, 'MCP 接続中のエラー:');
  }

};

export const createHonoApp = (server: McpServer) => {
  const app = new Hono();

  app.post('/mcp', async (c) => {
    return await handleRequest(server, c);
  });

  app.get('/mcp', async (c) => {
    return await handleRequest(server, c);
  });

  app.put('/mcp', methodNotAllowedHandler);
  app.delete('/mcp', methodNotAllowedHandler);
  app.patch('/mcp', methodNotAllowedHandler);
  app.options('/mcp', methodNotAllowedHandler);

  return app;
};
