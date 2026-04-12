/**
 * Tool Registry — defines all MCP tools and routes them to the provider.
 *
 * Each tool is a plain object with:
 *   - name: snake_case identifier
 *   - description: what it does (shown to the LLM)
 *   - schema: Zod schema for input validation
 *   - handler: async function that receives validated input + provider
 *
 * Tools are grouped by category for readability but registered flat.
 */

import { z } from 'zod';
import type { DiscordProvider } from '../providers/discord-provider.js';
import { snowflakeId, embedSchema, permissionFlags } from './schemas.js';

// ─── Tool Definition Type ───────────────────────────────────────

export interface ToolDefinition {
    name: string;
    description: string;
    schema: z.ZodType<any>;
    handler: (input: any, provider: DiscordProvider) => Promise<any>;
}

// ═════════════════════════════════════════════════════════════════
// SERVER / GUILD TOOLS
// ═════════════════════════════════════════════════════════════════

const serverTools: ToolDefinition[] = [
    {
        name: 'list_servers',
        description: 'List all Discord servers (guilds) the bot has access to. Returns id, name, member count, and features for each server.',
        schema: z.object({}),
        handler: async (_input, provider) => provider.listGuilds(),
    },
    {
        name: 'get_server_info',
        description: 'Get detailed information about a specific Discord server including roles, channels, emojis, boost level, and member count.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => provider.getGuild(input.guild_id),
    },
];

// ═════════════════════════════════════════════════════════════════
// CHANNEL TOOLS
// ═════════════════════════════════════════════════════════════════

const channelTools: ToolDefinition[] = [
    {
        name: 'get_channels',
        description: 'List all channels in a Discord server. Returns text, voice, category, announcement, forum, and stage channels with their hierarchy.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => provider.getChannels(input.guild_id),
    },
    {
        name: 'get_channel',
        description: 'Get detailed information about a specific channel including topic, NSFW status, rate limit, and parent category.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel ID'),
        }),
        handler: async (input, provider) => provider.getChannel(input.channel_id),
    },
    {
        name: 'create_channel',
        description: 'Create a new channel in a Discord server. Supports text, voice, category, announcement, forum, and stage types.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server to create the channel in'),
            name: z.string().describe('Channel name (lowercase, hyphens for spaces)'),
            type: z.enum(['text', 'voice', 'category', 'announcement', 'forum', 'stage']).default('text').describe('Channel type'),
            topic: z.string().optional().describe('Channel topic/description'),
            parent_id: snowflakeId.optional().describe('Parent category ID'),
            nsfw: z.boolean().optional().describe('Whether the channel is NSFW'),
            rate_limit_per_user: z.number().optional().describe('Slowmode in seconds (0-21600)'),
        }),
        handler: async (input, provider) => provider.createChannel({
            guildId: input.guild_id,
            name: input.name,
            type: input.type,
            topic: input.topic,
            parentId: input.parent_id,
            nsfw: input.nsfw,
            rateLimitPerUser: input.rate_limit_per_user,
        }),
    },
    {
        name: 'edit_channel',
        description: 'Edit an existing channel. Can change name, topic, NSFW status, slowmode, position, and parent category.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel to edit'),
            name: z.string().optional().describe('New channel name'),
            topic: z.string().optional().describe('New channel topic'),
            nsfw: z.boolean().optional().describe('NSFW flag'),
            rate_limit_per_user: z.number().optional().describe('Slowmode in seconds'),
            position: z.number().optional().describe('New position'),
            parent_id: snowflakeId.nullable().optional().describe('New parent category ID (null to remove)'),
        }),
        handler: async (input, provider) => provider.editChannel({
            channelId: input.channel_id,
            name: input.name,
            topic: input.topic,
            nsfw: input.nsfw,
            rateLimitPerUser: input.rate_limit_per_user,
            position: input.position,
            parentId: input.parent_id,
        }),
    },
    {
        name: 'delete_channel',
        description: 'Permanently delete a channel. This cannot be undone.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel to delete'),
            reason: z.string().optional().describe('Reason for deletion (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.deleteChannel(input.channel_id, input.reason);
            return { success: true, channel_id: input.channel_id };
        },
    },
    {
        name: 'create_thread',
        description: 'Create a new thread in a channel. Can optionally be created from an existing message. Note: requires gateway mode when using standalone provider.',
        schema: z.object({
            channel_id: snowflakeId.describe('The parent channel ID'),
            name: z.string().describe('Thread name'),
            message_id: snowflakeId.optional().describe('Message ID to create thread from'),
            auto_archive_duration: z.enum(['60', '1440', '4320', '10080']).optional().describe('Auto-archive after minutes: 60 (1h), 1440 (1d), 4320 (3d), 10080 (7d)'),
            reason: z.string().optional(),
        }),
        handler: async (input, provider) => provider.createThread({
            channelId: input.channel_id,
            name: input.name,
            messageId: input.message_id,
            autoArchiveDuration: input.auto_archive_duration ? Number(input.auto_archive_duration) as any : undefined,
            reason: input.reason,
        }),
    },
    {
        name: 'archive_thread',
        description: 'Archive a thread. Archived threads are hidden but not deleted.',
        schema: z.object({
            thread_id: snowflakeId.describe('The thread ID to archive'),
        }),
        handler: async (input, provider) => {
            await provider.archiveThread(input.thread_id);
            return { success: true, thread_id: input.thread_id };
        },
    },
];

// ═════════════════════════════════════════════════════════════════
// MESSAGE TOOLS
// ═════════════════════════════════════════════════════════════════

const messageTools: ToolDefinition[] = [
    {
        name: 'send_message',
        description: 'Send a message to a Discord channel. Supports plain text, rich embeds, and replying to specific messages.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel to send the message to'),
            content: z.string().optional().describe('Text content of the message'),
            embeds: z.array(embedSchema).optional().describe('Rich embed objects'),
            reply_to: snowflakeId.optional().describe('Message ID to reply to'),
        }),
        handler: async (input, provider) => provider.sendMessage({
            channelId: input.channel_id,
            content: input.content,
            embeds: input.embeds,
            replyToMessageId: input.reply_to,
        }),
    },
    {
        name: 'read_messages',
        description: 'Read recent messages from a channel with pagination. Returns up to 100 messages per call.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel to read from'),
            limit: z.number().min(1).max(100).default(50).describe('Number of messages to fetch (1-100)'),
            before: snowflakeId.optional().describe('Get messages before this message ID (for pagination)'),
            after: snowflakeId.optional().describe('Get messages after this message ID'),
            around: snowflakeId.optional().describe('Get messages around this message ID'),
        }),
        handler: async (input, provider) => provider.readMessages({
            channelId: input.channel_id,
            limit: input.limit,
            before: input.before,
            after: input.after,
            around: input.around,
        }),
    },
    {
        name: 'search_messages',
        description: 'Search messages in a server by content, author, or channel. Useful for finding specific conversations or mentions.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server to search in'),
            query: z.string().optional().describe('Text to search for'),
            author_id: snowflakeId.optional().describe('Filter by author user ID'),
            channel_id: snowflakeId.optional().describe('Filter by channel ID'),
            limit: z.number().min(1).max(25).default(25).describe('Max results (1-25)'),
        }),
        handler: async (input, provider) => provider.searchMessages({
            guildId: input.guild_id,
            query: input.query,
            authorId: input.author_id,
            channelId: input.channel_id,
            limit: input.limit,
        }),
    },
    {
        name: 'edit_message',
        description: 'Edit a message sent by the bot. Can update text content and embeds.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel containing the message'),
            message_id: snowflakeId.describe('The message to edit'),
            content: z.string().describe('New text content'),
            embeds: z.array(embedSchema).optional().describe('New embeds'),
        }),
        handler: async (input, provider) => provider.editMessage(input.channel_id, input.message_id, input.content, input.embeds),
    },
    {
        name: 'delete_message',
        description: 'Delete a single message from a channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel containing the message'),
            message_id: snowflakeId.describe('The message to delete'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.deleteMessage(input.channel_id, input.message_id, input.reason);
            return { success: true };
        },
    },
    {
        name: 'delete_messages_bulk',
        description: 'Delete multiple messages at once (2-100). Messages must be less than 14 days old.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel containing the messages'),
            message_ids: z.array(snowflakeId).min(1).max(100).describe('Array of message IDs to delete'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            const count = await provider.deleteMessagesBulk(input.channel_id, input.message_ids, input.reason);
            return { success: true, deleted_count: count };
        },
    },
    {
        name: 'pin_message',
        description: 'Pin a message in a channel. Pinned messages are easily accessible at the top of the channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel'),
            message_id: snowflakeId.describe('The message to pin'),
        }),
        handler: async (input, provider) => {
            await provider.pinMessage(input.channel_id, input.message_id);
            return { success: true };
        },
    },
    {
        name: 'unpin_message',
        description: 'Unpin a message from a channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel'),
            message_id: snowflakeId.describe('The message to unpin'),
        }),
        handler: async (input, provider) => {
            await provider.unpinMessage(input.channel_id, input.message_id);
            return { success: true };
        },
    },
];

// ═════════════════════════════════════════════════════════════════
// REACTION TOOLS
// ═════════════════════════════════════════════════════════════════

const reactionTools: ToolDefinition[] = [
    {
        name: 'add_reaction',
        description: 'Add a reaction emoji to a message. Use Unicode emoji (e.g., "👍") or custom emoji format "<:name:id>".',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel containing the message'),
            message_id: snowflakeId.describe('The message to react to'),
            emoji: z.string().describe('Emoji to react with (Unicode or custom <:name:id>)'),
        }),
        handler: async (input, provider) => {
            await provider.addReaction(input.channel_id, input.message_id, input.emoji);
            return { success: true };
        },
    },
    {
        name: 'remove_reaction',
        description: 'Remove a reaction from a message. By default removes the bot\'s own reaction.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel containing the message'),
            message_id: snowflakeId.describe('The message'),
            emoji: z.string().describe('Emoji to remove'),
            user_id: snowflakeId.optional().describe('User whose reaction to remove (default: bot)'),
        }),
        handler: async (input, provider) => {
            await provider.removeReaction(input.channel_id, input.message_id, input.emoji, input.user_id);
            return { success: true };
        },
    },
];

// ═════════════════════════════════════════════════════════════════
// MEMBER / USER TOOLS
// ═════════════════════════════════════════════════════════════════

const memberTools: ToolDefinition[] = [
    {
        name: 'list_members',
        description: 'List members in a server with pagination. Returns username, nickname, roles, join date, and status.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            limit: z.number().min(1).max(1000).default(100).describe('Max members to fetch'),
            after: snowflakeId.optional().describe('Fetch members after this user ID (pagination)'),
        }),
        handler: async (input, provider) => provider.listMembers(input.guild_id, input.limit, input.after),
    },
    {
        name: 'get_member',
        description: 'Get detailed information about a specific member in a server, including roles, nickname, and join date.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user ID'),
        }),
        handler: async (input, provider) => provider.getMember(input.guild_id, input.user_id),
    },
    {
        name: 'get_user',
        description: 'Get information about any Discord user by ID. Works for users not in the current server.',
        schema: z.object({
            user_id: snowflakeId.describe('The user ID'),
        }),
        handler: async (input, provider) => provider.getUser(input.user_id),
    },
    {
        name: 'search_members',
        description: 'Search for members in a server by username or nickname.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            query: z.string().describe('Search query (matches username and nickname)'),
            limit: z.number().min(1).max(100).default(20).describe('Max results'),
        }),
        handler: async (input, provider) => provider.searchMembers(input.guild_id, input.query, input.limit),
    },
    {
        name: 'set_nickname',
        description: 'Set or clear a member\'s nickname. Pass an empty string to clear.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user whose nickname to set'),
            nickname: z.string().describe('New nickname (empty string to clear)'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.setNickname(input.guild_id, input.user_id, input.nickname, input.reason);
            return { success: true };
        },
    },
    {
        name: 'bulk_ban',
        description: 'Ban multiple users at once. Accepts up to 200 user IDs.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_ids: z.array(snowflakeId).min(1).max(200).describe('Array of user IDs to ban'),
            reason: z.string().optional().describe('Reason for the bans'),
            delete_message_seconds: z.number().min(0).max(604800).optional().describe('Delete messages from the last N seconds (0-604800)'),
        }),
        handler: async (input, provider) => {
            const result = await provider.bulkBan(input.guild_id, input.user_ids, input.reason, input.delete_message_seconds);
            return { success: true, banned_count: result.bannedCount, failed: result.failed };
        },
    },
    {
        name: 'list_bans',
        description: 'List banned users in a server with pagination.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            limit: z.number().min(1).max(1000).default(100).describe('Max bans to fetch'),
            after: snowflakeId.optional().describe('Fetch bans after this user ID (pagination)'),
        }),
        handler: async (input, provider) => provider.listBans(input.guild_id, input.limit, input.after),
    },
    {
        name: 'prune_members',
        description: 'Remove inactive members who have not logged in within the specified number of days. Use dry_run to preview without removing.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            days: z.number().min(1).max(30).describe('Number of days of inactivity (1-30)'),
            include_roles: z.array(snowflakeId).optional().describe('Role IDs to include in the prune (normally only members without roles are pruned)'),
            dry_run: z.boolean().optional().default(false).describe('If true, returns the count without actually pruning'),
        }),
        handler: async (input, provider) => {
            const result = await provider.pruneMembers(input.guild_id, input.days, input.include_roles, input.dry_run);
            return { pruned_count: result.prunedCount, dry_run: result.dryRun };
        },
    },
    {
        name: 'get_member_info',
        description: 'Get extended member information including voice state, premium (boost) since date, and pending membership screening status.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user ID'),
        }),
        handler: async (input, provider) => provider.getMemberInfo(input.guild_id, input.user_id),
    },
];

// ═════════════════════════════════════════════════════════════════
// ROLE TOOLS
// ═════════════════════════════════════════════════════════════════

const roleTools: ToolDefinition[] = [
    {
        name: 'list_roles',
        description: 'List all roles in a server with permissions, colors, and member counts.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
        }),
        handler: async (input, provider) => provider.listRoles(input.guild_id),
    },
    {
        name: 'create_role',
        description: 'Create a new role in a server.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            name: z.string().describe('Role name'),
            color: z.number().optional().describe('Role color as decimal (e.g., 0xFF0000 for red)'),
            mentionable: z.boolean().optional().describe('Whether the role can be mentioned'),
            hoist: z.boolean().optional().describe('Whether the role is displayed separately in the member list'),
        }),
        handler: async (input, provider) => provider.createRole({
            guildId: input.guild_id,
            name: input.name,
            color: input.color,
            mentionable: input.mentionable,
            hoist: input.hoist,
        }),
    },
    {
        name: 'add_role',
        description: 'Add a role to a server member.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user to add the role to'),
            role_id: snowflakeId.describe('The role to add'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.addRole(input.guild_id, input.user_id, input.role_id, input.reason);
            return { success: true };
        },
    },
    {
        name: 'remove_role',
        description: 'Remove a role from a server member.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user to remove the role from'),
            role_id: snowflakeId.describe('The role to remove'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.removeRole(input.guild_id, input.user_id, input.role_id, input.reason);
            return { success: true };
        },
    },
    {
        name: 'edit_role',
        description: 'Edit a role\'s properties such as name, color, permissions, hoist, and mentionable.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            role_id: snowflakeId.describe('The role to edit'),
            name: z.string().optional().describe('New role name'),
            color: z.number().optional().describe('New role color as decimal'),
            permissions: permissionFlags.optional().describe('Permission flag names to set'),
            hoist: z.boolean().optional().describe('Whether the role is displayed separately'),
            mentionable: z.boolean().optional().describe('Whether the role can be mentioned'),
        }),
        handler: async (input, provider) => provider.editRole({
            guildId: input.guild_id,
            roleId: input.role_id,
            name: input.name,
            color: input.color,
            permissions: input.permissions,
            hoist: input.hoist,
            mentionable: input.mentionable,
        }),
    },
    {
        name: 'delete_role',
        description: 'Permanently delete a role from a server.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            role_id: snowflakeId.describe('The role to delete'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.deleteRole(input.guild_id, input.role_id, input.reason);
            return { success: true, role_id: input.role_id };
        },
    },
    {
        name: 'get_role_members',
        description: 'List all members who have a specific role.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            role_id: snowflakeId.describe('The role ID'),
        }),
        handler: async (input, provider) => provider.getRoleMembers(input.guild_id, input.role_id),
    },
    {
        name: 'set_role_position',
        description: 'Change a role\'s position in the role hierarchy.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            role_id: snowflakeId.describe('The role to reposition'),
            position: z.number().min(0).describe('New position (0 = bottom)'),
        }),
        handler: async (input, provider) => {
            await provider.setRolePosition(input.guild_id, input.role_id, input.position);
            return { success: true };
        },
    },
    {
        name: 'set_role_icon',
        description: 'Set a role\'s icon to an image URL or a Unicode emoji. Requires the server to have the ROLE_ICONS feature (boost level 2+).',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            role_id: snowflakeId.describe('The role to set the icon for'),
            icon: z.string().describe('Image URL or Unicode emoji'),
        }),
        handler: async (input, provider) => {
            await provider.setRoleIcon(input.guild_id, input.role_id, input.icon);
            return { success: true };
        },
    },
];

// ═════════════════════════════════════════════════════════════════
// MODERATION TOOLS
// ═════════════════════════════════════════════════════════════════

const moderationTools: ToolDefinition[] = [
    {
        name: 'timeout_user',
        description: 'Temporarily mute a user (communication disabled). They cannot send messages, react, or join voice channels for the duration.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user to timeout'),
            duration_minutes: z.number().min(1).max(40320).describe('Timeout duration in minutes (max 28 days = 40320)'),
            reason: z.string().optional().describe('Reason for the timeout'),
        }),
        handler: async (input, provider) => {
            await provider.timeoutUser({
                guildId: input.guild_id,
                userId: input.user_id,
                durationMs: input.duration_minutes * 60 * 1000,
                reason: input.reason,
            });
            return { success: true, expires_at: new Date(Date.now() + input.duration_minutes * 60_000).toISOString() };
        },
    },
    {
        name: 'kick_user',
        description: 'Kick a user from the server. They can rejoin with a new invite.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user to kick'),
            reason: z.string().optional().describe('Reason for the kick'),
        }),
        handler: async (input, provider) => {
            await provider.kickUser({ guildId: input.guild_id, userId: input.user_id, reason: input.reason });
            return { success: true };
        },
    },
    {
        name: 'ban_user',
        description: 'Ban a user from the server. They cannot rejoin until unbanned. Optionally deletes their recent messages.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user to ban'),
            reason: z.string().optional().describe('Reason for the ban'),
            delete_message_days: z.number().min(0).max(7).optional().describe('Delete messages from the last N days (0-7)'),
        }),
        handler: async (input, provider) => {
            await provider.banUser({
                guildId: input.guild_id,
                userId: input.user_id,
                reason: input.reason,
                deleteMessageSeconds: input.delete_message_days !== undefined ? input.delete_message_days * 86400 : undefined,
            });
            return { success: true };
        },
    },
    {
        name: 'unban_user',
        description: 'Unban a previously banned user, allowing them to rejoin the server.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            user_id: snowflakeId.describe('The user to unban'),
            reason: z.string().optional().describe('Reason for the unban'),
        }),
        handler: async (input, provider) => {
            await provider.unbanUser(input.guild_id, input.user_id, input.reason);
            return { success: true };
        },
    },
];

// ═════════════════════════════════════════════════════════════════
// MONITORING TOOLS
// ═════════════════════════════════════════════════════════════════

const monitoringTools: ToolDefinition[] = [
    {
        name: 'get_audit_log',
        description: 'Get the server audit log. Shows who did what — bans, kicks, channel changes, role updates, message deletes, and more.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server ID'),
            limit: z.number().min(1).max(100).default(50).describe('Number of entries to fetch'),
        }),
        handler: async (input, provider) => provider.getAuditLog(input.guild_id, input.limit),
    },
    {
        name: 'check_mentions',
        description: 'Find recent messages that @mention the bot or a specific user in a server.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server to search in'),
            user_id: snowflakeId.optional().describe('User ID to check mentions for (default: bot)'),
            limit: z.number().min(1).max(25).default(25).describe('Max results'),
        }),
        handler: async (input, provider) => provider.checkMentions(input.guild_id, input.user_id, input.limit),
    },
];

// ═════════════════════════════════════════════════════════════════
// PERMISSION TOOLS
// ═════════════════════════════════════════════════════════════════

const permissionTools: ToolDefinition[] = [
    {
        name: 'get_channel_permissions',
        description: 'List all permission overwrites on a channel. Returns role and member overwrites with their allowed and denied permission names.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel ID'),
        }),
        handler: async (input, provider) => provider.getChannelPermissions(input.channel_id),
    },
    {
        name: 'set_role_permission',
        description: 'Allow or deny specific permissions for a role on a channel. Overwrites any existing role overwrite on that channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel ID'),
            role_id: snowflakeId.describe('The role to grant or deny permissions for'),
            allow: permissionFlags.default([]).describe('Permission names to explicitly allow'),
            deny: permissionFlags.default([]).describe('Permission names to explicitly deny'),
        }),
        handler: async (input, provider) => {
            await provider.setRolePermission(input.channel_id, input.role_id, input.allow, input.deny);
            return { success: true, channel_id: input.channel_id, role_id: input.role_id };
        },
    },
    {
        name: 'set_member_permission',
        description: 'Allow or deny specific permissions for a single member on a channel. Overwrites any existing member overwrite on that channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel ID'),
            user_id: snowflakeId.describe('The member to grant or deny permissions for'),
            allow: permissionFlags.default([]).describe('Permission names to explicitly allow'),
            deny: permissionFlags.default([]).describe('Permission names to explicitly deny'),
        }),
        handler: async (input, provider) => {
            await provider.setMemberPermission(input.channel_id, input.user_id, input.allow, input.deny);
            return { success: true, channel_id: input.channel_id, user_id: input.user_id };
        },
    },
    {
        name: 'reset_channel_permissions',
        description: 'Remove every permission overwrite from a channel so it inherits from its parent category.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel ID'),
        }),
        handler: async (input, provider) => {
            await provider.resetChannelPermissions(input.channel_id);
            return { success: true, channel_id: input.channel_id };
        },
    },
    {
        name: 'copy_permissions',
        description: 'Copy all permission overwrites from a source channel to a target channel.',
        schema: z.object({
            source_channel_id: snowflakeId.describe('The channel to copy overwrites from'),
            target_channel_id: snowflakeId.describe('The channel to copy overwrites to'),
        }),
        handler: async (input, provider) => {
            await provider.copyPermissions(input.source_channel_id, input.target_channel_id);
            return { success: true, source_channel_id: input.source_channel_id, target_channel_id: input.target_channel_id };
        },
    },
    {
        name: 'audit_permissions',
        description: 'Return the permission overwrites for every channel in a server. Useful for auditing who has access to what.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
        }),
        handler: async (input, provider) => provider.auditPermissions(input.guild_id),
    },
];

// ═════════════════════════════════════════════════════════════════
// WEBHOOK TOOLS — populated by PR 2 (feat/webhooks)
// ═════════════════════════════════════════════════════════════════

const webhookTools: ToolDefinition[] = [
    {
        name: 'create_webhook',
        description: 'Create a webhook on a channel. Returns the new webhook with its token and URL.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel to create the webhook on'),
            name: z.string().min(1).max(80).describe('Webhook name (1-80 characters)'),
            avatar: z.string().optional().describe('Avatar image (data URI or URL)'),
        }),
        handler: async (input, provider) => provider.createWebhook({
            channelId: input.channel_id,
            name: input.name,
            avatar: input.avatar,
        }),
    },
    {
        name: 'list_webhooks',
        description: 'List webhooks for a channel or guild.',
        schema: z.object({
            scope: z.enum(['channel', 'guild']).describe('Whether to list webhooks for a channel or an entire guild'),
            id: snowflakeId.describe('The channel or guild ID (depending on scope)'),
        }),
        handler: async (input, provider) => provider.listWebhooks(input.scope, input.id),
    },
    {
        name: 'edit_webhook',
        description: 'Edit a webhook. Can change its name, avatar, or move it to a different channel.',
        schema: z.object({
            webhook_id: snowflakeId.describe('The webhook to edit'),
            name: z.string().min(1).max(80).optional().describe('New webhook name'),
            avatar: z.string().optional().describe('New avatar image'),
            channel_id: snowflakeId.optional().describe('Move webhook to this channel'),
        }),
        handler: async (input, provider) => provider.editWebhook({
            webhookId: input.webhook_id,
            name: input.name,
            avatar: input.avatar,
            channelId: input.channel_id,
        }),
    },
    {
        name: 'delete_webhook',
        description: 'Delete a webhook permanently.',
        schema: z.object({
            webhook_id: snowflakeId.describe('The webhook to delete'),
            reason: z.string().optional().describe('Reason for deletion (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.deleteWebhook(input.webhook_id, input.reason);
            return { success: true, webhook_id: input.webhook_id };
        },
    },
    {
        name: 'send_webhook_message',
        description: 'Send a message via a webhook. Supports text content, rich embeds, and overriding the display name and avatar.',
        schema: z.object({
            webhook_id: snowflakeId.describe('The webhook ID'),
            webhook_token: z.string().describe('The webhook token'),
            content: z.string().optional().describe('Text content'),
            embeds: z.array(embedSchema).optional().describe('Rich embed objects'),
            username: z.string().optional().describe('Override the webhook display name'),
            avatar_url: z.string().optional().describe('Override the webhook avatar URL'),
        }),
        handler: async (input, provider) => provider.sendWebhookMessage({
            webhookId: input.webhook_id,
            webhookToken: input.webhook_token,
            content: input.content,
            embeds: input.embeds,
            username: input.username,
            avatarUrl: input.avatar_url,
        }),
    },
    {
        name: 'edit_webhook_message',
        description: 'Edit a message previously sent by a webhook.',
        schema: z.object({
            webhook_id: snowflakeId.describe('The webhook ID'),
            webhook_token: z.string().describe('The webhook token'),
            message_id: snowflakeId.describe('The message to edit'),
            content: z.string().optional().describe('New text content'),
            embeds: z.array(embedSchema).optional().describe('New embeds'),
        }),
        handler: async (input, provider) => provider.editWebhookMessage({
            webhookId: input.webhook_id,
            webhookToken: input.webhook_token,
            messageId: input.message_id,
            content: input.content,
            embeds: input.embeds,
        }),
    },
    {
        name: 'delete_webhook_message',
        description: 'Delete a message sent by a webhook.',
        schema: z.object({
            webhook_id: snowflakeId.describe('The webhook ID'),
            webhook_token: z.string().describe('The webhook token'),
            message_id: snowflakeId.describe('The message to delete'),
        }),
        handler: async (input, provider) => {
            await provider.deleteWebhookMessage(input.webhook_id, input.webhook_token, input.message_id);
            return { success: true };
        },
    },
    {
        name: 'fetch_webhook_message',
        description: 'Fetch a specific message sent by a webhook.',
        schema: z.object({
            webhook_id: snowflakeId.describe('The webhook ID'),
            webhook_token: z.string().describe('The webhook token'),
            message_id: snowflakeId.describe('The message to fetch'),
        }),
        handler: async (input, provider) => provider.fetchWebhookMessage(input.webhook_id, input.webhook_token, input.message_id),
    },
];

// ═════════════════════════════════════════════════════════════════
// FORUM TOOLS — populated by PR 3 (feat/forums)
// ═════════════════════════════════════════════════════════════════

const forumTools: ToolDefinition[] = [
    {
        name: 'get_forum_channels',
        description: 'List all forum channels in a server. Returns only channels of type "forum".',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
        }),
        handler: async (input, provider) => provider.getForumChannels(input.guild_id),
    },
    {
        name: 'create_forum_post',
        description: 'Create a new post (thread) in a forum channel with a starter message. Optionally apply forum tags and set an auto-archive duration.',
        schema: z.object({
            channel_id: snowflakeId.describe('The forum channel ID'),
            name: z.string().describe('Post title'),
            content: z.string().describe('Starter message content'),
            tag_ids: z.array(snowflakeId).optional().describe('Forum tag IDs to apply'),
            auto_archive_duration: z.enum(['60', '1440', '4320', '10080']).optional().describe('Auto-archive after minutes: 60 (1h), 1440 (1d), 4320 (3d), 10080 (7d)'),
        }),
        handler: async (input, provider) => provider.createForumPost({
            channelId: input.channel_id,
            name: input.name,
            content: input.content,
            tagIds: input.tag_ids,
            autoArchiveDuration: input.auto_archive_duration ? Number(input.auto_archive_duration) as any : undefined,
        }),
    },
    {
        name: 'get_forum_post',
        description: 'Fetch a forum post (thread) by its id, including applied tags, archive state, and message count.',
        schema: z.object({
            post_id: snowflakeId.describe('The forum post (thread) ID'),
        }),
        handler: async (input, provider) => provider.getForumPost(input.post_id),
    },
    {
        name: 'list_forum_threads',
        description: 'List active or archived threads (posts) in a forum channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The forum channel ID'),
            archived: z.boolean().optional().describe('If true, return archived threads; otherwise active'),
            limit: z.number().min(1).max(100).optional().describe('Max threads to return'),
        }),
        handler: async (input, provider) => provider.listForumThreads(input.channel_id, input.archived, input.limit),
    },
    {
        name: 'delete_forum_post',
        description: 'Delete a forum post (thread). This cannot be undone.',
        schema: z.object({
            post_id: snowflakeId.describe('The forum post (thread) ID'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.deleteForumPost(input.post_id, input.reason);
            return { success: true, post_id: input.post_id };
        },
    },
    {
        name: 'get_forum_tags',
        description: 'Get the list of available tags configured on a forum channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The forum channel ID'),
        }),
        handler: async (input, provider) => provider.getForumTags(input.channel_id),
    },
    {
        name: 'set_forum_tags',
        description: 'Replace the list of available tags on a forum channel. Tags not included are removed.',
        schema: z.object({
            channel_id: snowflakeId.describe('The forum channel ID'),
            tags: z.array(z.object({
                name: z.string().describe('Tag name'),
                emoji: z.object({
                    id: snowflakeId.nullable().optional().describe('Custom emoji ID'),
                    name: z.string().nullable().optional().describe('Unicode emoji'),
                }).optional().describe('Emoji associated with the tag'),
                moderated: z.boolean().optional().describe('Whether applying this tag requires Manage Threads'),
            })).describe('The full set of tags to configure'),
        }),
        handler: async (input, provider) => provider.setForumTags(input.channel_id, input.tags),
    },
    {
        name: 'update_forum_post',
        description: 'Update a forum post: rename, archive/unarchive, lock/unlock, or change applied tags.',
        schema: z.object({
            post_id: snowflakeId.describe('The forum post (thread) ID'),
            name: z.string().optional().describe('New post title'),
            archived: z.boolean().optional().describe('Archive state'),
            locked: z.boolean().optional().describe('Lock state'),
            applied_tag_ids: z.array(snowflakeId).optional().describe('New set of applied tag IDs'),
        }),
        handler: async (input, provider) => provider.updateForumPost({
            postId: input.post_id,
            name: input.name,
            archived: input.archived,
            locked: input.locked,
            appliedTagIds: input.applied_tag_ids,
        }),
    },
    {
        name: 'reply_to_forum',
        description: 'Send a reply message to an existing forum post (thread). Supports text content and rich embeds.',
        schema: z.object({
            post_id: snowflakeId.describe('The forum post (thread) ID'),
            content: z.string().optional().describe('Text content of the reply'),
            embeds: z.array(embedSchema).optional().describe('Rich embed objects'),
        }),
        handler: async (input, provider) => provider.replyToForum({
            postId: input.post_id,
            content: input.content,
            embeds: input.embeds,
        }),
    },
];

// ═════════════════════════════════════════════════════════════════
// INVITE TOOLS
// ═════════════════════════════════════════════════════════════════

const inviteTools: ToolDefinition[] = [
    {
        name: 'list_invites',
        description: 'List all active invites in a server. Returns invite code, URL, channel, inviter, uses, and expiry info.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
        }),
        handler: async (input, provider) => provider.listInvites(input.guild_id),
    },
    {
        name: 'list_channel_invites',
        description: 'List active invites for a specific channel.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel ID'),
        }),
        handler: async (input, provider) => provider.listChannelInvites(input.channel_id),
    },
    {
        name: 'get_invite',
        description: 'Get details about an invite by its code, including approximate member and presence counts when available.',
        schema: z.object({
            code: z.string().describe('The invite code (the part after discord.gg/)'),
        }),
        handler: async (input, provider) => provider.getInvite(input.code),
    },
    {
        name: 'create_invite',
        description: 'Create a new invite for a channel. Supports max uses, max age (seconds), temporary membership, and uniqueness.',
        schema: z.object({
            channel_id: snowflakeId.describe('The channel to create the invite for'),
            max_uses: z.number().min(0).max(100).optional().describe('Maximum number of uses (0 = unlimited)'),
            max_age: z.number().min(0).optional().describe('Duration in seconds before expiry (0 = never)'),
            temporary: z.boolean().optional().describe('Whether the invite grants temporary membership'),
            unique: z.boolean().optional().describe('If true, always create a new invite even if one with identical settings exists'),
        }),
        handler: async (input, provider) => provider.createInvite({
            channelId: input.channel_id,
            maxUses: input.max_uses,
            maxAge: input.max_age,
            temporary: input.temporary,
            unique: input.unique,
        }),
    },
    {
        name: 'delete_invite',
        description: 'Revoke an invite by its code.',
        schema: z.object({
            code: z.string().describe('The invite code to revoke'),
            reason: z.string().optional().describe('Reason (audit log)'),
        }),
        handler: async (input, provider) => {
            await provider.deleteInvite(input.code, input.reason);
            return { success: true, code: input.code };
        },
    },
];

// ═════════════════════════════════════════════════════════════════
// DM TOOLS
// ═════════════════════════════════════════════════════════════════

const dmTools: ToolDefinition[] = [
    {
        name: 'send_dm',
        description: 'Send a direct message to a user. Works for users who share a server with the bot and have DMs enabled. Supports plain text and rich embeds.',
        schema: z.object({
            user_id: snowflakeId.describe('The user to DM'),
            content: z.string().optional().describe('Text content of the message'),
            embeds: z.array(embedSchema).optional().describe('Rich embed objects'),
        }),
        handler: async (input, provider) => provider.sendDM({
            userId: input.user_id,
            content: input.content,
            embeds: input.embeds,
        }),
    },
];

// ═════════════════════════════════════════════════════════════════
// SCHEDULED EVENT TOOLS
// ═════════════════════════════════════════════════════════════════

const entityTypeMap = { voice: 'VOICE', stage: 'STAGE_INSTANCE', external: 'EXTERNAL' } as const;

const createScheduledEventSchema = z
    .object({
        guild_id: snowflakeId.describe('The server (guild) ID'),
        name: z.string().describe('Event name'),
        entity_type: z.enum(['voice', 'stage', 'external']).describe('Event hosting type'),
        scheduled_start_time: z.string().describe('ISO 8601 start timestamp'),
        scheduled_end_time: z.string().optional().describe('ISO 8601 end timestamp (required for external)'),
        description: z.string().optional().describe('Event description'),
        channel_id: snowflakeId.optional().describe('Voice/stage channel ID (required for voice/stage)'),
        location: z.string().optional().describe('Physical or URL location (required for external)'),
        privacy_level: z.literal('GUILD_ONLY').default('GUILD_ONLY').describe('Privacy level'),
    })
    .superRefine((data, ctx) => {
        if (data.entity_type === 'external') {
            if (!data.location) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'location is required when entity_type is external',
                    path: ['location'],
                });
            }
            if (!data.scheduled_end_time) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'scheduled_end_time is required when entity_type is external',
                    path: ['scheduled_end_time'],
                });
            }
        } else if (!data.channel_id) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `channel_id is required when entity_type is ${data.entity_type}`,
                path: ['channel_id'],
            });
        }
    });

const scheduledEventTools: ToolDefinition[] = [
    {
        name: 'list_scheduled_events',
        description: 'List all scheduled events in a server. Returns voice, stage, and external events with their start times, status, and subscriber counts.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
        }),
        handler: async (input, provider) => provider.listScheduledEvents(input.guild_id),
    },
    {
        name: 'get_scheduled_event',
        description: 'Get detailed information about a specific scheduled event including its status, location, and subscriber count.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
            event_id: snowflakeId.describe('The scheduled event ID'),
        }),
        handler: async (input, provider) => provider.getScheduledEvent(input.guild_id, input.event_id),
    },
    {
        name: 'create_scheduled_event',
        description: 'Create a voice, stage, or external scheduled event in a server. Voice and stage events require a channel_id; external events require location and scheduled_end_time.',
        schema: createScheduledEventSchema,
        handler: async (input, provider) => provider.createScheduledEvent({
            guildId: input.guild_id,
            name: input.name,
            entityType: entityTypeMap[input.entity_type as 'voice' | 'stage' | 'external'],
            scheduledStartTime: input.scheduled_start_time,
            scheduledEndTime: input.scheduled_end_time,
            description: input.description,
            channelId: input.channel_id,
            location: input.location,
            privacyLevel: input.privacy_level,
        }),
    },
    {
        name: 'edit_scheduled_event',
        description: 'Edit an existing scheduled event. All fields are optional — only provided fields are updated.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
            event_id: snowflakeId.describe('The scheduled event ID'),
            name: z.string().optional().describe('New event name'),
            entity_type: z.enum(['voice', 'stage', 'external']).optional().describe('New hosting type'),
            scheduled_start_time: z.string().optional().describe('New ISO 8601 start timestamp'),
            scheduled_end_time: z.string().optional().describe('New ISO 8601 end timestamp'),
            description: z.string().optional().describe('New description'),
            channel_id: snowflakeId.optional().describe('New voice/stage channel ID'),
            location: z.string().optional().describe('New location for external events'),
            privacy_level: z.literal('GUILD_ONLY').optional().describe('Privacy level'),
        }),
        handler: async (input, provider) => provider.editScheduledEvent({
            guildId: input.guild_id,
            eventId: input.event_id,
            name: input.name,
            entityType: input.entity_type ? entityTypeMap[input.entity_type as 'voice' | 'stage' | 'external'] : undefined,
            scheduledStartTime: input.scheduled_start_time,
            scheduledEndTime: input.scheduled_end_time,
            description: input.description,
            channelId: input.channel_id,
            location: input.location,
            privacyLevel: input.privacy_level,
        }),
    },
    {
        name: 'delete_scheduled_event',
        description: 'Delete a scheduled event. This cannot be undone.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
            event_id: snowflakeId.describe('The scheduled event ID'),
        }),
        handler: async (input, provider) => {
            await provider.deleteScheduledEvent(input.guild_id, input.event_id);
            return { success: true, event_id: input.event_id };
        },
    },
    {
        name: 'get_event_subscribers',
        description: 'Get users who marked themselves as "Interested" in a scheduled event.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
            event_id: snowflakeId.describe('The scheduled event ID'),
            limit: z.number().min(1).max(100).optional().describe('Max subscribers to fetch (1-100)'),
        }),
        handler: async (input, provider) => provider.getEventSubscribers(input.guild_id, input.event_id, input.limit),
    },
    {
        name: 'create_event_invite',
        description: 'Create an invite link associated with a scheduled event. The URL includes ?event=<id> so recipients see event details on Discord.',
        schema: z.object({
            guild_id: snowflakeId.describe('The server (guild) ID'),
            event_id: snowflakeId.describe('The scheduled event ID'),
            channel_id: snowflakeId.describe('The channel to anchor the invite to'),
        }),
        handler: async (input, provider) => provider.createEventInvite(input.guild_id, input.event_id, input.channel_id),
    },
];

// ═════════════════════════════════════════════════════════════════
// SCREENING TOOLS — populated by PR 6b (feat/screening)
// ═════════════════════════════════════════════════════════════════

const welcomeChannelSchema = z.object({
    channel_id: snowflakeId.describe('The channel shown in the welcome screen'),
    description: z.string().describe('Short description displayed next to the channel'),
    emoji_name: z.string().nullable().optional().describe('Unicode emoji or custom emoji name'),
    emoji_id: snowflakeId.nullable().optional().describe('Custom emoji ID, if applicable'),
});

const screeningTools: ToolDefinition[] = [
    {
        name: 'get_membership_screening',
        description: 'Get the welcome screen / membership screening form for a Community server. Returns the description and featured welcome channels shown to new members.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
        }),
        handler: async (input, provider) => provider.getWelcomeScreen(input.guild_id),
    },
    {
        name: 'update_membership_screening',
        description: 'Update the welcome screen for new members. Can enable/disable the screen, change the description, and set up to 5 featured welcome channels. All fields are optional; only provided fields are modified.',
        schema: z.object({
            guild_id: snowflakeId.describe('The Discord server (guild) ID'),
            enabled: z.boolean().optional().describe('Whether the welcome screen is enabled'),
            description: z.string().optional().describe('Server description shown in the welcome screen (up to 140 chars)'),
            welcome_channels: z.array(welcomeChannelSchema).max(5).optional().describe('Up to 5 featured channels shown to new members'),
        }),
        handler: async (input, provider) => provider.updateWelcomeScreen({
            guildId: input.guild_id,
            enabled: input.enabled,
            description: input.description,
            welcomeChannels: input.welcome_channels?.map((wc: any) => ({
                channelId: wc.channel_id,
                description: wc.description,
                emojiName: wc.emoji_name ?? null,
                emojiId: wc.emoji_id ?? null,
            })),
        }),
    },
];

// ═════════════════════════════════════════════════════════════════
// ALL TOOLS — flat registry
// ═════════════════════════════════════════════════════════════════

export const allTools: ToolDefinition[] = [
    ...serverTools,
    ...channelTools,
    ...messageTools,
    ...reactionTools,
    ...memberTools,
    ...roleTools,
    ...moderationTools,
    ...monitoringTools,
    ...permissionTools,
    ...webhookTools,
    ...forumTools,
    ...inviteTools,
    ...dmTools,
    ...scheduledEventTools,
    ...screeningTools,
];

export const toolsByName = new Map<string, ToolDefinition>(
    allTools.map(t => [t.name, t])
);
