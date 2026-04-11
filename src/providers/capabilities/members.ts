import type { DiscordMember, DiscordUser, PaginatedResult } from '../../types/discord.js';

export interface MemberCapability {
    listMembers(guildId: string, limit?: number, after?: string): Promise<PaginatedResult<DiscordMember>>;
    getMember(guildId: string, userId: string): Promise<DiscordMember>;
    getUser(userId: string): Promise<DiscordUser>;
    searchMembers(guildId: string, query: string, limit?: number): Promise<DiscordMember[]>;
}
