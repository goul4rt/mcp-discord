/**
 * mcp-discord
 *
 * The most complete open-source MCP server for Discord.
 * 30+ tools, dual-mode: integrated (plugin) or standalone.
 *
 * ## Integrated mode (use inside an existing bot):
 *
 *   import { IntegratedProvider, createMcpServer } from 'mcp-discord';
 *   import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
 *
 *   const provider = new IntegratedProvider({ client: myDiscordClient });
 *   await provider.connect();
 *
 *   const server = createMcpServer({ provider });
 *   const transport = new StdioServerTransport();
 *   await server.connect(transport);
 *
 * ## Standalone mode (run as a separate process):
 *
 *   DISCORD_TOKEN=xxx npx mcp-discord
 *
 * ## REST-only vs Gateway:
 *
 *   Standalone defaults to REST-only (no WebSocket). Set DISCORD_USE_GATEWAY=true
 *   to connect to the gateway for real-time features.
 *
 *   Integrated mode always uses the host bot's existing gateway connection.
 */

// Provider layer
export { IntegratedProvider } from './providers/integrated-provider.js';
export { StandaloneProvider } from './providers/standalone-provider.js';
export type { DiscordProvider, StandaloneProviderConfig, IntegratedProviderConfig } from './providers/discord-provider.js';

// Server factory
export { createMcpServer } from './server.js';
export type { CreateServerOptions } from './server.js';

// Tool registry (for advanced use — extending or filtering tools)
export { allTools, toolsByName } from './tools/registry.js';
export type { ToolDefinition, ToolCategory } from './tools/registry.js';

// Types
export * from './types/discord.js';

// Standalone runner
export async function runStandalone(config?: {
    token?: string;
    useGateway?: boolean;
}): Promise<void> {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { StandaloneProvider } = await import('./providers/standalone-provider.js');
    const { createMcpServer } = await import('./server.js');

    // Use provided config or read from environment
    const token = config?.token ?? process.env.DISCORD_TOKEN ?? '';
    const useGateway = config?.useGateway ?? (process.env.DISCORD_USE_GATEWAY ?? 'false').toLowerCase() === 'true';

    if (!token) {
        throw new Error('DISCORD_TOKEN is required. Provide it via config parameter or DISCORD_TOKEN environment variable.');
    }

    // Create provider
    const provider = new StandaloneProvider({
        token,
        useGateway,
    });

    console.error(`[discord-mcp] Connecting to Discord (mode: ${useGateway ? 'gateway' : 'REST-only'})...`);
    await provider.connect();
    console.error(`[discord-mcp] Connected as bot user ${provider.getBotUserId()}`);

    // Create MCP server
    const server = createMcpServer({ provider });

    // Start with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[discord-mcp] MCP server running on stdio');

    // Graceful shutdown
    const shutdown = async () => {
        console.error('[discord-mcp] Shutting down...');
        await provider.disconnect();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
