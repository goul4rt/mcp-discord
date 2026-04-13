import type { ChannelPermissionsAudit, PermissionOverwrite } from '../../types/discord.js';

export interface PermissionCapability {
    getChannelPermissions(channelId: string): Promise<PermissionOverwrite[]>;
    setRolePermission(
        channelId: string,
        roleId: string,
        allow: string[],
        deny: string[],
    ): Promise<void>;
    setMemberPermission(
        channelId: string,
        userId: string,
        allow: string[],
        deny: string[],
    ): Promise<void>;
    resetChannelPermissions(channelId: string): Promise<void>;
    copyPermissions(sourceChannelId: string, targetChannelId: string): Promise<void>;
    auditPermissions(guildId: string): Promise<ChannelPermissionsAudit[]>;
}
