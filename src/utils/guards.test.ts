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
