/**
 * Shared Zod primitives for tool definitions.
 *
 * Reused across the tool registry and the per-category sub-PRs.
 */

import { z } from 'zod';

/** Discord snowflake ID: 17-20 digit numeric string */
export const snowflakeId = z
    .string()
    .regex(/^\d{17,20}$/, 'Must be a valid Discord snowflake ID (17-20 digits)');

/** Embed field schema */
export const embedFieldSchema = z.object({
    name: z.string().max(256, 'Embed field name must be at most 256 characters'),
    value: z.string().max(1024, 'Embed field value must be at most 1024 characters'),
    inline: z.boolean().optional(),
});

/** Rich embed object schema (limits per Discord API) */
export const embedSchema = z.object({
    title: z.string().max(256, 'Embed title must be at most 256 characters').optional(),
    description: z.string().max(4096, 'Embed description must be at most 4096 characters').optional(),
    url: z.string().optional(),
    color: z.number().optional(),
    fields: z.array(embedFieldSchema).max(25, 'Embeds may contain at most 25 fields').optional(),
    footer: z.object({ text: z.string().max(2048, 'Footer text must be at most 2048 characters'), iconUrl: z.string().optional() }).optional(),
    thumbnail: z.object({ url: z.string() }).optional(),
    image: z.object({ url: z.string() }).optional(),
    author: z
        .object({ name: z.string().max(256, 'Author name must be at most 256 characters'), url: z.string().optional(), iconUrl: z.string().optional() })
        .optional(),
    timestamp: z.string().optional(),
});

/** Discord color as decimal int (0x000000 to 0xFFFFFF). */
export const colorInt = z.number().int().min(0).max(0xffffff);

/** ISO 8601 timestamp string. */
export const timestampString = z.string().datetime({ offset: true });

/** Image URL with allowed extensions for icons/avatars/banners. */
export const imageUrl = z
    .string()
    .url()
    .regex(/\.(png|jpe?g|gif|webp)(\?.*)?$/i, 'Must be a PNG, JPEG, GIF, or WebP URL');

/**
 * Discord permission flag names. The Discord permission bitfield is a 64-bit
 * integer; tools accept the named flags and the provider serializes them.
 */
export const permissionFlag = z.enum([
    'CREATE_INSTANT_INVITE',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'ADMINISTRATOR',
    'MANAGE_CHANNELS',
    'MANAGE_GUILD',
    'ADD_REACTIONS',
    'VIEW_AUDIT_LOG',
    'PRIORITY_SPEAKER',
    'STREAM',
    'VIEW_CHANNEL',
    'SEND_MESSAGES',
    'SEND_TTS_MESSAGES',
    'MANAGE_MESSAGES',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'READ_MESSAGE_HISTORY',
    'MENTION_EVERYONE',
    'USE_EXTERNAL_EMOJIS',
    'VIEW_GUILD_INSIGHTS',
    'CONNECT',
    'SPEAK',
    'MUTE_MEMBERS',
    'DEAFEN_MEMBERS',
    'MOVE_MEMBERS',
    'USE_VAD',
    'CHANGE_NICKNAME',
    'MANAGE_NICKNAMES',
    'MANAGE_ROLES',
    'MANAGE_WEBHOOKS',
    'MANAGE_EMOJIS_AND_STICKERS',
    'MANAGE_GUILD_EXPRESSIONS',
    'USE_APPLICATION_COMMANDS',
    'REQUEST_TO_SPEAK',
    'MANAGE_EVENTS',
    'MANAGE_THREADS',
    'CREATE_PUBLIC_THREADS',
    'CREATE_PRIVATE_THREADS',
    'USE_EXTERNAL_STICKERS',
    'SEND_MESSAGES_IN_THREADS',
    'USE_EMBEDDED_ACTIVITIES',
    'MODERATE_MEMBERS',
    'VIEW_CREATOR_MONETIZATION_ANALYTICS',
    'USE_SOUNDBOARD',
    'CREATE_GUILD_EXPRESSIONS',
    'CREATE_EVENTS',
    'USE_EXTERNAL_SOUNDS',
    'SEND_VOICE_MESSAGES',
    'SEND_POLLS',
    'USE_EXTERNAL_APPS',
    'PIN_MESSAGES',
    'BYPASS_SLOWMODE',
]);

export const permissionFlags = z.array(permissionFlag);
