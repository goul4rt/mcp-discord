import type { z } from 'zod';

export interface ActionLogConfig {
    enabled: boolean;
    mode: 'single' | 'per-event';
    singleChannelId: string | null;
    events: Record<string, {
        enabled: boolean;
        channelId: string | null;
    }>;
    ignoredChannelIds: string[];
    ignoredRoleIds: string[];
    ignoreBots: boolean;
}

export interface ActionLogCapability {
    /**
     * Get the current action log configuration for a guild.
     */
    getActionLogConfig(guildId: string): Promise<ActionLogConfig>;

    /**
     * Enable or disable action logging entirely for a guild.
     */
    setActionLogEnabled(guildId: string, enabled: boolean): Promise<ActionLogConfig>;

    /**
     * Change action log mode: 'single' (one channel) or 'per-event' (each event type in its own channel).
     */
    setActionLogMode(guildId: string, mode: 'single' | 'per-event'): Promise<ActionLogConfig>;

    /**
     * Set the channel for a specific action log event (or for the single channel mode).
     * For 'single' mode, pass event='__single' and the channelId.
     * For 'per-event' mode, pass event='messageDelete', 'memberBan', etc. and the channelId.
     */
    setEventLogChannel(guildId: string, event: string, channelId: string | null): Promise<ActionLogConfig>;

    /**
     * Enable or disable a specific event type in action logs.
     */
    setEventLogEnabled(guildId: string, event: string, enabled: boolean): Promise<ActionLogConfig>;

    /**
     * Update action log filters: ignored channels, roles, and whether to ignore bots.
     * Pass only the fields you want to change.
     */
    updateLogFilters(guildId: string, options: {
        ignoredChannelIds?: string[];
        ignoredRoleIds?: string[];
        ignoreBots?: boolean;
    }): Promise<ActionLogConfig>;
}
