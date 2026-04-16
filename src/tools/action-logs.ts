/**
 * Action Log Tools — configure and manage server audit logging.
 *
 * The action log system tracks 30+ Discord events (messages, members, roles, channels, etc.)
 * with configurable granularity:
 * - Global enable/disable
 * - Mode: single (one log channel) or per-event (each event type in its own channel)
 * - Per-event settings: enabled, channel
 * - Filters: ignored channels/roles, ignore bots
 */

import { z } from 'zod';
import type { DiscordProvider } from '../providers/discord-provider.js';
import { snowflakeId } from './schemas.js';
import type { ToolDefinition } from './registry.js';

export const actionLogEventNames = [
    'messageDelete', 'messageEdit', 'messageBulkDelete',
    'inviteCreate', 'inviteDelete', 'moderatorCommand',
    'memberJoin', 'memberLeave', 'memberRoleAdd', 'memberRoleRemove',
    'memberTimeout', 'memberNicknameChange', 'memberBan', 'memberUnban',
    'roleCreate', 'roleUpdate', 'roleDelete',
    'channelCreate', 'channelUpdate', 'channelDelete',
    'emojiCreate', 'emojiUpdate', 'emojiDelete',
    'reactionAdd', 'reactionRemove',
    'voiceJoin', 'voiceLeave', 'voiceMove',
    'threadCreate', 'threadUpdate', 'threadDelete',
    'guildUpdate',
] as const;

const actionLogEventSchema = z.enum(actionLogEventNames);
const configResponseSchema = z.object({
    enabled: z.boolean(),
    mode: z.enum(['single', 'per-event']),
    singleChannelId: z.string().nullable(),
    events: z.record(z.object({
        enabled: z.boolean(),
        channelId: z.string().nullable(),
    })),
    ignoredChannelIds: z.array(z.string()),
    ignoredRoleIds: z.array(z.string()),
    ignoreBots: z.boolean(),
});

export const actionLogTools: ToolDefinition[] = [
    {
        name: 'get_action_log_config',
        description: 'Get the current action log configuration for a server. Returns enabled status, mode (single or per-event), and per-event settings including which channel each event type logs to.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => {
            const config = await provider.getActionLogConfig(input.guild_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_action_log_enabled',
        description: 'Enable or disable action logging entirely for a server. When disabled, no events are logged.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            enabled: z.boolean().describe('Whether to enable action logging'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setActionLogEnabled(input.guild_id, input.enabled);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_action_log_mode',
        description: 'Change the action log mode. "single" sends all logs to one channel. "per-event" sends each event type (messageDelete, memberBan, etc.) to its own configured channel.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            mode: z.enum(['single', 'per-event']).describe('Logging mode: "single" (all events in one channel) or "per-event" (each event type in its own channel)'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setActionLogMode(input.guild_id, input.mode);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_event_log_channel',
        description: 'Set the channel where a specific event type logs to. In "single" mode, set event to "__single" to configure the shared channel. In "per-event" mode, specify the event name (e.g., "messageDelete", "memberBan") to configure that event\'s channel.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            event: z.string().describe('Event name (e.g., "messageDelete", "memberBan") or "__single" for single-channel mode'),
            channel_id: snowflakeId.nullable().describe('Channel ID, or null to disable logging for this event'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setEventLogChannel(input.guild_id, input.event, input.channel_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_event_log_enabled',
        description: 'Enable or disable a specific event type in the action logs. Disabled events do not generate log entries even if logging is globally enabled.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            event: z.string().describe('Event name to enable/disable (e.g., "messageDelete", "memberBan", "roleCreate")'),
            enabled: z.boolean().describe('Whether to log this event type'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setEventLogEnabled(input.guild_id, input.event, input.enabled);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'update_log_filters',
        description: 'Update action log filters: which channels and roles are excluded from logging, and whether to ignore bot actions. Pass only the fields you want to change.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            ignored_channel_ids: z.array(snowflakeId).optional().describe('Channel IDs to exclude from logging (replaces previous list)'),
            ignored_role_ids: z.array(snowflakeId).optional().describe('Role IDs to exclude from logging (replaces previous list)'),
            ignore_bots: z.boolean().optional().describe('Whether to ignore actions by bots'),
        }),
        handler: async (input, provider) => {
            const config = await provider.updateLogFilters(input.guild_id, {
                ignoredChannelIds: input.ignored_channel_ids,
                ignoredRoleIds: input.ignored_role_ids,
                ignoreBots: input.ignore_bots,
            });
            return configResponseSchema.parse(config);
        },
    },
];
