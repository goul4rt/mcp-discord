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
