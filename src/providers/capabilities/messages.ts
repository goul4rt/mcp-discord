import type {
    DiscordEmbed,
    DiscordMessage,
    PaginatedResult,
    ReadMessagesOptions,
    SearchMessagesOptions,
    SendMessageOptions,
} from '../../types/discord.js';

export interface MessageCapability {
    sendMessage(options: SendMessageOptions): Promise<DiscordMessage>;
    readMessages(options: ReadMessagesOptions): Promise<PaginatedResult<DiscordMessage>>;
    getMessage(channelId: string, messageId: string): Promise<DiscordMessage>;
    editMessage(channelId: string, messageId: string, content: string, embeds?: DiscordEmbed[]): Promise<DiscordMessage>;
    deleteMessage(channelId: string, messageId: string, reason?: string): Promise<void>;
    deleteMessagesBulk(channelId: string, messageIds: string[], reason?: string): Promise<number>;
    pinMessage(channelId: string, messageId: string): Promise<void>;
    unpinMessage(channelId: string, messageId: string): Promise<void>;
    searchMessages(options: SearchMessagesOptions): Promise<PaginatedResult<DiscordMessage>>;
}
