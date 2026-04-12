import type { DiscordEmbed, DiscordMessage } from '../../types/discord.js';

export interface SendDMOptions {
    userId: string;
    content?: string;
    embeds?: DiscordEmbed[];
}

export interface DMCapability {
    sendDM(options: SendDMOptions): Promise<DiscordMessage>;
}
