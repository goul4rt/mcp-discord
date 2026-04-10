/**
 * Runtime type guards for Discord.js channel types.
 * These replace unsafe `as X` casts with proper runtime checks.
 */
import { ChannelType } from 'discord.js';

export function isTextBasedChannel(channel: any): boolean {
    return 'send' in channel && 'messages' in channel;
}

export function isGuildChannel(channel: any): boolean {
    return 'guild' in channel && 'guildId' in channel;
}

export function isThreadChannel(channel: any): boolean {
    return channel.type === ChannelType.PublicThread
        || channel.type === ChannelType.PrivateThread
        || channel.type === ChannelType.AnnouncementThread;
}

export function assertTextChannel(channel: any, channelId: string): void {
    if (!channel) throw new Error(`Channel ${channelId} not found`);
    if (!isTextBasedChannel(channel)) throw new Error(`Channel ${channelId} is not a text-based channel (type: ${channel.type})`);
}

export function assertGuildChannel(channel: any, channelId: string): void {
    if (!channel) throw new Error(`Channel ${channelId} not found`);
    if (!isGuildChannel(channel)) throw new Error(`Channel ${channelId} is not a guild channel (type: ${channel.type})`);
}

export function assertThreadChannel(channel: any, channelId: string): void {
    if (!channel) throw new Error(`Channel ${channelId} not found`);
    if (!isThreadChannel(channel)) throw new Error(`Channel ${channelId} is not a thread (type: ${channel.type})`);
}
