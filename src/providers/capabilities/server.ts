import type { DiscordGuild, DiscordGuildDetailed } from '../../types/discord.js';

export interface ServerCapability {
    listGuilds(): Promise<DiscordGuild[]>;
    getGuild(guildId: string): Promise<DiscordGuildDetailed>;
}
