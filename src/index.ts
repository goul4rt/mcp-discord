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
export type { ToolDefinition } from './tools/registry.js';

// Types
export * from './types/discord.js';
