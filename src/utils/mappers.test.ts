// src/utils/mappers.test.ts
import { describe, it, expect } from 'vitest';
import { ChannelType as DjsChannelType } from 'discord.js';
import {
    mapChannelType,
    mapGuild,
    mapGuildDetailed,
    mapChannelSummary,
    mapChannel,
    mapMessage,
    mapMember,
    mapUser,
    mapRole,
    mapApiMessage,
} from './mappers.js';
import { ChannelType } from '../types/discord.js';

// ─── Fixture helpers ────────────────────────────────────────────

function makeFakeRole(overrides: Record<string, any> = {}): any {
    return {
        id: '111',
        name: 'Admin',
        color: 0xff0000,
        position: 1,
        permissions: { bitfield: 8n },
        mentionable: true,
        managed: false,
        members: { size: 3 },
        ...overrides,
    };
}

function makeFakeChannel(overrides: Record<string, any> = {}): any {
    return {
        id: '222',
        name: 'general',
        type: DjsChannelType.GuildText,
        parentId: null,
        parent: null,
        position: 0,
        topic: 'hello',
        guildId: '333',
        nsfw: false,
        rateLimitPerUser: 0,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        ...overrides,
    };
}

function makeFakeGuild(overrides: Record<string, any> = {}): any {
    return {
        id: '333',
        name: 'Test Guild',
        iconURL: () => 'https://cdn.example/icon.png',
        memberCount: 42,
        ownerId: '444',
        description: 'A test guild',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        features: ['COMMUNITY'],
        premiumTier: 2,
        premiumSubscriptionCount: 5,
        roles: { cache: [makeFakeRole()] },
        channels: { cache: [makeFakeChannel()] },
        emojis: { cache: [{ id: 'e1', name: 'wave', animated: false }] },
        ...overrides,
    };
}

function makeFakeMessage(overrides: Record<string, any> = {}): any {
    return {
        id: '555',
        channelId: '222',
        guildId: '333',
        author: {
            id: '666',
            username: 'alice',
            displayName: 'Alice',
            bot: false,
        },
        content: 'hello world',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        editedAt: null,
        attachments: [],
        embeds: [],
        reactions: { cache: [] },
        reference: null,
        pinned: false,
        ...overrides,
    };
}

function makeFakeMember(overrides: Record<string, any> = {}): any {
    return {
        id: '666',
        user: {
            username: 'alice',
            displayName: 'Alice',
            bot: false,
        },
        nickname: 'Alie',
        displayAvatarURL: () => 'https://cdn.example/avatar.png',
        roles: { cache: [makeFakeRole()] },
        joinedAt: new Date('2024-01-01T00:00:00.000Z'),
        presence: { status: 'online' },
        ...overrides,
    };
}

function makeFakeUser(overrides: Record<string, any> = {}): any {
    return {
        id: '666',
        username: 'alice',
        displayName: 'Alice',
        avatarURL: () => 'https://cdn.example/avatar.png',
        bot: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        bannerURL: () => 'https://cdn.example/banner.png',
        ...overrides,
    };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('mapChannelType', () => {
    it('maps GuildText to TEXT', () => {
        expect(mapChannelType(DjsChannelType.GuildText)).toBe(ChannelType.TEXT);
    });

    it('maps GuildVoice to VOICE', () => {
        expect(mapChannelType(DjsChannelType.GuildVoice)).toBe(ChannelType.VOICE);
    });

    it('maps GuildCategory to CATEGORY', () => {
        expect(mapChannelType(DjsChannelType.GuildCategory)).toBe(ChannelType.CATEGORY);
    });

    it('maps GuildAnnouncement to ANNOUNCEMENT', () => {
        expect(mapChannelType(DjsChannelType.GuildAnnouncement)).toBe(ChannelType.ANNOUNCEMENT);
    });

    it('maps GuildStageVoice to STAGE', () => {
        expect(mapChannelType(DjsChannelType.GuildStageVoice)).toBe(ChannelType.STAGE);
    });

    it('maps GuildForum to FORUM', () => {
        expect(mapChannelType(DjsChannelType.GuildForum)).toBe(ChannelType.FORUM);
    });

    it('maps PublicThread, PrivateThread, AnnouncementThread to THREAD', () => {
        expect(mapChannelType(DjsChannelType.PublicThread)).toBe(ChannelType.THREAD);
        expect(mapChannelType(DjsChannelType.PrivateThread)).toBe(ChannelType.THREAD);
        expect(mapChannelType(DjsChannelType.AnnouncementThread)).toBe(ChannelType.THREAD);
    });

    it('returns UNKNOWN for unrecognized types', () => {
        expect(mapChannelType(9999 as any)).toBe(ChannelType.UNKNOWN);
    });
});

describe('mapGuild', () => {
    it('extracts id, name, icon, memberCount, ownerId, description, createdAt, features', () => {
        const result = mapGuild(makeFakeGuild());
        expect(result).toEqual({
            id: '333',
            name: 'Test Guild',
            icon: 'https://cdn.example/icon.png',
            memberCount: 42,
            ownerId: '444',
            description: 'A test guild',
            createdAt: '2024-01-01T00:00:00.000Z',
            features: ['COMMUNITY'],
        });
    });
});

describe('mapGuildDetailed', () => {
    it('extends mapGuild with roles, channels, emojis, boostLevel, boostCount', () => {
        const result = mapGuildDetailed(makeFakeGuild());
        expect(result.id).toBe('333');
        expect(result.boostLevel).toBe(2);
        expect(result.boostCount).toBe(5);
        expect(result.roles).toHaveLength(1);
        expect(result.roles[0].id).toBe('111');
        expect(result.channels).toHaveLength(1);
        expect(result.channels[0].id).toBe('222');
        expect(result.emojis).toEqual([{ id: 'e1', name: 'wave', animated: false }]);
    });

    it('defaults boostCount to 0 when premiumSubscriptionCount is null', () => {
        const result = mapGuildDetailed(makeFakeGuild({ premiumSubscriptionCount: null }));
        expect(result.boostCount).toBe(0);
    });
});

describe('mapChannelSummary', () => {
    it('extracts id, name, type, parentId, parentName, position, topic', () => {
        const channel = makeFakeChannel({
            parentId: '777',
            parent: { name: 'Category Name' },
        });
        const result = mapChannelSummary(channel);
        expect(result).toEqual({
            id: '222',
            name: 'general',
            type: ChannelType.TEXT,
            parentId: '777',
            parentName: 'Category Name',
            position: 0,
            topic: 'hello',
        });
    });

    it('returns null topic when channel has no topic property', () => {
        const channel = makeFakeChannel();
        delete channel.topic;
        const result = mapChannelSummary(channel);
        expect(result.topic).toBeNull();
    });
});

describe('mapChannel', () => {
    it('extends mapChannelSummary with guildId, nsfw, rateLimitPerUser, createdAt', () => {
        const result = mapChannel(makeFakeChannel());
        expect(result.guildId).toBe('333');
        expect(result.nsfw).toBe(false);
        expect(result.rateLimitPerUser).toBe(0);
        expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('falls back to current date when createdAt is null', () => {
        const result = mapChannel(makeFakeChannel({ createdAt: null }));
        expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});

describe('mapMessage', () => {
    it('maps basic message fields', () => {
        const result = mapMessage(makeFakeMessage());
        expect(result.id).toBe('555');
        expect(result.channelId).toBe('222');
        expect(result.guildId).toBe('333');
        expect(result.content).toBe('hello world');
        expect(result.timestamp).toBe('2024-01-01T00:00:00.000Z');
        expect(result.editedTimestamp).toBeNull();
        expect(result.pinned).toBe(false);
        expect(result.replyTo).toBeNull();
    });

    it('flattens the author object', () => {
        const result = mapMessage(makeFakeMessage());
        expect(result.author).toEqual({
            id: '666',
            username: 'alice',
            displayName: 'Alice',
            bot: false,
        });
    });

    it('maps attachments', () => {
        const message = makeFakeMessage({
            attachments: [{ url: 'https://cdn/a.png', name: 'a.png', size: 1024 }],
        });
        const result = mapMessage(message);
        expect(result.attachments).toEqual([
            { url: 'https://cdn/a.png', name: 'a.png', size: 1024 },
        ]);
    });

    it('maps embeds including nested footer, thumbnail, image, author, fields', () => {
        const message = makeFakeMessage({
            embeds: [{
                title: 'title',
                description: 'desc',
                url: 'https://example.com',
                color: 0xff0000,
                fields: [{ name: 'f1', value: 'v1', inline: true }],
                footer: { text: 'footer', iconURL: 'https://cdn/f.png' },
                thumbnail: { url: 'https://cdn/t.png' },
                image: { url: 'https://cdn/i.png' },
                author: { name: 'author', url: 'https://example.com/author', iconURL: 'https://cdn/auth.png' },
                timestamp: '2024-01-01T00:00:00.000Z',
            }],
        });
        const result = mapMessage(message);
        expect(result.embeds).toHaveLength(1);
        expect(result.embeds[0].title).toBe('title');
        expect(result.embeds[0].footer).toEqual({ text: 'footer', iconUrl: 'https://cdn/f.png' });
        expect(result.embeds[0].thumbnail).toEqual({ url: 'https://cdn/t.png' });
        expect(result.embeds[0].image).toEqual({ url: 'https://cdn/i.png' });
        expect(result.embeds[0].author?.iconUrl).toBe('https://cdn/auth.png');
        expect(result.embeds[0].fields).toEqual([{ name: 'f1', value: 'v1', inline: true }]);
    });

    it('maps reactions from reactions.cache', () => {
        const message = makeFakeMessage({
            reactions: {
                cache: [{ emoji: { toString: () => '👍' }, count: 3, me: true }],
            },
        });
        const result = mapMessage(message);
        expect(result.reactions).toEqual([{ emoji: '👍', count: 3, me: true }]);
    });

    it('uses reference.messageId for replyTo', () => {
        const message = makeFakeMessage({ reference: { messageId: '999' } });
        const result = mapMessage(message);
        expect(result.replyTo).toBe('999');
    });
});

describe('mapMember', () => {
    it('extracts user identity fields and roles', () => {
        const result = mapMember(makeFakeMember());
        expect(result.userId).toBe('666');
        expect(result.username).toBe('alice');
        expect(result.displayName).toBe('Alice');
        expect(result.nickname).toBe('Alie');
        expect(result.avatar).toBe('https://cdn.example/avatar.png');
        expect(result.roles).toHaveLength(1);
        expect(result.roles[0]).toEqual({ id: '111', name: 'Admin', color: 0xff0000 });
        expect(result.joinedAt).toBe('2024-01-01T00:00:00.000Z');
        expect(result.bot).toBe(false);
    });

    it('uses presence.status when available', () => {
        const result = mapMember(makeFakeMember());
        expect(result.status).toBe('online');
    });

    it('defaults status to offline when presence is missing', () => {
        const result = mapMember(makeFakeMember({ presence: null }));
        expect(result.status).toBe('offline');
    });

    it('returns empty string joinedAt when joinedAt is null', () => {
        const result = mapMember(makeFakeMember({ joinedAt: null }));
        expect(result.joinedAt).toBe('');
    });
});

describe('mapUser', () => {
    it('extracts id, username, displayName, avatar, bot, createdAt, banner', () => {
        const result = mapUser(makeFakeUser());
        expect(result).toEqual({
            id: '666',
            username: 'alice',
            displayName: 'Alice',
            avatar: 'https://cdn.example/avatar.png',
            bot: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            banner: 'https://cdn.example/banner.png',
        });
    });

    it('defaults banner to null when bannerURL returns null', () => {
        const result = mapUser(makeFakeUser({ bannerURL: () => null }));
        expect(result.banner).toBeNull();
    });
});

describe('mapRole', () => {
    it('extracts id, name, color, position, permissions, mentionable, managed, memberCount', () => {
        const result = mapRole(makeFakeRole());
        expect(result).toEqual({
            id: '111',
            name: 'Admin',
            color: 0xff0000,
            position: 1,
            permissions: '8',
            mentionable: true,
            managed: false,
            memberCount: 3,
        });
    });
});
