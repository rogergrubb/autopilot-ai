import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { jsonSchema, type ToolSet } from 'ai';
import { pdHeaders } from './pd-client';

/**
 * MCPSessionManager connects to Pipedream's remote MCP server and converts
 * its 10,000+ tools into AI SDK v6 compatible ToolSet objects.
 * 
 * Usage:
 *   const mcp = new MCPSessionManager(baseUrl, userId, chatId);
 *   const tools = await mcp.tools({ useCache: false });
 *   // Pass tools to streamText()
 */
export class MCPSessionManager {
  private serverUrl: string;
  private client: MCPClient | null = null;
  private toolsCache: ToolSet | null = null;
  private connectionPromise: Promise<void> | null = null;
  private chatId: string;
  private userId: string;

  constructor(mcpBaseUrl: string, userId: string, chatId: string) {
    this.serverUrl = mcpBaseUrl;
    this.chatId = chatId;
    this.userId = userId;
    console.log(`[MCP] Creating session: server=${this.serverUrl} user=${this.userId} chat=${this.chatId}`);
  }

  /**
   * Connect to the Pipedream remote MCP server via Streamable HTTP transport.
   * Connection is lazy (called automatically by tools()) and cached.
   */
  public async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const headers = await pdHeaders(this.userId);

        const transport = new StreamableHTTPClientTransport(
          new URL(this.serverUrl),
          {
            requestInit: {
              headers: {
                'x-pd-mcp-chat-id': this.chatId,
                ...headers,
              },
            } as RequestInit,
          }
        );

        this.client = new MCPClient(
          { name: 'DoAnything-Agent', version: '1.0.0' },
          { capabilities: {} }
        );

        await this.client.connect(transport);
        console.log('[MCP] Connection established');
        resolve();
      } catch (error) {
        console.error('[MCP] Connection error:', error);
        this.close();
        reject(new Error('Failed to establish MCP connection'));
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the MCP server.
   */
  public close(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    this.connectionPromise = null;
    this.toolsCache = null;
  }

  /**
   * Fetch available tools from the MCP server and convert them to AI SDK ToolSet.
   * @param useCache - If true, returns cached tools instead of re-fetching.
   */
  public async tools({ useCache }: { useCache: boolean }): Promise<ToolSet> {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client not initialized');
    }

    if (useCache && this.toolsCache) {
      return this.toolsCache;
    }

    const mcpTools = await this.client.listTools();
    const executableTools = this.convertTools(mcpTools.tools);
    this.toolsCache = executableTools;

    console.log(`[MCP] Loaded ${Object.keys(executableTools).length} tools:`, 
      Object.keys(executableTools).slice(0, 10).join(', '), 
      Object.keys(executableTools).length > 10 ? '...' : ''
    );

    return executableTools;
  }

  /**
   * Convert MCP tool definitions into AI SDK v6 compatible ToolSet.
   * Uses raw objects instead of tool() helper to avoid v6 type constraints with jsonSchema.
   */
  private convertTools(
    mcpTools: Awaited<ReturnType<NonNullable<MCPSessionManager['client']>['listTools']>>['tools']
  ): ToolSet {
    const tools: Record<string, any> = {};

    for (const mcpTool of Object.values(mcpTools)) {
      const toolName = mcpTool.name;
      tools[toolName] = {
        description: mcpTool.description || '',
        parameters: jsonSchema(mcpTool.inputSchema),
        execute: async (args: Record<string, unknown>) => {
          return this.executeTool(toolName, args, { timeout: 180_000 });
        },
      };
    }

    return tools as ToolSet;
  }

  /**
   * Execute a single MCP tool by name with timeout support.
   */
  private async executeTool(
    name: string,
    args: unknown,
    options: { timeout?: number; abortSignal?: AbortSignal }
  ): Promise<unknown> {
    if (!this.client) {
      throw new Error('MCP client not initialized');
    }

    const abortController = new AbortController();

    if (options.abortSignal) {
      options.abortSignal.addEventListener('abort', () => abortController.abort());
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    if (options.timeout) {
      timeoutId = setTimeout(() => abortController.abort(), options.timeout);
    }

    try {
      console.log(`[MCP] Executing tool: ${name}`);
      const result = await this.client.callTool({
        name,
        arguments: args as Record<string, unknown>,
      });

      if (timeoutId) clearTimeout(timeoutId);
      console.log(`[MCP] Tool ${name} completed`);
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (abortController.signal.aborted) {
        throw new Error(`Tool ${name} execution timed out`);
      }
      throw error;
    }
  }
}
