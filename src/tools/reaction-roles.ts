/**
 * Reaction Roles Tools — manage and deploy reaction-role panels.
 *
 * Reaction-role panels are messages with buttons that allow users to assign
 * themselves roles by clicking buttons. Each button can be configured with an emoji,
 * label, and target role.
 */

import { z } from 'zod';
import type { DiscordProvider } from '../providers/discord-provider.js';
import { snowflakeId } from './schemas.js';
import type { ToolDefinition } from './registry.js';

const buttonSchema = z.object({
    id: z.string(),
    emoji: z.string().optional(),
    label: z.string(),
    roleId: snowflakeId,
    style: z.enum(['primary', 'secondary', 'success', 'danger']),
});

const panelSchema = z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    channelId: snowflakeId,
    messageId: snowflakeId.optional(),
    content: z.string().optional(),
    embedSchema: z.object({ embed: z.record(z.unknown()) }).nullable().optional(),
    mode: z.enum(['standard', 'reverse']),
    allowMultiple: z.boolean(),
    buttons: z.array(buttonSchema),
    deployedAt: z.string().optional(),
    messageOnAdd: z.string().optional(),
    messageOnRemove: z.string().optional(),
});

const configResponseSchema = z.object({
    enabled: z.boolean(),
    panels: z.array(panelSchema),
});

export const reactionRoleTools: ToolDefinition[] = [
    {
        name: 'get_reaction_roles_config',
        description: 'Get the current reaction-roles configuration. Returns whether reaction-roles is enabled and a list of all configured panels.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => {
            const config = await provider.getReactionRolesConfig(input.guild_id);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'set_reaction_roles_enabled',
        description: 'Enable or disable the reaction-roles feature. When disabled, users cannot use existing panels.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            enabled: z.boolean().describe('Whether to enable reaction-roles'),
        }),
        handler: async (input, provider) => {
            const config = await provider.setReactionRolesEnabled(input.guild_id, input.enabled);
            return configResponseSchema.parse(config);
        },
    },
    {
        name: 'create_reaction_role_panel',
        description: 'Create a new reaction-role panel with the specified buttons and settings. Returns the created panel with generated IDs.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            name: z.string().max(100).describe('Panel name'),
            channel_id: snowflakeId.describe('Channel where the panel will be deployed'),
            buttons: z
                .array(
                    z.object({
                        label: z.string().max(80).describe('Button label'),
                        role_id: snowflakeId.describe('Role ID to assign when button is clicked'),
                        style: z
                            .enum(['primary', 'secondary', 'success', 'danger'])
                            .describe('Button visual style'),
                        emoji: z.string().optional().describe('Button emoji'),
                    })
                )
                .min(1)
                .max(25)
                .describe('Buttons for the panel (1-25)'),
            mode: z
                .enum(['standard', 'reverse'])
                .optional()
                .default('standard')
                .describe('standard: clicking adds role; reverse: clicking removes role'),
            allow_multiple: z
                .boolean()
                .optional()
                .default(true)
                .describe('Whether users can have multiple roles from this panel'),
            content: z.string().optional().describe('Plain text message above the embed (max 2000)'),
            embed_schema: z
                .object({ embed: z.record(z.unknown()) })
                .nullable()
                .optional()
                .describe('Discord embed to display'),
            message_on_add: z
                .string()
                .optional()
                .describe('DM message to send when user gets the role (supports {cargo} placeholder)'),
            message_on_remove: z
                .string()
                .optional()
                .describe('DM message to send when user loses the role (supports {cargo} placeholder)'),
        }),
        handler: async (input, provider) => {
            const panel = await provider.createReactionRolePanel(input.guild_id, {
                name: input.name,
                channelId: input.channel_id,
                buttons: input.buttons.map((btn: any) => ({
                    emoji: btn.emoji,
                    label: btn.label,
                    roleId: btn.role_id,
                    style: btn.style,
                })),
                mode: input.mode,
                allowMultiple: input.allow_multiple,
                content: input.content,
                embedSchema: input.embed_schema,
                messageOnAdd: input.message_on_add,
                messageOnRemove: input.message_on_remove,
            });
            return panelSchema.parse(panel);
        },
    },
    {
        name: 'update_reaction_role_panel',
        description: 'Update settings of an existing panel (name, mode, messages, etc). Does not update buttons; use add/remove button tools for that.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            panel_id: z.string().describe('The panel ID to update'),
            name: z.string().max(100).optional().describe('New panel name'),
            mode: z.enum(['standard', 'reverse']).optional().describe('New panel mode'),
            allow_multiple: z.boolean().optional().describe('New allow_multiple setting'),
            content: z.string().optional().describe('New plain text message'),
            embed_schema: z
                .object({ embed: z.record(z.unknown()) })
                .nullable()
                .optional()
                .describe('New embed'),
            message_on_add: z.string().optional().describe('New DM on role add'),
            message_on_remove: z.string().optional().describe('New DM on role remove'),
        }),
        handler: async (input, provider) => {
            const panel = await provider.updateReactionRolePanel(input.guild_id, input.panel_id, {
                name: input.name,
                mode: input.mode,
                allowMultiple: input.allow_multiple,
                content: input.content,
                embedSchema: input.embed_schema,
                messageOnAdd: input.message_on_add,
                messageOnRemove: input.message_on_remove,
            });
            return panelSchema.parse(panel);
        },
    },
    {
        name: 'delete_reaction_role_panel',
        description: 'Delete a reaction-role panel and remove its Discord message if deployed.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            panel_id: z.string().describe('The panel ID to delete'),
        }),
        handler: async (input, provider) => {
            await provider.deleteReactionRolePanel(input.guild_id, input.panel_id);
            return { success: true };
        },
    },
    {
        name: 'deploy_reaction_role_panel',
        description: 'Deploy or update the Discord message for a reaction-role panel. Creates a new message or edits the existing one if already deployed.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            panel_id: z.string().describe('The panel ID to deploy'),
        }),
        handler: async (input, provider) => {
            const result = await provider.deployReactionRolePanel(input.guild_id, input.panel_id);
            return { messageId: result.messageId };
        },
    },
    {
        name: 'add_panel_button',
        description: 'Add a new button to an existing reaction-role panel.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            panel_id: z.string().describe('The panel ID to modify'),
            label: z.string().max(80).describe('Button label'),
            role_id: snowflakeId.describe('Role ID to assign when button is clicked'),
            style: z
                .enum(['primary', 'secondary', 'success', 'danger'])
                .describe('Button visual style'),
            emoji: z.string().optional().describe('Button emoji'),
        }),
        handler: async (input, provider) => {
            const panel = await provider.addPanelButton(input.guild_id, input.panel_id, {
                emoji: input.emoji,
                label: input.label,
                roleId: input.role_id,
                style: input.style,
            });
            return panelSchema.parse(panel);
        },
    },
    {
        name: 'remove_panel_button',
        description: 'Remove a button from an existing reaction-role panel.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            panel_id: z.string().describe('The panel ID to modify'),
            button_id: z.string().describe('The button ID to remove'),
        }),
        handler: async (input, provider) => {
            const panel = await provider.removePanelButton(input.guild_id, input.panel_id, input.button_id);
            return panelSchema.parse(panel);
        },
    },
];
