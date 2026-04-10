#!/usr/bin/env node
/**
 * Standalone entry point — run the Discord MCP server as its own process.
 *
 * Usage:
 *   # stdio transport (default — for local MCP clients like Claude Desktop)
 *   DISCORD_TOKEN=xxx node dist/standalone.js
 *   DISCORD_TOKEN=xxx node dist/standalone.js --transport stdio
 *
 *   # Streamable HTTP transport (for remote MCP clients)
 *   DISCORD_TOKEN=xxx node dist/standalone.js --transport http --port 3100
 *
 * Environment variables:
 *   DISCORD_TOKEN      — Bot token (required)
 *   DISCORD_USE_GATEWAY — "true" to connect WebSocket gateway (default: false)
 *   MCP_TRANSPORT      — "stdio" or "http" (default: stdio)
 *   MCP_PORT           — HTTP port (default: 3100)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StandaloneProvider } from './providers/standalone-provider.js';
import { createMcpServer } from './server.js';

// ─── Parse args & env ───────────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);
    const get = (flag: string): string | undefined => {
        const idx = args.indexOf(flag);
        return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
    };

    return {
        token: process.env.DISCORD_TOKEN ?? '',
        useGateway: (process.env.DISCORD_USE_GATEWAY ?? 'false').toLowerCase() === 'true',
        transport: (get('--transport') ?? process.env.MCP_TRANSPORT ?? 'stdio') as 'stdio' | 'http',
        port: Number(get('--port') ?? process.env.MCP_PORT ?? '3100'),
        authToken: process.env.MCP_AUTH_TOKEN,
    };
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
    const config = parseArgs();

    if (!config.token) {
        console.error('Error: DISCORD_TOKEN environment variable is required');
        process.exit(1);
    }

    // Create provider
    const provider = new StandaloneProvider({
        token: config.token,
        useGateway: config.useGateway,
    });

    console.error(`[discord-mcp] Connecting to Discord (mode: ${config.useGateway ? 'gateway' : 'REST-only'})...`);
    await provider.connect();
    console.error(`[discord-mcp] Connected as bot user ${provider.getBotUserId()}`);

    // Create MCP server
    const server = createMcpServer({ provider });

    // Start transport
    if (config.transport === 'stdio') {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('[discord-mcp] MCP server running on stdio');
    } else if (config.transport === 'http') {
        // Streamable HTTP transport
        const { StreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/streamableHttp.js');
        const http = await import('node:http');

        const httpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        await server.connect(httpTransport);

        // Log authentication status
        if (!config.authToken) {
            console.error('[discord-mcp] WARNING: HTTP transport running without authentication. Set MCP_AUTH_TOKEN to secure it.');
        }

        const httpServer = http.createServer(async (req, res) => {
            // Authentication middleware
            if (config.authToken) {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }));
                    return;
                }

                const token = authHeader.slice(7); // Remove "Bearer " prefix
                if (token !== config.authToken) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized: Invalid token' }));
                    return;
                }
            }

            // Handle MCP HTTP requests
            await httpTransport.handleRequest(req, res);
        });

        httpServer.listen(config.port, () => {
            console.error(`[discord-mcp] MCP server running on http://localhost:${config.port}`);
        });
    }

    // Graceful shutdown
    const shutdown = async () => {
        console.error('[discord-mcp] Shutting down...');
        await provider.disconnect();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch(err => {
    console.error('[discord-mcp] Fatal error:', err);
    process.exit(1);
});
