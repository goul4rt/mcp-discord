import type { CreateRoleOptions, DiscordMember, DiscordRole } from '../../types/discord.js';

export interface EditRoleOptions {
    guildId: string;
    roleId: string;
    name?: string;
    color?: number;
    permissions?: string[];
    hoist?: boolean;
    mentionable?: boolean;
}

export interface RoleCapability {
    listRoles(guildId: string): Promise<DiscordRole[]>;
    createRole(options: CreateRoleOptions): Promise<DiscordRole>;
    addRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void>;
    removeRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void>;
    editRole(options: EditRoleOptions): Promise<DiscordRole>;
    deleteRole(guildId: string, roleId: string, reason?: string): Promise<void>;
    getRoleMembers(guildId: string, roleId: string): Promise<DiscordMember[]>;
    setRolePosition(guildId: string, roleId: string, position: number): Promise<void>;
    setRoleIcon(guildId: string, roleId: string, icon: string): Promise<void>;
}
