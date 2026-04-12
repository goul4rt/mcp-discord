import type { Ban, DiscordMember, DiscordUser, PaginatedResult } from '../../types/discord.js';

export interface MemberCapability {
    listMembers(guildId: string, limit?: number, after?: string): Promise<PaginatedResult<DiscordMember>>;
    getMember(guildId: string, userId: string): Promise<DiscordMember>;
    getUser(userId: string): Promise<DiscordUser>;
    searchMembers(guildId: string, query: string, limit?: number): Promise<DiscordMember[]>;
    setNickname(guildId: string, userId: string, nickname: string, reason?: string): Promise<void>;
    bulkBan(
        guildId: string,
        userIds: string[],
        reason?: string,
        deleteMessageSeconds?: number
    ): Promise<{ bannedCount: number; failed: string[] }>;
    listBans(guildId: string, limit?: number, after?: string): Promise<PaginatedResult<Ban>>;
    pruneMembers(
        guildId: string,
        days: number,
        includeRoles?: string[],
        dryRun?: boolean
    ): Promise<{ prunedCount: number; dryRun: boolean }>;
    getMemberInfo(guildId: string, userId: string): Promise<DiscordMember>;
}
