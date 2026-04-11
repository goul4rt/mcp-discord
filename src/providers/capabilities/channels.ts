import type {
    CreateChannelOptions,
    CreateThreadOptions,
    DiscordChannel,
    DiscordChannelSummary,
    EditChannelOptions,
} from '../../types/discord.js';

export interface ChannelCapability {
    getChannels(guildId: string): Promise<DiscordChannelSummary[]>;
    getChannel(channelId: string): Promise<DiscordChannel>;
    createChannel(options: CreateChannelOptions): Promise<DiscordChannel>;
    editChannel(options: EditChannelOptions): Promise<DiscordChannel>;
    deleteChannel(channelId: string, reason?: string): Promise<void>;

    createThread(options: CreateThreadOptions): Promise<DiscordChannel>;
    archiveThread(threadId: string): Promise<void>;
}
