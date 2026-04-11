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
import { ChannelType as DjsChannelType } from 'discord.js';

import type { DiscordProvider, IntegratedProviderConfig } from './discord-provider.js';
import { assertTextChannel, assertGuildChannel, assertThreadChannel } from '../utils/guards.js';
import { ProviderDefaults } from './base-provider.js';
import type {
    AuditLogEntry,
    BanOptions,
    CreateChannelOptions,
    CreateForumPostOptions,
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
    KickOptions,
    PaginatedResult,
    ReadMessagesOptions,
    ReplyToForumOptions,
    SearchMessagesOptions,
    SendMessageOptions,
    TimeoutOptions,
    UpdateForumPostOptions,
} from '../types/discord.js';
import { mapChannel, mapChannelSummary, mapForumPost, mapForumTag, mapGuild, mapGuildDetailed, mapMember, mapMessage, mapRole, mapUser } from '../utils/mappers.js';

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
    // Methods added by PR 1 (feat/permissions).

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
    // Methods added by PR 4 (feat/invites-dms).

    // ─── DMs ─────────────────────────────────────────────────────
    // Methods added by PR 4 (feat/invites-dms).

    // ─── Scheduled Events ────────────────────────────────────────
    // Methods added by PR 5 (feat/scheduled-events).

    // ─── Screening ───────────────────────────────────────────────
    // Methods added by PR 6b (feat/screening).
}
