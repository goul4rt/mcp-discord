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

describe('channel tools', () => {
    const GUILD = '123456789012345678';
    const CHANNEL = '234567890123456789';
    const PARENT = '345678901234567890';
    const MESSAGE = '456789012345678901';

    it('get_channels calls provider.getChannels', async () => {
        const tool = findTool('get_channels');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD }, provider);
        expect(provider.getChannels).toHaveBeenCalledWith(GUILD);
    });

    it('get_channel calls provider.getChannel', async () => {
        const tool = findTool('get_channel');
        const provider = makeStubProvider();
        await tool.handler({ channel_id: CHANNEL }, provider);
        expect(provider.getChannel).toHaveBeenCalledWith(CHANNEL);
    });

    it('create_channel defaults type to text and transforms snake_case to camelCase', async () => {
        const tool = findTool('create_channel');
        const parsed = tool.schema.parse({ guild_id: GUILD, name: 'general' });
        expect(parsed.type).toBe('text');

        const provider = makeStubProvider();
        await tool.handler(
            {
                guild_id: GUILD,
                name: 'general',
                type: 'text',
                topic: 'hello',
                parent_id: PARENT,
                nsfw: true,
                rate_limit_per_user: 5,
            },
            provider,
        );
        expect(provider.createChannel).toHaveBeenCalledWith({
            guildId: GUILD,
            name: 'general',
            type: 'text',
            topic: 'hello',
            parentId: PARENT,
            nsfw: true,
            rateLimitPerUser: 5,
        });
    });

    it('create_channel schema rejects invalid type', () => {
        const tool = findTool('create_channel');
        expect(() => tool.schema.parse({ guild_id: GUILD, name: 'x', type: 'bogus' })).toThrow();
    });

    it('edit_channel transforms snake_case to camelCase and passes null parent', async () => {
        const tool = findTool('edit_channel');
        const provider = makeStubProvider();
        await tool.handler(
            {
                channel_id: CHANNEL,
                name: 'renamed',
                topic: 'new',
                nsfw: false,
                rate_limit_per_user: 10,
                position: 2,
                parent_id: null,
            },
            provider,
        );
        expect(provider.editChannel).toHaveBeenCalledWith({
            channelId: CHANNEL,
            name: 'renamed',
            topic: 'new',
            nsfw: false,
            rateLimitPerUser: 10,
            position: 2,
            parentId: null,
        });
    });

    it('delete_channel returns success payload and calls provider.deleteChannel', async () => {
        const tool = findTool('delete_channel');
        const provider = makeStubProvider();
        const result = await tool.handler({ channel_id: CHANNEL, reason: 'cleanup' }, provider);
        expect(provider.deleteChannel).toHaveBeenCalledWith(CHANNEL, 'cleanup');
        expect(result).toEqual({ success: true, channel_id: CHANNEL });
    });

    it('create_thread converts auto_archive_duration string to number', async () => {
        const tool = findTool('create_thread');
        const provider = makeStubProvider();
        await tool.handler(
            {
                channel_id: CHANNEL,
                name: 'thread',
                message_id: MESSAGE,
                auto_archive_duration: '1440',
            },
            provider,
        );
        expect(provider.createThread).toHaveBeenCalledWith({
            channelId: CHANNEL,
            name: 'thread',
            messageId: MESSAGE,
            autoArchiveDuration: 1440,
            reason: undefined,
        });
    });

    it('create_thread schema rejects an invalid auto_archive_duration value', () => {
        const tool = findTool('create_thread');
        expect(() => tool.schema.parse({ channel_id: CHANNEL, name: 'x', auto_archive_duration: '99' })).toThrow();
    });

    it('archive_thread returns success payload and calls provider.archiveThread', async () => {
        const tool = findTool('archive_thread');
        const provider = makeStubProvider();
        const result = await tool.handler({ thread_id: CHANNEL }, provider);
        expect(provider.archiveThread).toHaveBeenCalledWith(CHANNEL);
        expect(result).toEqual({ success: true, thread_id: CHANNEL });
    });
});
