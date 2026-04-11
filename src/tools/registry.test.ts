// src/tools/registry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { allTools, toolsByName, type ToolDefinition } from './registry.js';
import type { DiscordProvider } from '../providers/discord-provider.js';

// ─── Stub provider ──────────────────────────────────────────────

function makeStubProvider(): DiscordProvider {
    return {
        name: 'stub',
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isReady: vi.fn().mockReturnValue(true),
        getBotUserId: vi.fn().mockReturnValue('1000'),

        listGuilds: vi.fn().mockResolvedValue([]),
        getGuild: vi.fn().mockResolvedValue({}),

        getChannels: vi.fn().mockResolvedValue([]),
        getChannel: vi.fn().mockResolvedValue({}),
        createChannel: vi.fn().mockResolvedValue({ id: 'ch1' }),
        editChannel: vi.fn().mockResolvedValue({ id: 'ch1' }),
        deleteChannel: vi.fn().mockResolvedValue(undefined),

        createThread: vi.fn().mockResolvedValue({ id: 'th1' }),
        archiveThread: vi.fn().mockResolvedValue(undefined),

        sendMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
        readMessages: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
        editMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
        deleteMessage: vi.fn().mockResolvedValue(undefined),
        deleteMessagesBulk: vi.fn().mockResolvedValue(2),
        pinMessage: vi.fn().mockResolvedValue(undefined),
        unpinMessage: vi.fn().mockResolvedValue(undefined),
        searchMessages: vi.fn().mockResolvedValue({ items: [], hasMore: false }),

        addReaction: vi.fn().mockResolvedValue(undefined),
        removeReaction: vi.fn().mockResolvedValue(undefined),

        listMembers: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
        getMember: vi.fn().mockResolvedValue({}),
        getUser: vi.fn().mockResolvedValue({}),
        searchMembers: vi.fn().mockResolvedValue([]),

        listRoles: vi.fn().mockResolvedValue([]),
        createRole: vi.fn().mockResolvedValue({ id: 'r1' }),
        addRole: vi.fn().mockResolvedValue(undefined),
        removeRole: vi.fn().mockResolvedValue(undefined),

        timeoutUser: vi.fn().mockResolvedValue(undefined),
        kickUser: vi.fn().mockResolvedValue(undefined),
        banUser: vi.fn().mockResolvedValue(undefined),
        unbanUser: vi.fn().mockResolvedValue(undefined),

        getAuditLog: vi.fn().mockResolvedValue([]),
        checkMentions: vi.fn().mockResolvedValue([]),
    };
}

function findTool(name: string): ToolDefinition {
    const tool = toolsByName.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool;
}

// ─── Snowflake schema coverage (sanity) ─────────────────────────

describe('snowflake ID schema', () => {
    it('accepts valid 18-digit snowflakes', () => {
        const tool = findTool('get_server_info');
        expect(() => tool.schema.parse({ guild_id: '123456789012345678' })).not.toThrow();
    });

    it('rejects snowflakes with fewer than 17 digits', () => {
        const tool = findTool('get_server_info');
        expect(() => tool.schema.parse({ guild_id: '1234567890123456' })).toThrow();
    });

    it('rejects snowflakes with more than 20 digits', () => {
        const tool = findTool('get_server_info');
        expect(() => tool.schema.parse({ guild_id: '123456789012345678901' })).toThrow();
    });

    it('rejects non-numeric snowflakes', () => {
        const tool = findTool('get_server_info');
        expect(() => tool.schema.parse({ guild_id: 'abc456789012345678' })).toThrow();
    });
});

describe('tool registry', () => {
    it('exposes all 33 tools via allTools', () => {
        expect(allTools).toHaveLength(33);
    });

    it('has a unique name per tool', () => {
        const names = allTools.map(t => t.name);
        expect(new Set(names).size).toBe(names.length);
    });
});

describe('server tools', () => {
    it('list_servers calls provider.listGuilds with no arguments', async () => {
        const tool = findTool('list_servers');
        const provider = makeStubProvider();
        await tool.handler({}, provider);
        expect(provider.listGuilds).toHaveBeenCalledTimes(1);
    });

    it('get_server_info calls provider.getGuild with the guild_id', async () => {
        const tool = findTool('get_server_info');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: '123456789012345678' }, provider);
        expect(provider.getGuild).toHaveBeenCalledWith('123456789012345678');
    });

    it('get_server_info schema rejects missing guild_id', () => {
        const tool = findTool('get_server_info');
        expect(() => tool.schema.parse({})).toThrow();
    });
});
