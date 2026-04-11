import type { AuditLogEntry, DiscordMessage } from '../../types/discord.js';

export interface MonitoringCapability {
    getAuditLog(guildId: string, limit?: number, actionType?: string): Promise<AuditLogEntry[]>;
    checkMentions(guildId: string, userId?: string, limit?: number): Promise<DiscordMessage[]>;
}
