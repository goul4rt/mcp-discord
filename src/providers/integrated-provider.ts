/**
 * IntegratedProvider — reuses an existing discord.js Client.
 *
 * Use this when the MCP server runs as a module/plugin inside an
 * existing bot process. The host bot passes its Client instance,
 * and this provider wraps it with the DiscordProvider interface.
 *
 * Benefits:
 *   - Zero overhead (no extra WebSocket connection)
 *   - Shared cache (guilds, channels, members already fetched)
 *   - Real-time events available through the existing gateway
 *
 * Usage from the host bot:
 *
 *   import { IntegratedProvider, createMcpServer } from '@delfus/discord-mcp-server';
 *
 *   const provider = new IntegratedProvider({ client: myBotClient });
 *   await provider.connect(); // just validates the client is ready
 *   const server = createMcpServer(provider);
 *   // then expose `server` via stdio or HTTP
 */

import type { Client, FetchMessagesOptions, ForumChannel, GuildBasedChannel, GuildChannel, GuildMember, TextChannel, Role, ThreadChannel, User } from 'discord.js';
import { ChannelType as DjsChannelType, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel, OverwriteType as DjsOverwriteType, Routes } from 'discord.js';

import type { DiscordProvider, IntegratedProviderConfig } from './discord-provider.js';
import type { EditRoleOptions } from './capabilities/roles.js';
import { assertTextChannel, assertGuildChannel, assertThreadChannel } from '../utils/guards.js';
import { ProviderDefaults } from './base-provider.js';
import type {
    AuditLogEntry,
    Ban,
    BanOptions,
    ChannelPermissionsAudit,
    CreateChannelOptions,
    CreateForumPostOptions,
    CreateInviteOptions,
    CreateRoleOptions,
    CreateThreadOptions,
    DiscordChannel,
    DiscordChannelSummary,
    DiscordEmbed,
    DiscordGuild,
    DiscordGuildDetailed,
    DiscordMember,
    DiscordMessage,
    DiscordRole,
    DiscordUser,
    EditChannelOptions,
    ForumPost,
    ForumTag,
    ForumTagInput,
    Invite,
    KickOptions,
    PaginatedResult,
    PermissionOverwrite,
    ReadMessagesOptions,
    ReplyToForumOptions,
    ScheduledEvent,
    SearchMessagesOptions,
    SendMessageOptions,
    TimeoutOptions,
    UpdateForumPostOptions,
    UpdateWelcomeScreenOptions,
    WelcomeScreen,
} from '../types/discord.js';
import type { SendDMOptions } from './capabilities/dms.js';
import type {
    CreateScheduledEventOptions,
    EditScheduledEventOptions,
    ScheduledEventInvite,
} from './capabilities/scheduledEvents.js';
import {
    mapApiWelcomeScreen,
    mapBan,
    mapChannel,
    mapChannelSummary,
    mapForumPost,
    mapForumTag,
    mapGuild,
    mapGuildDetailed,
    mapInvite,
    mapMember,
    mapMessage,
    mapPermissionOverwrite,
    mapRole,
    mapScheduledEvent,
    mapUser,
    mapWelcomeScreen,
    permissionNamesToBitfield,
} from '../utils/mappers.js';

export class IntegratedProvider implements DiscordProvider {
    readonly name = 'integrated';

    private client: Client;

    constructor(config: IntegratedProviderConfig) {
        this.client = config.client as Client;
    }

    async connect(): Promise<void> {
        if (!this.client.isReady()) {
            // Wait for the client to become ready (max 30s)
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Client did not become ready in 30s')), 30_000);
                if (this.client.isReady()) {
                    clearTimeout(timeout);
                    resolve();
                } else {
                    this.client.once('ready', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                }
            });
        }
    }

    async disconnect(): Promise<void> {
        // We don't own the client — do nothing
    }

    isReady(): boolean {
        return this.client.isReady();
    }

    getBotUserId(): string {
        return this.client.user!.id;
    }

    // ─── Server / Guild ─────────────────────────────────────────

    async listGuilds(): Promise<DiscordGuild[]> {
        const guilds = this.client.guilds.cache;
        return guilds.map(g => mapGuild(g));
    }

    async getGuild(guildId: string): Promise<DiscordGuildDetailed> {
        const guild = await this.client.guilds.fetch(guildId);
        return mapGuildDetailed(guild);
    }

    // ─── Channels ───────────────────────────────────────────────

    async getChannels(guildId: string): Promise<DiscordChannelSummary[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        return channels
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .map(c => mapChannelSummary(c));
    }

    async getChannel(channelId: string): Promise<DiscordChannel> {
        const channel = await this.client.channels.fetch(channelId);
        assertGuildChannel(channel, channelId);
        return mapChannel(channel as unknown as GuildBasedChannel);
    }

    async createChannel(options: CreateChannelOptions): Promise<DiscordChannel> {
        const guild = await this.client.guilds.fetch(options.guildId);
        const djsType = options.type === 'voice' ? DjsChannelType.GuildVoice
            : options.type === 'category' ? DjsChannelType.GuildCategory
            : options.type === 'announcement' ? DjsChannelType.GuildAnnouncement
            : options.type === 'forum' ? DjsChannelType.GuildForum
            : options.type === 'stage' ? DjsChannelType.GuildStageVoice
            : DjsChannelType.GuildText;

        const channel = await guild.channels.create({
            name: options.name,
            type: djsType,
            topic: options.topic,
            parent: options.parentId,
            nsfw: options.nsfw,
            rateLimitPerUser: options.rateLimitPerUser,
            position: options.position,
        });
        return mapChannel(channel);
    }

    async editChannel(options: EditChannelOptions): Promise<DiscordChannel> {
        const channel = await this.client.channels.fetch(options.channelId);
        assertGuildChannel(channel, options.channelId);
        const edited = await (channel as GuildChannel).edit({
            name: options.name,
            topic: options.topic,
            nsfw: options.nsfw,
            rateLimitPerUser: options.rateLimitPerUser,
            position: options.position,
            parent: options.parentId,
        });
        return mapChannel(edited as unknown as GuildBasedChannel);
    }

    async deleteChannel(channelId: string, reason?: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertGuildChannel(channel, channelId);
        await (channel as GuildChannel).delete(reason);
    }

    // ─── Threads ────────────────────────────────────────────────

    async createThread(options: CreateThreadOptions): Promise<DiscordChannel> {
        const channel = await this.client.channels.fetch(options.channelId);
        assertTextChannel(channel, options.channelId);
        const textChannel = channel as TextChannel;

        let thread;
        if (options.messageId) {
            const message = await textChannel.messages.fetch(options.messageId);
            thread = await message.startThread({
                name: options.name,
                autoArchiveDuration: options.autoArchiveDuration,
                reason: options.reason,
            });
        } else {
            thread = await textChannel.threads.create({
                name: options.name,
                autoArchiveDuration: options.autoArchiveDuration,
                reason: options.reason,
            });
        }
        return mapChannel(thread as unknown as GuildBasedChannel);
    }

    async archiveThread(threadId: string): Promise<void> {
        const channel = await this.client.channels.fetch(threadId);
        assertThreadChannel(channel, threadId);
        await (channel as ThreadChannel).setArchived(true);
    }

    // ─── Messages ───────────────────────────────────────────────

    async sendMessage(options: SendMessageOptions): Promise<DiscordMessage> {
        const channel = await this.client.channels.fetch(options.channelId);
        assertTextChannel(channel, options.channelId);

        const payload: any = {};
        if (options.content) payload.content = options.content;
        if (options.embeds) payload.embeds = options.embeds;
        if (options.replyToMessageId) {
            payload.reply = { messageReference: options.replyToMessageId };
        }

        const msg = await (channel as TextChannel).send(payload);
        return mapMessage(msg);
    }

    async readMessages(options: ReadMessagesOptions): Promise<PaginatedResult<DiscordMessage>> {
        const channel = await this.client.channels.fetch(options.channelId);
        assertTextChannel(channel, options.channelId);

        const fetchOptions: FetchMessagesOptions = { limit: options.limit ?? 50 };
        if (options.before) fetchOptions.before = options.before;
        if (options.after) fetchOptions.after = options.after;
        if (options.around) fetchOptions.around = options.around;

        const messages = await (channel as TextChannel).messages.fetch(fetchOptions);
        const mapped = messages.map(m => mapMessage(m));

        return {
            items: mapped,
            hasMore: mapped.length === (options.limit ?? 50),
        };
    }

    async editMessage(channelId: string, messageId: string, content: string, embeds?: DiscordEmbed[]): Promise<DiscordMessage> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        const edited = await message.edit({ content, embeds: embeds as any });
        return mapMessage(edited);
    }

    async deleteMessage(channelId: string, messageId: string, _reason?: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        await message.delete();
    }

    async deleteMessagesBulk(channelId: string, messageIds: string[], reason?: string): Promise<number> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const deleted = await (channel as TextChannel).bulkDelete(messageIds);
        return deleted.size;
    }

    async pinMessage(channelId: string, messageId: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        await message.pin();
    }

    async unpinMessage(channelId: string, messageId: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        await message.unpin();
    }

    async searchMessages(options: SearchMessagesOptions): Promise<PaginatedResult<DiscordMessage>> {
        return ProviderDefaults.searchMessagesViaRest(
            (path, opts) => this.client.rest.get(path, opts),
            options
        );
    }

    // ─── Reactions ──────────────────────────────────────────────

    async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        await message.react(emoji);
    }

    async removeReaction(channelId: string, messageId: string, emoji: string, userId?: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertTextChannel(channel, channelId);
        const message = await (channel as TextChannel).messages.fetch(messageId);
        const reaction = message.reactions.cache.find(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
        if (reaction) {
            if (userId) {
                await reaction.users.remove(userId);
            } else {
                await reaction.users.remove(this.client.user!.id);
            }
        }
    }

    // ─── Members / Users ────────────────────────────────────────

    async listMembers(guildId: string, limit = 100, after?: string): Promise<PaginatedResult<DiscordMember>> {
        const guild = await this.client.guilds.fetch(guildId);
        const members = await guild.members.list({ limit, after });
        return {
            items: members.map(m => mapMember(m)),
            hasMore: members.size === limit,
        };
    }

    async getMember(guildId: string, userId: string): Promise<DiscordMember> {
        const guild = await this.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        return mapMember(member);
    }

    async getUser(userId: string): Promise<DiscordUser> {
        const user = await this.client.users.fetch(userId);
        return mapUser(user);
    }

    async searchMembers(guildId: string, query: string, limit = 20): Promise<DiscordMember[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const members = await guild.members.search({ query, limit });
        return members.map(m => mapMember(m));
    }

    async setNickname(guildId: string, userId: string, nickname: string, reason?: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.setNickname(nickname || null, reason);
    }

    async bulkBan(
        guildId: string,
        userIds: string[],
        reason?: string,
        deleteMessageSeconds?: number
    ): Promise<{ bannedCount: number; failed: string[] }> {
        const guild = await this.client.guilds.fetch(guildId);
        const result = await guild.bans.bulkCreate(userIds, {
            reason,
            deleteMessageSeconds,
        });
        const banned = (result.bannedUsers ?? []) as string[];
        const failed = (result.failedUsers ?? []) as string[];
        return { bannedCount: banned.length, failed };
    }

    async listBans(guildId: string, limit = 100, after?: string): Promise<PaginatedResult<Ban>> {
        const guild = await this.client.guilds.fetch(guildId);
        const bans = await guild.bans.fetch({ limit, after });
        const items = bans.map(b => mapBan(b));
        return {
            items,
            hasMore: items.length === limit,
        };
    }

    async pruneMembers(
        guildId: string,
        days: number,
        includeRoles?: string[],
        dryRun?: boolean
    ): Promise<{ prunedCount: number; dryRun: boolean }> {
        const guild = await this.client.guilds.fetch(guildId);
        const pruned = await guild.members.prune({
            days,
            roles: includeRoles,
            dry: dryRun ?? false,
            count: true,
        });
        return { prunedCount: pruned ?? 0, dryRun: dryRun ?? false };
    }

    async getMemberInfo(guildId: string, userId: string): Promise<DiscordMember> {
        const guild = await this.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const base = mapMember(member);
        const voice = member.voice;
        return {
            ...base,
            premiumSince: member.premiumSince?.toISOString() ?? null,
            pending: member.pending,
            voiceState: voice?.channelId
                ? {
                    channelId: voice.channelId,
                    selfMute: voice.selfMute ?? false,
                    selfDeaf: voice.selfDeaf ?? false,
                    serverMute: voice.serverMute ?? false,
                    serverDeaf: voice.serverDeaf ?? false,
                }
                : null,
        };
    }

    // ─── Roles ──────────────────────────────────────────────────

    async listRoles(guildId: string): Promise<DiscordRole[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const roles = await guild.roles.fetch();
        return roles.map(r => mapRole(r));
    }

    async createRole(options: CreateRoleOptions): Promise<DiscordRole> {
        const guild = await this.client.guilds.fetch(options.guildId);
        const role = await guild.roles.create({
            name: options.name,
            color: options.color,
            mentionable: options.mentionable,
            hoist: options.hoist,
        });
        return mapRole(role);
    }

    async addRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.roles.add(roleId, reason);
    }

    async removeRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        await member.roles.remove(roleId, reason);
    }

    async editRole(options: EditRoleOptions): Promise<DiscordRole> {
        const guild = await this.client.guilds.fetch(options.guildId);
        const role = await guild.roles.fetch(options.roleId);
        if (!role) throw new Error(`Role ${options.roleId} not found`);
        const edited = await role.edit({
            name: options.name,
            color: options.color,
            hoist: options.hoist,
            mentionable: options.mentionable,
            permissions: options.permissions as any,
        });
        return mapRole(edited);
    }

    async deleteRole(guildId: string, roleId: string, reason?: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) throw new Error(`Role ${roleId} not found`);
        await role.delete(reason);
    }

    async getRoleMembers(guildId: string, roleId: string): Promise<DiscordMember[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) throw new Error(`Role ${roleId} not found`);
        return role.members.map(m => mapMember(m));
    }

    async setRolePosition(guildId: string, roleId: string, position: number): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) throw new Error(`Role ${roleId} not found`);
        await role.setPosition(position);
    }

    async setRoleIcon(guildId: string, roleId: string, icon: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        const role = await guild.roles.fetch(roleId);
        if (!role) throw new Error(`Role ${roleId} not found`);
        // Discord API treats unicode emoji via `unicodeEmoji` and image via `icon`.
        if (/^https?:\/\//i.test(icon)) {
            await role.edit({ icon });
        } else {
            await role.edit({ unicodeEmoji: icon });
        }
    }

    // ─── Moderation ─────────────────────────────────────────────

    async timeoutUser(options: TimeoutOptions): Promise<void> {
        const guild = await this.client.guilds.fetch(options.guildId);
        const member = await guild.members.fetch(options.userId);
        await member.timeout(options.durationMs, options.reason);
    }

    async kickUser(options: KickOptions): Promise<void> {
        const guild = await this.client.guilds.fetch(options.guildId);
        const member = await guild.members.fetch(options.userId);
        await member.kick(options.reason);
    }

    async banUser(options: BanOptions): Promise<void> {
        const guild = await this.client.guilds.fetch(options.guildId);
        await guild.members.ban(options.userId, {
            reason: options.reason,
            deleteMessageSeconds: options.deleteMessageSeconds,
        });
    }

    async unbanUser(guildId: string, userId: string, reason?: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        await guild.members.unban(userId, reason);
    }

    // ─── Monitoring / Audit ─────────────────────────────────────

    async getAuditLog(guildId: string, limit = 50, _actionType?: string): Promise<AuditLogEntry[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const logs = await guild.fetchAuditLogs({ limit });
        return logs.entries.map(e => ({
            id: e.id,
            action: String(e.action),
            executorId: e.executor?.id ?? null,
            executorName: e.executor?.username ?? null,
            targetId: (e.target as any)?.id ?? null,
            targetType: e.targetType ?? null,
            reason: e.reason ?? null,
            createdAt: e.createdAt.toISOString(),
            changes: (e.changes ?? []).map(c => ({
                key: c.key,
                old: c.old != null ? String(c.old) : undefined,
                new: c.new != null ? String(c.new) : undefined,
            })),
        }));
    }

    async checkMentions(guildId: string, userId?: string, limit = 25): Promise<DiscordMessage[]> {
        return ProviderDefaults.checkMentions(this, guildId, userId, limit);
    }

    // ─── Permissions ─────────────────────────────────────────────

    async getChannelPermissions(channelId: string): Promise<PermissionOverwrite[]> {
        const channel = await this.client.channels.fetch(channelId);
        assertGuildChannel(channel, channelId);
        const guildChannel = channel as GuildChannel;
        return guildChannel.permissionOverwrites.cache.map(o => mapPermissionOverwrite(o));
    }

    async setRolePermission(
        channelId: string,
        roleId: string,
        allow: string[],
        deny: string[],
    ): Promise<void> {
        await this.client.rest.put(`/channels/${channelId}/permissions/${roleId}`, {
            body: {
                type: 0,
                allow: permissionNamesToBitfield(allow),
                deny: permissionNamesToBitfield(deny),
            },
        });
    }

    async setMemberPermission(
        channelId: string,
        userId: string,
        allow: string[],
        deny: string[],
    ): Promise<void> {
        await this.client.rest.put(`/channels/${channelId}/permissions/${userId}`, {
            body: {
                type: 1,
                allow: permissionNamesToBitfield(allow),
                deny: permissionNamesToBitfield(deny),
            },
        });
    }

    async resetChannelPermissions(channelId: string): Promise<void> {
        const channel = await this.client.channels.fetch(channelId);
        assertGuildChannel(channel, channelId);
        const guildChannel = channel as GuildChannel;
        const overwriteIds = guildChannel.permissionOverwrites.cache.map(o => o.id);
        for (const id of overwriteIds) {
            await this.client.rest.delete(`/channels/${channelId}/permissions/${id}`);
        }
    }

    async copyPermissions(sourceChannelId: string, targetChannelId: string): Promise<void> {
        const source = await this.client.channels.fetch(sourceChannelId);
        assertGuildChannel(source, sourceChannelId);
        const sourceChannel = source as GuildChannel;
        for (const overwrite of sourceChannel.permissionOverwrites.cache.values()) {
            await this.client.rest.put(`/channels/${targetChannelId}/permissions/${overwrite.id}`, {
                body: {
                    type: overwrite.type === DjsOverwriteType.Role ? 0 : 1,
                    allow: overwrite.allow.bitfield.toString(),
                    deny: overwrite.deny.bitfield.toString(),
                },
            });
        }
    }

    async auditPermissions(guildId: string): Promise<ChannelPermissionsAudit[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        const result: ChannelPermissionsAudit[] = [];
        for (const channel of channels.values()) {
            if (!channel) continue;
            const overwrites = (channel as GuildChannel).permissionOverwrites?.cache;
            if (!overwrites) continue;
            result.push({
                channelId: channel.id,
                channelName: channel.name,
                overwrites: overwrites.map(o => mapPermissionOverwrite(o)),
            });
        }
        return result;
    }

    // ─── Webhooks ────────────────────────────────────────────────
    // Methods added by PR 2 (feat/webhooks).

    // ─── Forums ──────────────────────────────────────────────────

    async getForumChannels(guildId: string): Promise<DiscordChannelSummary[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const channels = await guild.channels.fetch();
        return channels
            .filter((c): c is NonNullable<typeof c> => c !== null && c.type === DjsChannelType.GuildForum)
            .map(c => mapChannelSummary(c));
    }

    async createForumPost(options: CreateForumPostOptions): Promise<ForumPost> {
        const channel = await this.client.channels.fetch(options.channelId);
        if (!channel || channel.type !== DjsChannelType.GuildForum) {
            throw new Error(`Channel ${options.channelId} is not a forum channel`);
        }
        const forum = channel as ForumChannel;
        const thread = await forum.threads.create({
            name: options.name,
            autoArchiveDuration: options.autoArchiveDuration,
            message: { content: options.content },
            appliedTags: options.tagIds,
        });
        return mapForumPost(thread);
    }

    async getForumPost(postId: string): Promise<ForumPost> {
        const channel = await this.client.channels.fetch(postId);
        if (!channel || !('isThread' in channel) || !(channel as ThreadChannel).isThread()) {
            throw new Error(`Channel ${postId} is not a thread`);
        }
        return mapForumPost(channel as ThreadChannel);
    }

    async listForumThreads(channelId: string, archived?: boolean, limit?: number): Promise<ForumPost[]> {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel || channel.type !== DjsChannelType.GuildForum) {
            throw new Error(`Channel ${channelId} is not a forum channel`);
        }
        const forum = channel as ForumChannel;
        const fetched = archived
            ? await forum.threads.fetchArchived({ limit })
            : await forum.threads.fetchActive();
        const threads = Array.from(fetched.threads.values());
        const sliced = limit ? threads.slice(0, limit) : threads;
        return sliced.map(t => mapForumPost(t));
    }

    async deleteForumPost(postId: string, reason?: string): Promise<void> {
        const channel = await this.client.channels.fetch(postId);
        if (!channel || !('isThread' in channel) || !(channel as ThreadChannel).isThread()) {
            throw new Error(`Channel ${postId} is not a thread`);
        }
        await (channel as ThreadChannel).delete(reason);
    }

    async getForumTags(channelId: string): Promise<ForumTag[]> {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel || channel.type !== DjsChannelType.GuildForum) {
            throw new Error(`Channel ${channelId} is not a forum channel`);
        }
        return (channel as ForumChannel).availableTags.map(t => mapForumTag(t));
    }

    async setForumTags(channelId: string, tags: ForumTagInput[]): Promise<ForumTag[]> {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel || channel.type !== DjsChannelType.GuildForum) {
            throw new Error(`Channel ${channelId} is not a forum channel`);
        }
        const forum = channel as ForumChannel;
        const updated = await forum.setAvailableTags(tags.map(t => ({
            name: t.name,
            moderated: t.moderated,
            emoji: t.emoji ? { id: t.emoji.id ?? null, name: t.emoji.name ?? null } : null,
        })));
        return updated.availableTags.map(t => mapForumTag(t));
    }

    async updateForumPost(options: UpdateForumPostOptions): Promise<ForumPost> {
        const channel = await this.client.channels.fetch(options.postId);
        if (!channel || !('isThread' in channel) || !(channel as ThreadChannel).isThread()) {
            throw new Error(`Channel ${options.postId} is not a thread`);
        }
        const thread = channel as ThreadChannel;
        const edited = await thread.edit({
            name: options.name,
            archived: options.archived,
            locked: options.locked,
            appliedTags: options.appliedTagIds,
        });
        return mapForumPost(edited);
    }

    async replyToForum(options: ReplyToForumOptions): Promise<DiscordMessage> {
        const channel = await this.client.channels.fetch(options.postId);
        if (!channel || !('isThread' in channel) || !(channel as ThreadChannel).isThread()) {
            throw new Error(`Channel ${options.postId} is not a thread`);
        }
        const thread = channel as ThreadChannel;
        const payload: any = {};
        if (options.content) payload.content = options.content;
        if (options.embeds) payload.embeds = options.embeds;
        const msg = await thread.send(payload);
        return mapMessage(msg);
    }

    // ─── Invites ─────────────────────────────────────────────────

    async listInvites(guildId: string): Promise<Invite[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const invites = await guild.invites.fetch();
        return invites.map(i => mapInvite(i));
    }

    async listChannelInvites(channelId: string): Promise<Invite[]> {
        const channel = await this.client.channels.fetch(channelId);
        assertGuildChannel(channel, channelId);
        const invites = await (channel as any).fetchInvites();
        return [...invites.values()].map((i: any) => mapInvite(i));
    }

    async getInvite(code: string): Promise<Invite> {
        const invite = await this.client.fetchInvite(code);
        return mapInvite(invite);
    }

    async createInvite(options: CreateInviteOptions): Promise<Invite> {
        const channel = await this.client.channels.fetch(options.channelId);
        assertGuildChannel(channel, options.channelId);
        const invite = await (channel as any).createInvite({
            maxUses: options.maxUses,
            maxAge: options.maxAge,
            temporary: options.temporary,
            unique: options.unique,
        });
        return mapInvite(invite);
    }

    async deleteInvite(code: string, reason?: string): Promise<void> {
        const invite = await this.client.fetchInvite(code);
        await invite.delete(reason);
    }

    // ─── DMs ─────────────────────────────────────────────────────

    async sendDM(options: SendDMOptions): Promise<DiscordMessage> {
        const user = await this.client.users.fetch(options.userId);
        const dm = await user.createDM();
        const payload: any = {};
        if (options.content) payload.content = options.content;
        if (options.embeds) payload.embeds = options.embeds;
        const msg = await dm.send(payload);
        return mapMessage(msg);
    }

    // ─── Scheduled Events ────────────────────────────────────────

    async listScheduledEvents(guildId: string): Promise<ScheduledEvent[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const events = await guild.scheduledEvents.fetch();
        return events.map(e => mapScheduledEvent(e));
    }

    async getScheduledEvent(guildId: string, eventId: string): Promise<ScheduledEvent> {
        const guild = await this.client.guilds.fetch(guildId);
        const event = await guild.scheduledEvents.fetch(eventId);
        return mapScheduledEvent(event);
    }

    async createScheduledEvent(options: CreateScheduledEventOptions): Promise<ScheduledEvent> {
        if (options.entityType === 'EXTERNAL') {
            if (!options.location) {
                throw new Error('create_scheduled_event: location is required when entity_type is external');
            }
            if (!options.scheduledEndTime) {
                throw new Error('create_scheduled_event: scheduled_end_time is required when entity_type is external');
            }
        } else {
            if (!options.channelId) {
                throw new Error(`create_scheduled_event: channel_id is required when entity_type is ${options.entityType.toLowerCase()}`);
            }
        }

        const guild = await this.client.guilds.fetch(options.guildId);
        const djsType = options.entityType === 'VOICE'
            ? GuildScheduledEventEntityType.Voice
            : options.entityType === 'STAGE_INSTANCE'
                ? GuildScheduledEventEntityType.StageInstance
                : GuildScheduledEventEntityType.External;

        const createOptions: any = {
            name: options.name,
            scheduledStartTime: options.scheduledStartTime,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: djsType,
        };
        if (options.scheduledEndTime) createOptions.scheduledEndTime = options.scheduledEndTime;
        if (options.description) createOptions.description = options.description;
        if (options.channelId) createOptions.channel = options.channelId;
        if (options.location) createOptions.entityMetadata = { location: options.location };

        const event = await guild.scheduledEvents.create(createOptions);
        return mapScheduledEvent(event);
    }

    async editScheduledEvent(options: EditScheduledEventOptions): Promise<ScheduledEvent> {
        const guild = await this.client.guilds.fetch(options.guildId);
        const editOptions: any = {};
        if (options.name !== undefined) editOptions.name = options.name;
        if (options.scheduledStartTime !== undefined) editOptions.scheduledStartTime = options.scheduledStartTime;
        if (options.scheduledEndTime !== undefined) editOptions.scheduledEndTime = options.scheduledEndTime;
        if (options.description !== undefined) editOptions.description = options.description;
        if (options.channelId !== undefined) editOptions.channel = options.channelId;
        if (options.location !== undefined) editOptions.entityMetadata = { location: options.location };
        if (options.entityType !== undefined) {
            editOptions.entityType = options.entityType === 'VOICE'
                ? GuildScheduledEventEntityType.Voice
                : options.entityType === 'STAGE_INSTANCE'
                    ? GuildScheduledEventEntityType.StageInstance
                    : GuildScheduledEventEntityType.External;
        }
        const edited = await guild.scheduledEvents.edit(options.eventId, editOptions);
        return mapScheduledEvent(edited);
    }

    async deleteScheduledEvent(guildId: string, eventId: string): Promise<void> {
        const guild = await this.client.guilds.fetch(guildId);
        await guild.scheduledEvents.delete(eventId);
    }

    async getEventSubscribers(guildId: string, eventId: string, limit?: number): Promise<DiscordUser[]> {
        const guild = await this.client.guilds.fetch(guildId);
        const event = await guild.scheduledEvents.fetch(eventId);
        const subscribers = await event.fetchSubscribers({ limit });
        return subscribers.map((s: any) => mapUser(s.user as User));
    }

    async createEventInvite(_guildId: string, eventId: string, channelId: string): Promise<ScheduledEventInvite> {
        const invite = (await this.client.rest.post(Routes.channelInvites(channelId), {
            body: {},
        })) as { code: string };
        return {
            code: invite.code,
            url: `https://discord.gg/${invite.code}?event=${eventId}`,
            eventId,
        };
    }

    // ─── Screening ───────────────────────────────────────────────

    async getWelcomeScreen(guildId: string): Promise<WelcomeScreen> {
        const guild = await this.client.guilds.fetch(guildId);
        const screen = await guild.fetchWelcomeScreen();
        return mapWelcomeScreen(screen);
    }

    async updateWelcomeScreen(options: UpdateWelcomeScreenOptions): Promise<WelcomeScreen> {
        const body: any = {};
        if (options.enabled !== undefined) body.enabled = options.enabled;
        if (options.description !== undefined) body.description = options.description;
        if (options.welcomeChannels !== undefined) {
            body.welcome_channels = options.welcomeChannels.map(wc => ({
                channel_id: wc.channelId,
                description: wc.description,
                emoji_name: wc.emojiName ?? null,
                emoji_id: wc.emojiId ?? null,
            }));
        }
        const raw = await this.client.rest.patch(`/guilds/${options.guildId}/welcome-screen`, { body });
        return mapApiWelcomeScreen(raw);
    }
}
