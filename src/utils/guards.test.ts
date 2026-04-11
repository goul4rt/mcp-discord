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
