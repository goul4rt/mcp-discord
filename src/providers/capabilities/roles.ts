import type { CreateRoleOptions, DiscordRole } from '../../types/discord.js';

export interface RoleCapability {
    listRoles(guildId: string): Promise<DiscordRole[]>;
    createRole(options: CreateRoleOptions): Promise<DiscordRole>;
    addRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void>;
    removeRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void>;
}
