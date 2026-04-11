// src/utils/guards.test.ts
import { describe, it, expect } from 'vitest';
import { ChannelType } from 'discord.js';
import {
    isTextBasedChannel,
    isGuildChannel,
    isThreadChannel,
    assertTextChannel,
    assertGuildChannel,
    assertThreadChannel,
} from './guards.js';

describe('isTextBasedChannel', () => {
    it('returns true when channel has send and messages properties', () => {
        const channel = { send: () => {}, messages: {} };
        expect(isTextBasedChannel(channel)).toBe(true);
    });

    it('returns false when channel is missing send', () => {
        const channel = { messages: {} };
        expect(isTextBasedChannel(channel)).toBe(false);
    });

    it('returns false when channel is missing messages', () => {
        const channel = { send: () => {} };
        expect(isTextBasedChannel(channel)).toBe(false);
    });
});

describe('isGuildChannel', () => {
    it('returns true when channel has guild and guildId properties', () => {
        const channel = { guild: {}, guildId: '123456789012345678' };
        expect(isGuildChannel(channel)).toBe(true);
    });

    it('returns false when channel is missing guild', () => {
        const channel = { guildId: '123456789012345678' };
        expect(isGuildChannel(channel)).toBe(false);
    });

    it('returns false when channel is missing guildId', () => {
        const channel = { guild: {} };
        expect(isGuildChannel(channel)).toBe(false);
    });
});

describe('isThreadChannel', () => {
    it('returns true for PublicThread', () => {
        expect(isThreadChannel({ type: ChannelType.PublicThread })).toBe(true);
    });

    it('returns true for PrivateThread', () => {
        expect(isThreadChannel({ type: ChannelType.PrivateThread })).toBe(true);
    });

    it('returns true for AnnouncementThread', () => {
        expect(isThreadChannel({ type: ChannelType.AnnouncementThread })).toBe(true);
    });

    it('returns false for GuildText', () => {
        expect(isThreadChannel({ type: ChannelType.GuildText })).toBe(false);
    });

    it('returns false for GuildVoice', () => {
        expect(isThreadChannel({ type: ChannelType.GuildVoice })).toBe(false);
    });
});

describe('assertTextChannel', () => {
    it('does not throw for a valid text channel', () => {
        const channel = { send: () => {}, messages: {} };
        expect(() => assertTextChannel(channel, '123')).not.toThrow();
    });

    it('throws when channel is null', () => {
        expect(() => assertTextChannel(null, '123')).toThrow(/Channel 123 not found/);
    });

    it('throws when channel is not text-based', () => {
        const channel = { type: ChannelType.GuildVoice };
        expect(() => assertTextChannel(channel, '123')).toThrow(/not a text-based channel/);
    });
});

describe('assertGuildChannel', () => {
    it('does not throw for a valid guild channel', () => {
        const channel = { guild: {}, guildId: '123456789012345678' };
        expect(() => assertGuildChannel(channel, '123')).not.toThrow();
    });

    it('throws when channel is null', () => {
        expect(() => assertGuildChannel(null, '123')).toThrow(/Channel 123 not found/);
    });

    it('throws when channel is not a guild channel', () => {
        const channel = { type: ChannelType.DM };
        expect(() => assertGuildChannel(channel, '123')).toThrow(/not a guild channel/);
    });
});

describe('assertThreadChannel', () => {
    it('does not throw for a valid thread channel', () => {
        const channel = { type: ChannelType.PublicThread };
        expect(() => assertThreadChannel(channel, '123')).not.toThrow();
    });

    it('throws when channel is null', () => {
        expect(() => assertThreadChannel(null, '123')).toThrow(/Channel 123 not found/);
    });

    it('throws when channel is not a thread', () => {
        const channel = { type: ChannelType.GuildText };
        expect(() => assertThreadChannel(channel, '123')).toThrow(/not a thread/);
    });
});
