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

const STYLE_ALIAS_MAP: Record<string, string> = {
    primary: 'primary', blue: 'primary', blurple: 'primary', info: 'primary',
    secondary: 'secondary', grey: 'secondary', gray: 'secondary', default: 'secondary', neutral: 'secondary',
    success: 'success', green: 'success', positive: 'success',
    danger: 'danger', red: 'danger', warning: 'danger', negative: 'danger', destructive: 'danger',
};

const styleSchema = z
    .string()
    .transform(s => STYLE_ALIAS_MAP[s.toLowerCase().trim()] ?? s)
    .pipe(z.enum(['primary', 'secondary', 'success', 'danger']));

const buttonSchema = z.object({
    id: z.string(),
    emoji: z.string().optional(),
    label: z.string(),
    roleId: snowflakeId,
    style: styleSchema,
});

const embedSchemaResponse = z
    .union([
        z.object({ embed: z.record(z.unknown()) }),
        z.record(z.unknown()).transform(raw => {
            if (raw && typeof raw === 'object' && 'embed' in raw) return raw as { embed: Record<string, unknown> };
            return { embed: raw as Record<string, unknown> };
        }),
    ])
    .nullable()
    .optional();

const panelSchema = z.object({
    id: z.string(),
    name: z.string(),
    enabled: z.boolean(),
    channelId: snowflakeId,
    messageId: snowflakeId.optional(),
    content: z.string().optional(),
    embedSchema: embedSchemaResponse,
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

/**
 * Safely parse config — skips panels with corrupted data (logged) instead of throwing.
 * Use when reading stored data that may have been created before current schema rules.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Panel IDs are UUID v4. Any other string format is definitely a hallucinated placeholder. */
function assertValidPanelId(panelId: string, context: string): void {
    if (!UUID_RE.test(panelId)) {
        throw new Error(
            `Invalid panel_id "${panelId}" — panel IDs are UUIDs (ex: "914bc8bb-4c56-4c95-84bf-e96d70f625f9"). ` +
            `Call get_reaction_roles_config first to retrieve real panel IDs. (context: ${context})`
        );
    }
}

function safeParseConfig(raw: unknown): z.infer<typeof configResponseSchema> {
    const result = configResponseSchema.safeParse(raw);
    if (result.success) return result.data;

    // Fallback: parse panels individually, skip corrupted ones
    const r = raw as { enabled?: boolean; panels?: unknown[] };
    const validPanels: z.infer<typeof panelSchema>[] = [];
    const corruptedIds: string[] = [];
    for (const p of r?.panels ?? []) {
        const panelResult = panelSchema.safeParse(p);
        if (panelResult.success) {
            validPanels.push(panelResult.data);
        } else {
            const pAny = p as { id?: string; name?: string };
            corruptedIds.push(pAny?.id ?? pAny?.name ?? 'unknown');
        }
    }
    if (corruptedIds.length > 0) {
        console.warn(`[reaction-roles] Skipped ${corruptedIds.length} corrupted panel(s): ${corruptedIds.join(', ')}`);
    }
    return {
        enabled: Boolean(r?.enabled),
        panels: validPanels,
    };
}

export const reactionRoleTools: ToolDefinition[] = [
    {
        name: 'get_reaction_roles_config',
        description: 'Get the current reaction-roles configuration. Returns whether reaction-roles is enabled and a list of all configured panels.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => {
            const config = await provider.getReactionRolesConfig(input.guild_id);
            return safeParseConfig(config);
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
            return safeParseConfig(config);
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
                            .string()
                            .transform(s => {
                                const normalized = s.toLowerCase().trim();
                                const aliasMap: Record<string, string> = {
                                    primary: 'primary', blue: 'primary', blurple: 'primary', info: 'primary',
                                    secondary: 'secondary', grey: 'secondary', gray: 'secondary', default: 'secondary', neutral: 'secondary',
                                    success: 'success', green: 'success', positive: 'success',
                                    danger: 'danger', red: 'danger', warning: 'danger', negative: 'danger', destructive: 'danger',
                                };
                                return aliasMap[normalized] ?? normalized;
                            })
                            .pipe(z.enum(['primary', 'secondary', 'success', 'danger']))
                            .describe('Button visual style: primary (blue), secondary (grey), success (green), danger (red). Accepts aliases: blue/blurple/info, grey/gray/default, green/positive, red/warning/negative.'),
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
                .union([
                    z.object({ embed: z.record(z.unknown()) }),
                    z.record(z.unknown()).transform(raw => {
                        if (raw && typeof raw === 'object' && 'embed' in raw) return raw as { embed: Record<string, unknown> };
                        return { embed: raw as Record<string, unknown> };
                    }),
                ])
                .nullable()
                .optional()
                .describe('Discord embed to display. Accepts either { embed: {...} } or { title, description, color, ... } (auto-wrapped).'),
            message_on_add: z
                .string()
                .optional()
                .describe('DM message to send when user gets the role (supports {cargo} placeholder)'),
            message_on_remove: z
                .string()
                .optional()
                .describe('DM message to send when user loses the role (supports {cargo} placeholder)'),
            deploy_after_create: z
                .boolean()
                .optional()
                .default(true)
                .describe('If true (default), automatically publishes the panel message to the channel after creation. Set to false to only persist without publishing.'),
            allow_duplicate_name: z
                .boolean()
                .optional()
                .default(false)
                .describe('If false (default), refuses to create a panel with the same name as an existing one and returns an error listing the existing panel ID (so caller can update/delete instead). Set true to bypass.'),
        }),
        handler: async (input, provider) => {
            // Validate name — reject empty/undefined up-front with a clear error so the
            // model can fix it before persisting a corrupt entry.
            if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
                throw new Error(
                    `create_reaction_role_panel: "name" is required and must be a non-empty string (got: ${JSON.stringify(input.name)}).`
                );
            }
            const cleanName = input.name.trim();

            if (!input.allow_duplicate_name) {
                const existing = await provider.getReactionRolesConfig(input.guild_id);
                // Only treat as duplicate when the existing panel has a valid, non-empty name
                // that matches (case-insensitive). This prevents legacy entries with
                // undefined/empty names from blocking all new panels.
                const dup = existing.panels.find(p => {
                    if (!p.name || typeof p.name !== 'string' || p.name.trim().length === 0) return false;
                    return p.name.trim().toLowerCase() === cleanName.toLowerCase();
                });
                if (dup) {
                    throw new Error(
                        `A panel named "${cleanName}" already exists (id=${dup.id}). ` +
                        `Use update_reaction_role_panel to modify it, delete_reaction_role_panel to remove it, ` +
                        `or set allow_duplicate_name=true to create a separate one with the same name.`
                    );
                }
            }

            const panel = await provider.createReactionRolePanel(input.guild_id, {
                name: cleanName,
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

            if (input.deploy_after_create) {
                const { messageId } = await provider.deployReactionRolePanel(input.guild_id, panel.id);
                return panelSchema.parse({ ...panel, messageId, deployedAt: new Date().toISOString() });
            }

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
            assertValidPanelId(input.panel_id, 'update_reaction_role_panel');
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
            assertValidPanelId(input.panel_id, 'delete_reaction_role_panel');
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
            assertValidPanelId(input.panel_id, 'deploy_reaction_role_panel');
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
            assertValidPanelId(input.panel_id, 'add_panel_button');
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
            assertValidPanelId(input.panel_id, 'remove_panel_button');
            const panel = await provider.removePanelButton(input.guild_id, input.panel_id, input.button_id);
            return panelSchema.parse(panel);
        },
    },
];
