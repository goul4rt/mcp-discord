/**
 * MCP Server Factory — creates a Model Context Protocol server
 * wired to a DiscordProvider.
 *
 * This is provider-agnostic: pass any DiscordProvider implementation
 * and you get a fully functional MCP server with all Discord tools.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { allTools, type ToolDefinition } from './tools/registry.js';
import type { DiscordProvider } from './providers/discord-provider.js';
import { z } from 'zod';

export interface CreateServerOptions {
    provider: DiscordProvider;
    /** Server name shown to MCP clients */
    name?: string;
    /** Server version */
    version?: string;
    /**
     * Additional tools to register on top of the built-in set. Host applications
     * can use this to expose host-specific capabilities (database-backed features,
     * bot-owned state, etc.) through the same MCP surface.
     */
    extraTools?: ToolDefinition[];
}

/**
 * Recursively unwraps Zod schemas to extract the shape.
 * Handles ZodObject, ZodEffects (refine/transform), ZodOptional, ZodDefault, etc.
 */
function extractZodShape(schema: z.ZodType<any>): Record<string, any> {
    let current: any = schema;
    while (current) {
        // Check if this is a ZodObject with a shape
        if (current._def?.shape) return current._def.shape();
        // Unwrap ZodEffects (refine, transform, etc.)
        if (current._def?.schema) {
            current = current._def.schema;
            continue;
        }
        // Unwrap ZodOptional
        if (current._def?.innerType) {
            current = current._def.innerType;
            continue;
        }
        // Direct shape property (fallback)
        if (current.shape) return current.shape;
        break;
    }
    return {};
}

export function createMcpServer(options: CreateServerOptions): McpServer {
    const { provider, name = 'discord-mcp-server', version = '0.1.0', extraTools = [] } = options;

    const server = new McpServer({
        name,
        version,
    });

    const combinedTools: ToolDefinition[] = [...allTools, ...extraTools];

    // Register every tool from the registry plus any host-provided extensions
    for (const tool of combinedTools) {
        server.tool(
            tool.name,
            tool.description,
            extractZodShape(tool.schema),
            async (input: any) => {
                try {
                    if (!provider.isReady()) {
                        return {
                            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Discord provider is not connected. Call connect() first.' }) }],
                            isError: true,
                        };
                    }

                    const result = await tool.handler(input, provider);

                    return {
                        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
                    };
                } catch (err: any) {
                    const error: Record<string, any> = {
                        message: err?.message ?? String(err),
                        code: err?.code ?? 'UNKNOWN',
                    };

                    // Discord API error details
                    if (err?.status) error.status = err.status;
                    if (err?.method) error.method = err.method;
                    if (err?.url) error.url = err.url;
                    if (err?.rawError?.errors) error.validationErrors = err.rawError.errors;
                    if (err?.retry_after) {
                        error.retryAfter = err.retry_after;
                        error.message += ` (retry after ${err.retry_after}s)`;
                    }

                    return {
                        content: [{ type: 'text' as const, text: JSON.stringify(error, null, 2) }],
                        isError: true,
                    };
                }
            }
        );
    }

    return server;
}
