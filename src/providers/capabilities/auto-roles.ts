export interface AutoRolesConfig {
    enabled: boolean;
    memberRoles: string[];
    botRoles: string[];
}

export interface AutoRolesCapability {
    /**
     * Get the current auto-roles configuration for a guild.
     */
    getAutoRolesConfig(guildId: string): Promise<AutoRolesConfig>;

    /**
     * Enable or disable automatic role assignment on member join.
     */
    setAutoRolesEnabled(guildId: string, enabled: boolean): Promise<AutoRolesConfig>;

    /**
     * Set roles to assign to human members when they join.
     */
    setMemberRoles(guildId: string, roleIds: string[]): Promise<AutoRolesConfig>;

    /**
     * Set roles to assign to bot members when they join.
     */
    setBotRoles(guildId: string, roleIds: string[]): Promise<AutoRolesConfig>;

    /**
     * Add a role to the list of roles assigned to human members.
     */
    addMemberRole(guildId: string, roleId: string): Promise<AutoRolesConfig>;

    /**
     * Add a role to the list of roles assigned to bots.
     */
    addBotRole(guildId: string, roleId: string): Promise<AutoRolesConfig>;

    /**
     * Remove a role from the list of roles assigned to human members.
     */
    removeMemberRole(guildId: string, roleId: string): Promise<AutoRolesConfig>;

    /**
     * Remove a role from the list of roles assigned to bots.
     */
    removeBotRole(guildId: string, roleId: string): Promise<AutoRolesConfig>;
}
