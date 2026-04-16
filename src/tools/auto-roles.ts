/**
 * Auto Roles Tools — configure automatic role assignment on member join.
 *
 * The auto-roles system assigns predefined role sets to new members based on whether
 * they are human or bot accounts. Configuration is simple: define role lists for each type.
 */

import { z } from 'zod';
import type { DiscordProvider } from '../providers/discord-provider.js';
import { snowflakeId } from './schemas.js';
import type { ToolDefinition } from './registry.js';

const configResponseSchema = z.object({
    enabled: z.boolean(),
    memberRoles: z.array(z.string()),
    botRoles: z.array(z.string()),
});

export const autoRoleTools: ToolDefinition[] = [
    {
        name: 'get_auto_roles_config',
        description: 'Get the current auto-roles configuration for a server. Returns whether auto-roles is enabled, and the lists of roles to assign to human members and bots on join.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => {
            const config = await provider.getAutoRolesConfig(input.guild_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_auto_roles_enabled',
        description: 'Enable or disable automatic role assignment. When disabled, new members will not receive auto-assigned roles regardless of configuration.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            enabled: z.boolean().describe('Whether to enable auto-roles'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setAutoRolesEnabled(input.guild_id, input.enabled);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_member_roles',
        description: 'Set the roles to automatically assign to human (non-bot) members when they join. Pass the complete list; this replaces the previous list.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            role_ids: z.array(snowflakeId).describe('Role IDs to assign to human members'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setMemberRoles(input.guild_id, input.role_ids);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_bot_roles',
        description: 'Set the roles to automatically assign to bot members when they join. Pass the complete list; this replaces the previous list.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            role_ids: z.array(snowflakeId).describe('Role IDs to assign to bots'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setBotRoles(input.guild_id, input.role_ids);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'add_member_role',
        description: 'Add a single role to the list of roles assigned to human members. Does not affect existing roles.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            role_id: snowflakeId.describe('The role ID to add'),
        }),
        handler: async (input, provider) => {
            const config = await provider.addMemberRole(input.guild_id, input.role_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'add_bot_role',
        description: 'Add a single role to the list of roles assigned to bots. Does not affect existing roles.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            role_id: snowflakeId.describe('The role ID to add'),
        }),
        handler: async (input, provider) => {
            const config = await provider.addBotRole(input.guild_id, input.role_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'remove_member_role',
        description: 'Remove a single role from the list of roles assigned to human members. Does not affect other roles.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            role_id: snowflakeId.describe('The role ID to remove'),
        }),
        handler: async (input, provider) => {
            const config = await provider.removeMemberRole(input.guild_id, input.role_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'remove_bot_role',
        description: 'Remove a single role from the list of roles assigned to bots. Does not affect other roles.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            role_id: snowflakeId.describe('The role ID to remove'),
        }),
        handler: async (input, provider) => {
            const config = await provider.removeBotRole(input.guild_id, input.role_id);
            return configResponseSchema.parse(config);
        },
    },
];
