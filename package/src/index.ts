/**
 * Model Context Protocol (MCP) サーバーを Hono フレームワーク上で動作させるエントリーポイント。
 *
 * @remarks
 * `createHonoApp` 関数を通じて、/mcp エンドポイントでMCPサーバーを提供します。
 * - POST/GET /mcp: MCPリクエストの受信・処理
 * - その他のHTTPメソッド: 405 Method Not Allowed
 *
 * 内部的にエラーハンドリングやリソースクローズ処理も行います。
 */

import { Logger } from '@aws-lambda-powertools/logger';
import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Context, Hono } from 'hono';
import { BlankEnv, BlankInput } from 'hono/types';

/**
 * ロガーインスタンス（AWS Lambda Powertools）。
 *
 * @private
 */
const logger = new Logger();

/**
 * 許可されていないHTTPメソッドに対するハンドラーです。
 *
 * @remarks
 * 405エラーのJSONレスポンスを返します。
 *
 * @param c Honoのコンテキスト
 * @returns 405エラーのJSONレスポンス
 * @private
 */
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

/**
 * サーバーエラー発生時の共通エラーハンドラーです。
 *
 * @remarks
 * エラー内容をロギングし、500エラーのJSONレスポンスを返します。
 *
 * @param c Honoのコンテキスト
 * @param reason エラー理由
 * @param logMessage ログ出力用メッセージ
 * @returns 500エラーのJSONレスポンス
 * @private
 */
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

/**
 * MCPサーバーおよびトランスポートのリソースをクローズします。
 *
 * @remarks
 * どちらか一方のクローズに失敗しても、もう一方は必ず実行されます。
 *
 * @param server MCPサーバーインスタンス
 * @param transport トランスポートインスタンス
 * @returns void
 * @private
 */
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

/**
 * MCPリクエストを処理します。
 *
 * @remarks
 * サーバーとトランスポートの接続・リクエスト処理・エラーハンドリングを行います。
 *
 * @param server MCPサーバーインスタンス
 * @param c Honoのコンテキスト
 * @returns MCPレスポンス
 * @private
 */
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

/**
 * Honoアプリケーションを生成し、/mcpエンドポイントでMCPサーバーを提供します。
 *
 * @remarks
 * POST/GET /mcp でMCPリクエストを受け付け、他のHTTPメソッドは405を返します。
 *
 * @param createMcpServer MCPサーバーインスタンスを生成するファクトリ関数
 * @returns Honoアプリケーションインスタンス
 *
 * @example
 * ```ts
 * import { createHonoApp } from '...';
 * import { createMcpServer } from './your-mcp-server';
 * const app = createHonoApp(createMcpServer);
 * ```
 */
export const createHonoApp = (createMcpServer: () => McpServer) => {
  const app = new Hono();

  app.post('/mcp', async (c) => {
    const server = createMcpServer();

    try {
      return await handleRequest(server, c);
    } finally {
      await server.close();
    }
  });

  app.get('/mcp', async (c) => {
    const server = createMcpServer();
    try {
      return await handleRequest(server, c);
    } finally {
      await server.close();
    }
  });

  app.put('/mcp', methodNotAllowedHandler);
  app.delete('/mcp', methodNotAllowedHandler);
  app.patch('/mcp', methodNotAllowedHandler);
  app.options('/mcp', methodNotAllowedHandler);

  return app;
};
