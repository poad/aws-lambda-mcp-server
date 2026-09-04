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
import { createMcpHonoApp, CreateMcpHonoAppOptions } from '@modelcontextprotocol/hono';
import { McpServer, WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { Context, Hono } from 'hono';
import { BlankEnv, BlankInput, BlankSchema, Env } from 'hono/types';

/**
 * ロガーインスタンス（AWS Lambda Powertools）。
 *
 * @private
 */
const logger = new Logger();

// `@modelcontextprotocol/hono` が c.set('parsedBody', ...) で格納する値の型を
// Hono の ContextVariableMap に宣言マージで追加する（パッケージ側の型定義に
// 反映されていないための回避策）
declare module 'hono' {
  interface ContextVariableMap {
    parsedBody: unknown;
  }
}

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
  const errorDetails =
    reason instanceof Error
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
const closeResources = async (
  server: McpServer,
  transport: WebStandardStreamableHTTPServerTransport,
) => {
  // 両方のクローズを確実に実行（片方が失敗してももう片方を実行）
  const closeResults = await Promise.allSettled([transport.close(), server.close()]);

  // クローズエラーをログ出力
  closeResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      const resourceName = index === 0 ? 'transport' : 'server';
      const error = result.reason;
      const errorDetails =
        error instanceof Error ? { message: error.message, stack: error.stack } : error;
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
 * @param createMcpServer MCPサーバーインスタンスを生成するファクトリ関数
 * @param c Honoのコンテキスト
 * @returns MCPレスポンス
 * @private
 */
const handleRequest = async (
  createMcpServer: () => McpServer,
  c: Context<Env, '/mcp', BlankInput>,
) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // セッションIDを生成しない（ステートレスモード）
    enableJsonResponse: true,
  });
  const server = createMcpServer();
  try {
    await server.connect(transport);
    logger.trace('MCP リクエストを受信');
    return await transport.handleRequest(c.req.raw, { parsedBody: c.get('parsedBody') });
  } catch (error) {
    return handleError(c, error, 'MCP 接続中のエラー:');
  } finally {
    // エラーの有無に関わらず必ずリソースをクローズ
    try {
      await closeResources(server, transport);
    } catch (closeError) {
      // クローズエラーは既にcloseResources内でログ出力されているため、
      // ここでは追加のエラーハンドリングは不要だが、エラーの詳細を記録
      const errorDetails =
        closeError instanceof Error
          ? { message: closeError.message, stack: closeError.stack }
          : closeError;
      logger.error('リソースクローズ中に追加エラーが発生しましたが、処理を継続します', {
        closeError: errorDetails,
      });
    }
  }
};

/**
 * Honoアプリケーションを生成し、/mcpエンドポイントでMCPサーバーを提供します。
 *
 * @remarks
 * POST/GET /mcp でMCPリクエストを受け付け、他のHTTPメソッドは405を返します。
 *
 * @param createMcpServer MCPサーバーインスタンスを生成するファクトリ関数
 * @param options `@modelcontextprotocol/hono` パッケージの `createMcpHonoApp()` 関数に関数に渡す options
 * @returns Honoアプリケーションインスタンス
 *
 * @example
 * ```ts
 * import { createHonoApp } from '...';
 * import { createMcpServer } from './your-mcp-server';
 * const app = createHonoApp(createMcpServer, {
 *   host: '0.0.0.0', // 認証・認可を無効にする
 * });
 * ```
 */
export const createHonoApp = (
  createMcpServer: () => McpServer,
  options?: CreateMcpHonoAppOptions,
): Hono<Env, BlankSchema, '/'> => {
  const app = createMcpHonoApp(options);

  app.all('/mcp', async (c) => {
    return await handleRequest(createMcpServer, c);
  });

  return app;
};
