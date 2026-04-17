/**
 * Reaction Roles Capability
 *
 * Provides methods to manage and deploy reaction-role panels.
 * Panels contain buttons that allow users to assign themselves roles.
 */

export interface ReactionRoleButton {
    id: string;
    emoji?: string;
    label: string;
    roleId: string;
    style: 'primary' | 'secondary' | 'success' | 'danger';
}

export interface ReactionRolePanel {
    id: string;
    name: string;
    enabled: boolean;
    channelId: string;
    messageId?: string;
    content?: string;
    embedSchema?: { embed: Record<string, unknown> } | null;
    mode: 'standard' | 'reverse';
    allowMultiple: boolean;
    buttons: ReactionRoleButton[];
    deployedAt?: string;
    messageOnAdd?: string;
    messageOnRemove?: string;
}

export interface ReactionRolesConfig {
    enabled: boolean;
    panels: ReactionRolePanel[];
}

export interface ReactionRolesCapability {
    getReactionRolesConfig(guildId: string): Promise<ReactionRolesConfig>;
    setReactionRolesEnabled(guildId: string, enabled: boolean): Promise<ReactionRolesConfig>;
    createReactionRolePanel(
        guildId: string,
        input: {
            name: string;
            channelId: string;
            buttons: Array<Omit<ReactionRoleButton, 'id'>>;
            mode?: 'standard' | 'reverse';
            allowMultiple?: boolean;
            content?: string;
            embedSchema?: { embed: Record<string, unknown> } | null;
            messageOnAdd?: string;
            messageOnRemove?: string;
        }
    ): Promise<ReactionRolePanel>;
    updateReactionRolePanel(
        guildId: string,
        panelId: string,
        updates: Partial<Omit<ReactionRolePanel, 'id' | 'messageId' | 'deployedAt'>>
    ): Promise<ReactionRolePanel>;
    deleteReactionRolePanel(guildId: string, panelId: string): Promise<void>;
    deployReactionRolePanel(guildId: string, panelId: string): Promise<{ messageId: string }>;
    addPanelButton(
        guildId: string,
        panelId: string,
        button: Omit<ReactionRoleButton, 'id'>
    ): Promise<ReactionRolePanel>;
    removePanelButton(guildId: string, panelId: string, buttonId: string): Promise<ReactionRolePanel>;
}
