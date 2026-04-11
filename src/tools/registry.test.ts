// src/tools/registry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { allTools, toolsByName, type ToolDefinition } from './registry.js';
import type { DiscordProvider } from '../providers/discord-provider.js';
import { makeServerStubs } from './__test_helpers__/stubs/server.js';
import { makeChannelStubs } from './__test_helpers__/stubs/channels.js';
import { makeMessageStubs } from './__test_helpers__/stubs/messages.js';
import { makeReactionStubs } from './__test_helpers__/stubs/reactions.js';
import { makeMemberStubs } from './__test_helpers__/stubs/members.js';
import { makeRoleStubs } from './__test_helpers__/stubs/roles.js';
import { makeModerationStubs } from './__test_helpers__/stubs/moderation.js';
import { makeMonitoringStubs } from './__test_helpers__/stubs/monitoring.js';
import { makePermissionStubs } from './__test_helpers__/stubs/permissions.js';
import { makeWebhookStubs } from './__test_helpers__/stubs/webhooks.js';
import { makeForumStubs } from './__test_helpers__/stubs/forums.js';
import { makeInviteStubs } from './__test_helpers__/stubs/invites.js';
import { makeDMStubs } from './__test_helpers__/stubs/dms.js';
import { makeScheduledEventStubs } from './__test_helpers__/stubs/scheduledEvents.js';
import { makeScreeningStubs } from './__test_helpers__/stubs/screening.js';

// ─── Stub provider ──────────────────────────────────────────────

function makeStubProvider(): DiscordProvider {
    return {
        name: 'stub',
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isReady: vi.fn().mockReturnValue(true),
        getBotUserId: vi.fn().mockReturnValue('1000'),
        ...makeServerStubs(),
        ...makeChannelStubs(),
        ...makeMessageStubs(),
        ...makeReactionStubs(),
        ...makeMemberStubs(),
        ...makeRoleStubs(),
        ...makeModerationStubs(),
        ...makeMonitoringStubs(),
        ...makePermissionStubs(),
        ...makeWebhookStubs(),
        ...makeForumStubs(),
        ...makeInviteStubs(),
        ...makeDMStubs(),
        ...makeScheduledEventStubs(),
        ...makeScreeningStubs(),
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
    it('exposes all 48 tools via allTools', () => {
        expect(allTools).toHaveLength(48);
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

describe('message tools', () => {
    const GUILD = '123456789012345678';
    const CHANNEL = '234567890123456789';
    const MESSAGE = '456789012345678901';
    const AUTHOR = '567890123456789012';

    it('send_message renames reply_to to replyToMessageId', async () => {
        const tool = findTool('send_message');
        const provider = makeStubProvider();
        await tool.handler(
            { channel_id: CHANNEL, content: 'hi', reply_to: MESSAGE },
            provider,
        );
        expect(provider.sendMessage).toHaveBeenCalledWith({
            channelId: CHANNEL,
            content: 'hi',
            embeds: undefined,
            replyToMessageId: MESSAGE,
        });
    });

    it('send_message accepts embeds without content', async () => {
        const tool = findTool('send_message');
        const provider = makeStubProvider();
        await tool.handler(
            { channel_id: CHANNEL, embeds: [{ title: 'hi' }] },
            provider,
        );
        expect(provider.sendMessage).toHaveBeenCalledWith({
            channelId: CHANNEL,
            content: undefined,
            embeds: [{ title: 'hi' }],
            replyToMessageId: undefined,
        });
    });

    it('read_messages defaults limit to 50', async () => {
        const tool = findTool('read_messages');
        const parsed = tool.schema.parse({ channel_id: CHANNEL });
        expect(parsed.limit).toBe(50);

        const provider = makeStubProvider();
        await tool.handler({ channel_id: CHANNEL, limit: 50 }, provider);
        expect(provider.readMessages).toHaveBeenCalledWith({
            channelId: CHANNEL,
            limit: 50,
            before: undefined,
            after: undefined,
            around: undefined,
        });
    });

    it('read_messages rejects limit greater than 100', () => {
        const tool = findTool('read_messages');
        expect(() => tool.schema.parse({ channel_id: CHANNEL, limit: 200 })).toThrow();
    });

    it('search_messages defaults limit to 25 and transforms fields', async () => {
        const tool = findTool('search_messages');
        const parsed = tool.schema.parse({ guild_id: GUILD });
        expect(parsed.limit).toBe(25);

        const provider = makeStubProvider();
        await tool.handler(
            {
                guild_id: GUILD,
                query: 'hello',
                author_id: AUTHOR,
                channel_id: CHANNEL,
                limit: 10,
            },
            provider,
        );
        expect(provider.searchMessages).toHaveBeenCalledWith({
            guildId: GUILD,
            query: 'hello',
            authorId: AUTHOR,
            channelId: CHANNEL,
            limit: 10,
        });
    });

    it('edit_message calls provider.editMessage', async () => {
        const tool = findTool('edit_message');
        const provider = makeStubProvider();
        await tool.handler(
            { channel_id: CHANNEL, message_id: MESSAGE, content: 'new' },
            provider,
        );
        expect(provider.editMessage).toHaveBeenCalledWith(CHANNEL, MESSAGE, 'new', undefined);
    });

    it('delete_message returns success and passes reason', async () => {
        const tool = findTool('delete_message');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { channel_id: CHANNEL, message_id: MESSAGE, reason: 'spam' },
            provider,
        );
        expect(provider.deleteMessage).toHaveBeenCalledWith(CHANNEL, MESSAGE, 'spam');
        expect(result).toEqual({ success: true });
    });

    it('delete_messages_bulk returns deleted_count from provider', async () => {
        const tool = findTool('delete_messages_bulk');
        const provider = makeStubProvider();
        (provider.deleteMessagesBulk as ReturnType<typeof vi.fn>).mockResolvedValue(3);
        const result = await tool.handler(
            { channel_id: CHANNEL, message_ids: [MESSAGE, MESSAGE, MESSAGE] },
            provider,
        );
        expect(result).toEqual({ success: true, deleted_count: 3 });
    });

    it('delete_messages_bulk schema rejects empty array', () => {
        const tool = findTool('delete_messages_bulk');
        expect(() => tool.schema.parse({ channel_id: CHANNEL, message_ids: [] })).toThrow();
    });

    it('delete_messages_bulk schema rejects more than 100 ids', () => {
        const tool = findTool('delete_messages_bulk');
        const ids = Array.from({ length: 101 }, (_, i) => String(i).padStart(18, '1'));
        expect(() => tool.schema.parse({ channel_id: CHANNEL, message_ids: ids })).toThrow();
    });

    it('pin_message and unpin_message delegate to provider and return success', async () => {
        const pin = findTool('pin_message');
        const unpin = findTool('unpin_message');
        const provider = makeStubProvider();

        const pinResult = await pin.handler({ channel_id: CHANNEL, message_id: MESSAGE }, provider);
        expect(provider.pinMessage).toHaveBeenCalledWith(CHANNEL, MESSAGE);
        expect(pinResult).toEqual({ success: true });

        const unpinResult = await unpin.handler({ channel_id: CHANNEL, message_id: MESSAGE }, provider);
        expect(provider.unpinMessage).toHaveBeenCalledWith(CHANNEL, MESSAGE);
        expect(unpinResult).toEqual({ success: true });
    });
});

describe('reaction tools', () => {
    const CHANNEL = '234567890123456789';
    const MESSAGE = '456789012345678901';
    const USER = '567890123456789012';

    it('add_reaction returns success', async () => {
        const tool = findTool('add_reaction');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { channel_id: CHANNEL, message_id: MESSAGE, emoji: '👍' },
            provider,
        );
        expect(provider.addReaction).toHaveBeenCalledWith(CHANNEL, MESSAGE, '👍');
        expect(result).toEqual({ success: true });
    });

    it('remove_reaction passes optional user_id', async () => {
        const tool = findTool('remove_reaction');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { channel_id: CHANNEL, message_id: MESSAGE, emoji: '👍', user_id: USER },
            provider,
        );
        expect(provider.removeReaction).toHaveBeenCalledWith(CHANNEL, MESSAGE, '👍', USER);
        expect(result).toEqual({ success: true });
    });
});

describe('member tools', () => {
    const GUILD = '123456789012345678';
    const USER = '567890123456789012';

    it('list_members defaults limit to 100', async () => {
        const tool = findTool('list_members');
        const parsed = tool.schema.parse({ guild_id: GUILD });
        expect(parsed.limit).toBe(100);

        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, limit: 50 }, provider);
        expect(provider.listMembers).toHaveBeenCalledWith(GUILD, 50, undefined);
    });

    it('get_member passes guild_id and user_id', async () => {
        const tool = findTool('get_member');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, user_id: USER }, provider);
        expect(provider.getMember).toHaveBeenCalledWith(GUILD, USER);
    });

    it('get_user passes user_id', async () => {
        const tool = findTool('get_user');
        const provider = makeStubProvider();
        await tool.handler({ user_id: USER }, provider);
        expect(provider.getUser).toHaveBeenCalledWith(USER);
    });

    it('search_members defaults limit to 20', async () => {
        const tool = findTool('search_members');
        const parsed = tool.schema.parse({ guild_id: GUILD, query: 'al' });
        expect(parsed.limit).toBe(20);

        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, query: 'al', limit: 5 }, provider);
        expect(provider.searchMembers).toHaveBeenCalledWith(GUILD, 'al', 5);
    });
});

describe('role tools', () => {
    const GUILD = '123456789012345678';
    const USER = '567890123456789012';
    const ROLE = '678901234567890123';

    it('list_roles calls provider.listRoles', async () => {
        const tool = findTool('list_roles');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD }, provider);
        expect(provider.listRoles).toHaveBeenCalledWith(GUILD);
    });

    it('create_role transforms guild_id to guildId', async () => {
        const tool = findTool('create_role');
        const provider = makeStubProvider();
        await tool.handler(
            { guild_id: GUILD, name: 'VIP', color: 0xff00ff, mentionable: true, hoist: true },
            provider,
        );
        expect(provider.createRole).toHaveBeenCalledWith({
            guildId: GUILD,
            name: 'VIP',
            color: 0xff00ff,
            mentionable: true,
            hoist: true,
        });
    });

    it('add_role returns success and passes arguments', async () => {
        const tool = findTool('add_role');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { guild_id: GUILD, user_id: USER, role_id: ROLE, reason: 'promo' },
            provider,
        );
        expect(provider.addRole).toHaveBeenCalledWith(GUILD, USER, ROLE, 'promo');
        expect(result).toEqual({ success: true });
    });

    it('remove_role returns success and passes arguments', async () => {
        const tool = findTool('remove_role');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { guild_id: GUILD, user_id: USER, role_id: ROLE, reason: 'demo' },
            provider,
        );
        expect(provider.removeRole).toHaveBeenCalledWith(GUILD, USER, ROLE, 'demo');
        expect(result).toEqual({ success: true });
    });
});

describe('moderation tools', () => {
    const GUILD = '123456789012345678';
    const USER = '567890123456789012';

    it('timeout_user converts duration_minutes to durationMs and returns expires_at', async () => {
        const tool = findTool('timeout_user');
        const provider = makeStubProvider();
        const before = Date.now();
        const result = await tool.handler(
            { guild_id: GUILD, user_id: USER, duration_minutes: 10, reason: 'spam' },
            provider,
        );
        expect(provider.timeoutUser).toHaveBeenCalledWith({
            guildId: GUILD,
            userId: USER,
            durationMs: 600_000,
            reason: 'spam',
        });
        expect((result as any).success).toBe(true);
        const expiresAtMs = Date.parse((result as any).expires_at);
        expect(expiresAtMs).toBeGreaterThanOrEqual(before + 600_000);
        expect(expiresAtMs).toBeLessThanOrEqual(Date.now() + 600_000 + 1000);
    });

    it('timeout_user rejects duration above 28 days', () => {
        const tool = findTool('timeout_user');
        expect(() => tool.schema.parse({ guild_id: GUILD, user_id: USER, duration_minutes: 40321 })).toThrow();
    });

    it('kick_user returns success and passes reason', async () => {
        const tool = findTool('kick_user');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { guild_id: GUILD, user_id: USER, reason: 'violation' },
            provider,
        );
        expect(provider.kickUser).toHaveBeenCalledWith({ guildId: GUILD, userId: USER, reason: 'violation' });
        expect(result).toEqual({ success: true });
    });

    it('ban_user converts delete_message_days to deleteMessageSeconds', async () => {
        const tool = findTool('ban_user');
        const provider = makeStubProvider();
        await tool.handler(
            { guild_id: GUILD, user_id: USER, reason: 'abuse', delete_message_days: 7 },
            provider,
        );
        expect(provider.banUser).toHaveBeenCalledWith({
            guildId: GUILD,
            userId: USER,
            reason: 'abuse',
            deleteMessageSeconds: 604_800,
        });
    });

    it('ban_user leaves deleteMessageSeconds undefined when delete_message_days is omitted', async () => {
        const tool = findTool('ban_user');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, user_id: USER, reason: 'abuse' }, provider);
        expect(provider.banUser).toHaveBeenCalledWith({
            guildId: GUILD,
            userId: USER,
            reason: 'abuse',
            deleteMessageSeconds: undefined,
        });
    });

    it('ban_user preserves delete_message_days of 0 as deleteMessageSeconds: 0', async () => {
        const tool = findTool('ban_user');
        const provider = makeStubProvider();
        await tool.handler(
            { guild_id: GUILD, user_id: USER, reason: 'abuse', delete_message_days: 0 },
            provider,
        );
        expect(provider.banUser).toHaveBeenCalledWith({
            guildId: GUILD,
            userId: USER,
            reason: 'abuse',
            deleteMessageSeconds: 0,
        });
    });

    it('ban_user rejects delete_message_days greater than 7', () => {
        const tool = findTool('ban_user');
        expect(() => tool.schema.parse({ guild_id: GUILD, user_id: USER, delete_message_days: 8 })).toThrow();
    });

    it('unban_user returns success and passes reason', async () => {
        const tool = findTool('unban_user');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { guild_id: GUILD, user_id: USER, reason: 'appeal' },
            provider,
        );
        expect(provider.unbanUser).toHaveBeenCalledWith(GUILD, USER, 'appeal');
        expect(result).toEqual({ success: true });
    });
});

describe('screening tools', () => {
    const GUILD = '123456789012345678';
    const CHANNEL = '234567890123456789';
    const EMOJI = '345678901234567890';

    it('get_membership_screening calls provider.getWelcomeScreen with the guild_id', async () => {
        const tool = findTool('get_membership_screening');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD }, provider);
        expect(provider.getWelcomeScreen).toHaveBeenCalledWith(GUILD);
    });

    it('get_membership_screening schema rejects missing guild_id', () => {
        const tool = findTool('get_membership_screening');
        expect(() => tool.schema.parse({})).toThrow();
    });

    it('update_membership_screening transforms snake_case to camelCase', async () => {
        const tool = findTool('update_membership_screening');
        const provider = makeStubProvider();
        await tool.handler(
            {
                guild_id: GUILD,
                enabled: true,
                description: 'Welcome!',
                welcome_channels: [
                    { channel_id: CHANNEL, description: 'General chat', emoji_name: 'wave', emoji_id: EMOJI },
                ],
            },
            provider,
        );
        expect(provider.updateWelcomeScreen).toHaveBeenCalledWith({
            guildId: GUILD,
            enabled: true,
            description: 'Welcome!',
            welcomeChannels: [
                { channelId: CHANNEL, description: 'General chat', emojiName: 'wave', emojiId: EMOJI },
            ],
        });
    });

    it('update_membership_screening omits undefined optional fields', async () => {
        const tool = findTool('update_membership_screening');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, enabled: false }, provider);
        expect(provider.updateWelcomeScreen).toHaveBeenCalledWith({
            guildId: GUILD,
            enabled: false,
            description: undefined,
            welcomeChannels: undefined,
        });
    });

    it('update_membership_screening schema rejects a welcome channel without channel_id', () => {
        const tool = findTool('update_membership_screening');
        expect(() =>
            tool.schema.parse({
                guild_id: GUILD,
                welcome_channels: [{ description: 'missing channel' }],
            }),
        ).toThrow();
    });

    it('update_membership_screening schema allows empty welcome_channels array', () => {
        const tool = findTool('update_membership_screening');
        expect(() => tool.schema.parse({ guild_id: GUILD, welcome_channels: [] })).not.toThrow();
    });
});

describe('monitoring tools', () => {
    const GUILD = '123456789012345678';
    const USER = '567890123456789012';

    it('get_audit_log defaults limit to 50', async () => {
        const tool = findTool('get_audit_log');
        const parsed = tool.schema.parse({ guild_id: GUILD });
        expect(parsed.limit).toBe(50);

        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, limit: 25 }, provider);
        expect(provider.getAuditLog).toHaveBeenCalledWith(GUILD, 25);
    });

    it('check_mentions defaults limit to 25', async () => {
        const tool = findTool('check_mentions');
        const parsed = tool.schema.parse({ guild_id: GUILD });
        expect(parsed.limit).toBe(25);

        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, user_id: USER, limit: 10 }, provider);
        expect(provider.checkMentions).toHaveBeenCalledWith(GUILD, USER, 10);
    });
});

describe('invite tools', () => {
    const GUILD = '123456789012345678';
    const CHANNEL = '234567890123456789';
    const CODE = 'abc123';

    it('list_invites calls provider.listInvites with the guild_id', async () => {
        const tool = findTool('list_invites');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD }, provider);
        expect(provider.listInvites).toHaveBeenCalledWith(GUILD);
    });

    it('list_invites schema rejects missing guild_id', () => {
        const tool = findTool('list_invites');
        expect(() => tool.schema.parse({})).toThrow();
    });

    it('list_channel_invites calls provider.listChannelInvites with the channel_id', async () => {
        const tool = findTool('list_channel_invites');
        const provider = makeStubProvider();
        await tool.handler({ channel_id: CHANNEL }, provider);
        expect(provider.listChannelInvites).toHaveBeenCalledWith(CHANNEL);
    });

    it('get_invite calls provider.getInvite with the code', async () => {
        const tool = findTool('get_invite');
        const provider = makeStubProvider();
        await tool.handler({ code: CODE }, provider);
        expect(provider.getInvite).toHaveBeenCalledWith(CODE);
    });

    it('get_invite schema rejects missing code', () => {
        const tool = findTool('get_invite');
        expect(() => tool.schema.parse({})).toThrow();
    });

    it('create_invite transforms snake_case to camelCase', async () => {
        const tool = findTool('create_invite');
        const provider = makeStubProvider();
        await tool.handler(
            {
                channel_id: CHANNEL,
                max_uses: 10,
                max_age: 3600,
                temporary: true,
                unique: false,
            },
            provider,
        );
        expect(provider.createInvite).toHaveBeenCalledWith({
            channelId: CHANNEL,
            maxUses: 10,
            maxAge: 3600,
            temporary: true,
            unique: false,
        });
    });

    it('create_invite accepts only channel_id', async () => {
        const tool = findTool('create_invite');
        const provider = makeStubProvider();
        await tool.handler({ channel_id: CHANNEL }, provider);
        expect(provider.createInvite).toHaveBeenCalledWith({
            channelId: CHANNEL,
            maxUses: undefined,
            maxAge: undefined,
            temporary: undefined,
            unique: undefined,
        });
    });

    it('create_invite schema rejects non-number max_uses', () => {
        const tool = findTool('create_invite');
        expect(() => tool.schema.parse({ channel_id: CHANNEL, max_uses: 'lots' })).toThrow();
    });

    it('delete_invite returns success payload and passes reason', async () => {
        const tool = findTool('delete_invite');
        const provider = makeStubProvider();
        const result = await tool.handler({ code: CODE, reason: 'revoked' }, provider);
        expect(provider.deleteInvite).toHaveBeenCalledWith(CODE, 'revoked');
        expect(result).toEqual({ success: true, code: CODE });
    });
});

describe('dm tools', () => {
    const USER = '567890123456789012';

    it('send_dm calls provider.sendDM with camelCase fields', async () => {
        const tool = findTool('send_dm');
        const provider = makeStubProvider();
        await tool.handler({ user_id: USER, content: 'hi' }, provider);
        expect(provider.sendDM).toHaveBeenCalledWith({
            userId: USER,
            content: 'hi',
            embeds: undefined,
        });
    });

    it('send_dm accepts embeds without content', async () => {
        const tool = findTool('send_dm');
        const provider = makeStubProvider();
        await tool.handler({ user_id: USER, embeds: [{ title: 'hi' }] }, provider);
        expect(provider.sendDM).toHaveBeenCalledWith({
            userId: USER,
            content: undefined,
            embeds: [{ title: 'hi' }],
        });
    });

    it('send_dm schema rejects missing user_id', () => {
        const tool = findTool('send_dm');
        expect(() => tool.schema.parse({ content: 'hi' })).toThrow();

describe('scheduled event tools', () => {
    const GUILD = '123456789012345678';
    const EVENT = '234567890123456789';
    const CHANNEL = '345678901234567890';
    const START = '2030-01-01T00:00:00Z';
    const END = '2030-01-01T02:00:00Z';

    it('list_scheduled_events calls provider.listScheduledEvents with guild_id', async () => {
        const tool = findTool('list_scheduled_events');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD }, provider);
        expect(provider.listScheduledEvents).toHaveBeenCalledWith(GUILD);
    });

    it('list_scheduled_events schema rejects missing guild_id', () => {
        const tool = findTool('list_scheduled_events');
        expect(() => tool.schema.parse({})).toThrow();
    });

    it('get_scheduled_event passes guild_id and event_id', async () => {
        const tool = findTool('get_scheduled_event');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, event_id: EVENT }, provider);
        expect(provider.getScheduledEvent).toHaveBeenCalledWith(GUILD, EVENT);
    });

    it('create_scheduled_event transforms snake_case to camelCase and maps entity_type to uppercase', async () => {
        const tool = findTool('create_scheduled_event');
        const provider = makeStubProvider();
        await tool.handler(
            {
                guild_id: GUILD,
                name: 'Raid Night',
                entity_type: 'voice',
                scheduled_start_time: START,
                channel_id: CHANNEL,
                description: 'Come hang out',
            },
            provider,
        );
        expect(provider.createScheduledEvent).toHaveBeenCalledWith({
            guildId: GUILD,
            name: 'Raid Night',
            entityType: 'VOICE',
            scheduledStartTime: START,
            scheduledEndTime: undefined,
            description: 'Come hang out',
            channelId: CHANNEL,
            location: undefined,
            privacyLevel: 'GUILD_ONLY',
        });
    });

    it('create_scheduled_event accepts external with location and end time', async () => {
        const tool = findTool('create_scheduled_event');
        const provider = makeStubProvider();
        await tool.handler(
            {
                guild_id: GUILD,
                name: 'Meetup',
                entity_type: 'external',
                scheduled_start_time: START,
                scheduled_end_time: END,
                location: 'Central Park',
            },
            provider,
        );
        expect(provider.createScheduledEvent).toHaveBeenCalledWith({
            guildId: GUILD,
            name: 'Meetup',
            entityType: 'EXTERNAL',
            scheduledStartTime: START,
            scheduledEndTime: END,
            description: undefined,
            channelId: undefined,
            location: 'Central Park',
            privacyLevel: 'GUILD_ONLY',
        });
    });

    it('create_scheduled_event schema rejects invalid entity_type', () => {
        const tool = findTool('create_scheduled_event');
        expect(() =>
            tool.schema.parse({
                guild_id: GUILD,
                name: 'x',
                entity_type: 'bogus',
                scheduled_start_time: START,
            }),
        ).toThrow();
    });

    it('create_scheduled_event schema rejects voice/stage without channel_id', () => {
        const tool = findTool('create_scheduled_event');
        expect(() =>
            tool.schema.parse({
                guild_id: GUILD,
                name: 'x',
                entity_type: 'voice',
                scheduled_start_time: START,
            }),
        ).toThrow();
    });

    it('create_scheduled_event schema rejects external without location', () => {
        const tool = findTool('create_scheduled_event');
        expect(() =>
            tool.schema.parse({
                guild_id: GUILD,
                name: 'x',
                entity_type: 'external',
                scheduled_start_time: START,
                scheduled_end_time: END,
            }),
        ).toThrow();
    });

    it('create_scheduled_event schema rejects external without scheduled_end_time', () => {
        const tool = findTool('create_scheduled_event');
        expect(() =>
            tool.schema.parse({
                guild_id: GUILD,
                name: 'x',
                entity_type: 'external',
                scheduled_start_time: START,
                location: 'Somewhere',
            }),
        ).toThrow();
    });

    it('edit_scheduled_event forwards only provided fields', async () => {
        const tool = findTool('edit_scheduled_event');
        const provider = makeStubProvider();
        await tool.handler(
            {
                guild_id: GUILD,
                event_id: EVENT,
                name: 'New Name',
                description: 'Updated',
            },
            provider,
        );
        expect(provider.editScheduledEvent).toHaveBeenCalledWith({
            guildId: GUILD,
            eventId: EVENT,
            name: 'New Name',
            description: 'Updated',
            entityType: undefined,
            scheduledStartTime: undefined,
            scheduledEndTime: undefined,
            channelId: undefined,
            location: undefined,
            privacyLevel: undefined,
        });
    });

    it('delete_scheduled_event returns success payload', async () => {
        const tool = findTool('delete_scheduled_event');
        const provider = makeStubProvider();
        const result = await tool.handler({ guild_id: GUILD, event_id: EVENT }, provider);
        expect(provider.deleteScheduledEvent).toHaveBeenCalledWith(GUILD, EVENT);
        expect(result).toEqual({ success: true, event_id: EVENT });
    });

    it('get_event_subscribers passes guild_id, event_id, and optional limit', async () => {
        const tool = findTool('get_event_subscribers');
        const provider = makeStubProvider();
        await tool.handler({ guild_id: GUILD, event_id: EVENT, limit: 50 }, provider);
        expect(provider.getEventSubscribers).toHaveBeenCalledWith(GUILD, EVENT, 50);
    });

    it('get_event_subscribers rejects limit greater than 100', () => {
        const tool = findTool('get_event_subscribers');
        expect(() => tool.schema.parse({ guild_id: GUILD, event_id: EVENT, limit: 101 })).toThrow();
    });

    it('create_event_invite calls provider.createEventInvite with guild/event/channel', async () => {
        const tool = findTool('create_event_invite');
        const provider = makeStubProvider();
        const result = await tool.handler(
            { guild_id: GUILD, event_id: EVENT, channel_id: CHANNEL },
            provider,
        );
        expect(provider.createEventInvite).toHaveBeenCalledWith(GUILD, EVENT, CHANNEL);
        expect(result).toEqual({ code: 'abc', url: 'https://discord.gg/abc?event=ev1', eventId: 'ev1' });
    });
});
