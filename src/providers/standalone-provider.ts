/**
 * StandaloneProvider — creates its own Discord connection.
 *
 * Use this when the MCP server runs as an independent process,
 * separate from any existing bot. It authenticates with its own
 * bot token and can operate in two sub-modes:
 *
 *   REST-only  (useGateway: false) — lightweight, no WebSocket,
 *              cannot receive real-time events but handles all
 *              CRUD operations. Ideal for most MCP use cases.
 *
 *   Full       (useGateway: true)  — connects to the Discord
 *              gateway for real-time features like presence,
 *              typing indicators, and live mention monitoring.
 */

import {
    Client,
    GatewayIntentBits,
    PermissionFlagsBits,
    REST,
    Routes,
    ChannelType as DjsChannelType,
    type TextChannel,
    type Guild,
    type GuildMember,
    type Message,
    type Role,
    type APIMessage,
    type GuildBasedChannel,
    type ThreadChannel,
} from 'discord.js';

function permissionFlagsToBitfield(flags: string[]): string {
    let bits = 0n;
    for (const flag of flags) {
        const value = (PermissionFlagsBits as Record<string, bigint>)[flag];
        if (value !== undefined) bits |= value;
    }
    return bits.toString();
}

import type { DiscordProvider, StandaloneProviderConfig } from './discord-provider.js';
import type { EditRoleOptions } from './capabilities/roles.js';
import { ProviderDefaults } from './base-provider.js';
import type {
    AuditLogEntry,
    Ban,
    BanOptions,
    CreateChannelOptions,
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
    KickOptions,
    PaginatedResult,
    ReadMessagesOptions,
    SearchMessagesOptions,
    SendMessageOptions,
    TimeoutOptions,
    ChannelType,
} from '../types/discord.js';
import { mapApiBan, mapApiMember, mapBan, mapChannel, mapChannelSummary, mapGuild, mapGuildDetailed, mapMember, mapMessage, mapRole, mapUser, mapChannelType, mapApiMessage } from '../utils/mappers.js';

export class StandaloneProvider implements DiscordProvider {
    readonly name = 'standalone';

    private client: Client | null = null;
    private rest: REST;
    private config: StandaloneProviderConfig;
    private ready = false;
    private botUserId = '';

    constructor(config: StandaloneProviderConfig) {
        this.config = config;
        this.rest = new REST({ version: '10' }).setToken(config.token);
    }

    async connect(): Promise<void> {
        if (this.config.useGateway !== false) {
            // Full mode with gateway
            const intents = this.config.intents ?? [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildModeration,
            ];

            this.client = new Client({ intents });

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Connection timeout')), 30_000);
                this.client!.once('ready', () => {
                    clearTimeout(timeout);
                    this.botUserId = this.client!.user!.id;
                    this.ready = true;
                    resolve();
                });
                this.client!.login(this.config.token).catch(reject);
            });
        } else {
            // REST-only mode — validate token by fetching bot user
            const user = (await this.rest.get(Routes.user())) as { id: string };
            this.botUserId = user.id;
            this.ready = true;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
        this.ready = false;
    }

    isReady(): boolean {
        return this.ready;
    }

    getBotUserId(): string {
        return this.botUserId;
    }

    // ─── Helpers ────────────────────────────────────────────────

    private requireGateway(): Client {
        if (!this.client) {
            throw new Error('This operation requires gateway mode (useGateway: true)');
        }
        return this.client;
    }

    private async resolveGuild(guildId: string): Promise<Guild> {
        const client = this.requireGateway();
        const guild = await client.guilds.fetch(guildId);
        if (!guild) throw new Error(`Guild ${guildId} not found`);
        return guild;
    }

    // ─── Server / Guild ─────────────────────────────────────────

    async listGuilds(): Promise<DiscordGuild[]> {
        if (this.client) {
            const guilds = await this.client.guilds.fetch();
            return guilds.map(g => ({
                id: g.id,
                name: g.name,
                icon: g.iconURL(),
                memberCount: 0, // partial guild, no member count
                ownerId: '',
                description: null,
                createdAt: g.createdAt.toISOString(),
                features: [],
            }));
        }
        // REST fallback
        const guilds = (await this.rest.get(Routes.userGuilds())) as any[];
        return guilds.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.icon,
            memberCount: g.approximate_member_count ?? 0,
            ownerId: g.owner_id ?? '',
            description: g.description ?? null,
            createdAt: new Date(Number(BigInt(g.id) >> 22n) + 1420070400000).toISOString(),
            features: g.features ?? [],
        }));
    }

    async getGuild(guildId: string): Promise<DiscordGuildDetailed> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
            return mapGuildDetailed(guild);
        }
        const guild = (await this.rest.get(Routes.guild(guildId), {
            query: new URLSearchParams({ with_counts: 'true' }),
        })) as any;
        // Simplified REST mapping
        return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            memberCount: guild.approximate_member_count ?? 0,
            ownerId: guild.owner_id,
            description: guild.description,
            createdAt: new Date(Number(BigInt(guild.id) >> 22n) + 1420070400000).toISOString(),
            features: guild.features ?? [],
            roles: (guild.roles ?? []).map((r: any) => ({
                id: r.id,
                name: r.name,
                color: r.color,
                position: r.position,
                permissions: r.permissions,
                mentionable: r.mentionable,
                managed: r.managed,
            })),
            channels: [],
            emojis: (guild.emojis ?? []).map((e: any) => ({
                id: e.id,
                name: e.name,
                animated: e.animated,
            })),
            boostLevel: guild.premium_tier ?? 0,
            boostCount: guild.premium_subscription_count ?? 0,
        };
    }

    // ─── Channels ───────────────────────────────────────────────

    async getChannels(guildId: string): Promise<DiscordChannelSummary[]> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
            const channels = await guild.channels.fetch();
            return channels
                .filter((c): c is NonNullable<typeof c> => c !== null)
                .map(c => mapChannelSummary(c));
        }
        const channels = (await this.rest.get(Routes.guildChannels(guildId))) as any[];
        return channels.map(c => ({
            id: c.id,
            name: c.name,
            type: mapChannelType(c.type),
            parentId: c.parent_id ?? null,
            parentName: null,
            position: c.position ?? 0,
            topic: c.topic ?? null,
        }));
    }

    async getChannel(channelId: string): Promise<DiscordChannel> {
        if (this.client) {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) throw new Error(`Channel ${channelId} not found`);
            return mapChannel(channel as unknown as GuildBasedChannel);
        }
        const c = (await this.rest.get(Routes.channel(channelId))) as any;
        return {
            id: c.id,
            name: c.name,
            type: mapChannelType(c.type),
            parentId: c.parent_id ?? null,
            parentName: null,
            position: c.position ?? 0,
            topic: c.topic ?? null,
            guildId: c.guild_id ?? '',
            nsfw: c.nsfw ?? false,
            rateLimitPerUser: c.rate_limit_per_user ?? 0,
            createdAt: new Date(Number(BigInt(c.id) >> 22n) + 1420070400000).toISOString(),
        };
    }

    async createChannel(options: CreateChannelOptions): Promise<DiscordChannel> {
        if (this.client) {
            const guild = await this.resolveGuild(options.guildId);
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
        // REST fallback
        const typeMap: Record<string, number> = {
            text: 0, voice: 2, category: 4, announcement: 5, forum: 15, stage: 13
        };
        const body: any = {
            name: options.name,
            type: typeMap[options.type ?? 'text'] ?? 0,
        };
        if (options.topic) body.topic = options.topic;
        if (options.parentId) body.parent_id = options.parentId;
        if (options.nsfw !== undefined) body.nsfw = options.nsfw;
        if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;

        const c = (await this.rest.post(Routes.guildChannels(options.guildId), { body })) as any;
        return {
            id: c.id,
            name: c.name,
            type: mapChannelType(c.type),
            parentId: c.parent_id ?? null,
            parentName: null,
            position: c.position ?? 0,
            topic: c.topic ?? null,
            guildId: c.guild_id ?? options.guildId,
            nsfw: c.nsfw ?? false,
            rateLimitPerUser: c.rate_limit_per_user ?? 0,
            createdAt: new Date(Number(BigInt(c.id) >> 22n) + 1420070400000).toISOString(),
        };
    }

    async editChannel(options: EditChannelOptions): Promise<DiscordChannel> {
        if (this.client) {
            const channel = await this.client.channels.fetch(options.channelId);
            if (!channel || !('edit' in channel)) throw new Error(`Channel ${options.channelId} not editable`);
            const edited = await (channel as TextChannel).edit({
                name: options.name,
                topic: options.topic,
                nsfw: options.nsfw,
                rateLimitPerUser: options.rateLimitPerUser,
                position: options.position,
                parent: options.parentId,
            });
            return mapChannel(edited as unknown as GuildBasedChannel);
        }
        // REST fallback
        const body: any = {};
        if (options.name !== undefined) body.name = options.name;
        if (options.topic !== undefined) body.topic = options.topic;
        if (options.nsfw !== undefined) body.nsfw = options.nsfw;
        if (options.rateLimitPerUser !== undefined) body.rate_limit_per_user = options.rateLimitPerUser;
        if (options.position !== undefined) body.position = options.position;
        if (options.parentId !== undefined) body.parent_id = options.parentId;

        const c = (await this.rest.patch(Routes.channel(options.channelId), { body })) as any;
        return {
            id: c.id,
            name: c.name,
            type: mapChannelType(c.type),
            parentId: c.parent_id ?? null,
            parentName: null,
            position: c.position ?? 0,
            topic: c.topic ?? null,
            guildId: c.guild_id ?? '',
            nsfw: c.nsfw ?? false,
            rateLimitPerUser: c.rate_limit_per_user ?? 0,
            createdAt: new Date(Number(BigInt(c.id) >> 22n) + 1420070400000).toISOString(),
        };
    }

    async deleteChannel(channelId: string, reason?: string): Promise<void> {
        await this.rest.delete(Routes.channel(channelId), {
            reason,
        });
    }

    // ─── Threads ────────────────────────────────────────────────

    async createThread(options: CreateThreadOptions): Promise<DiscordChannel> {
        if (this.client) {
            const channel = await this.client.channels.fetch(options.channelId);
            if (!channel || !('threads' in channel)) {
                throw new Error(`Channel ${options.channelId} does not support threads`);
            }
            const textChannel = channel as TextChannel;

            let thread: ThreadChannel;
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
        throw new Error('createThread requires gateway mode (set DISCORD_USE_GATEWAY=true). REST-only mode does not support thread creation.');
    }

    async archiveThread(threadId: string): Promise<void> {
        await this.rest.patch(Routes.channel(threadId), {
            body: { archived: true },
        });
    }

    // ─── Messages ───────────────────────────────────────────────

    async sendMessage(options: SendMessageOptions): Promise<DiscordMessage> {
        const body: any = {};
        if (options.content) body.content = options.content;
        if (options.embeds) body.embeds = options.embeds;
        if (options.replyToMessageId) {
            body.message_reference = { message_id: options.replyToMessageId };
        }

        const msg = (await this.rest.post(Routes.channelMessages(options.channelId), {
            body,
        })) as APIMessage;

        return mapApiMessage(msg);
    }

    async readMessages(options: ReadMessagesOptions): Promise<PaginatedResult<DiscordMessage>> {
        const query = new URLSearchParams();
        query.set('limit', String(options.limit ?? 50));
        if (options.before) query.set('before', options.before);
        if (options.after) query.set('after', options.after);
        if (options.around) query.set('around', options.around);

        const messages = (await this.rest.get(Routes.channelMessages(options.channelId), {
            query,
        })) as APIMessage[];

        const mapped = messages.map(msg => mapApiMessage(msg));

        return {
            items: mapped,
            hasMore: mapped.length === (options.limit ?? 50),
        };
    }

    async editMessage(channelId: string, messageId: string, content: string, embeds?: DiscordEmbed[]): Promise<DiscordMessage> {
        const body: any = { content };
        if (embeds) body.embeds = embeds;

        const msg = (await this.rest.patch(Routes.channelMessage(channelId, messageId), {
            body,
        })) as APIMessage;

        return mapApiMessage(msg);
    }

    async deleteMessage(channelId: string, messageId: string, reason?: string): Promise<void> {
        await this.rest.delete(Routes.channelMessage(channelId, messageId), { reason });
    }

    async deleteMessagesBulk(channelId: string, messageIds: string[], reason?: string): Promise<number> {
        if (messageIds.length === 1) {
            await this.deleteMessage(channelId, messageIds[0], reason);
            return 1;
        }
        await this.rest.post(Routes.channelBulkDelete(channelId), {
            body: { messages: messageIds },
            reason,
        });
        return messageIds.length;
    }

    async pinMessage(channelId: string, messageId: string): Promise<void> {
        await this.rest.put(Routes.channelPin(channelId, messageId));
    }

    async unpinMessage(channelId: string, messageId: string): Promise<void> {
        await this.rest.delete(Routes.channelPin(channelId, messageId));
    }

    async searchMessages(options: SearchMessagesOptions): Promise<PaginatedResult<DiscordMessage>> {
        return ProviderDefaults.searchMessagesViaRest(
            (path, opts) => this.rest.get(path, opts),
            options
        );
    }

    // ─── Reactions ──────────────────────────────────────────────

    async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
        const encoded = encodeURIComponent(emoji);
        await this.rest.put(
            `/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`
        );
    }

    async removeReaction(channelId: string, messageId: string, emoji: string, userId?: string): Promise<void> {
        const encoded = encodeURIComponent(emoji);
        const target = userId ? userId : '@me';
        await this.rest.delete(
            `/channels/${channelId}/messages/${messageId}/reactions/${encoded}/${target}`
        );
    }

    // ─── Members / Users ────────────────────────────────────────

    async listMembers(guildId: string, limit = 100, after?: string): Promise<PaginatedResult<DiscordMember>> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
            const members = await guild.members.list({ limit, after });
            return {
                items: members.map(m => mapMember(m)),
                hasMore: members.size === limit,
            };
        }
        const query = new URLSearchParams({ limit: String(limit) });
        if (after) query.set('after', after);
        const members = (await this.rest.get(Routes.guildMembers(guildId), { query })) as any[];
        return {
            items: members.map(m => ({
                userId: m.user.id,
                username: m.user.username,
                displayName: m.user.global_name ?? m.user.username,
                nickname: m.nick ?? null,
                avatar: m.user.avatar,
                roles: (m.roles ?? []).map((roleId: string) => ({
                    id: roleId,
                    name: '', // role names not available in this endpoint
                    color: 0,
                })),
                joinedAt: m.joined_at,
                bot: m.user.bot ?? false,
            })),
            hasMore: members.length === limit,
        };
    }

    async getMember(guildId: string, userId: string): Promise<DiscordMember> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
            const member = await guild.members.fetch(userId);
            return mapMember(member);
        }
        const m = (await this.rest.get(Routes.guildMember(guildId, userId))) as any;
        return {
            userId: m.user.id,
            username: m.user.username,
            displayName: m.user.global_name ?? m.user.username,
            nickname: m.nick ?? null,
            avatar: m.user.avatar,
            roles: (m.roles ?? []).map((roleId: string) => ({
                id: roleId,
                name: '', // role names not available in this endpoint
                color: 0,
            })),
            joinedAt: m.joined_at,
            bot: m.user.bot ?? false,
        };
    }

    async getUser(userId: string): Promise<DiscordUser> {
        if (this.client) {
            const user = await this.client.users.fetch(userId);
            return mapUser(user);
        }
        const u = (await this.rest.get(Routes.user(userId))) as any;
        return {
            id: u.id,
            username: u.username,
            displayName: u.global_name ?? u.username,
            avatar: u.avatar,
            bot: u.bot ?? false,
            createdAt: new Date(Number(BigInt(u.id) >> 22n) + 1420070400000).toISOString(),
            banner: u.banner ?? null,
        };
    }

    async searchMembers(guildId: string, query: string, limit = 20): Promise<DiscordMember[]> {
        const params = new URLSearchParams({ query, limit: String(limit) });
        const members = (await this.rest.get(Routes.guildMembersSearch(guildId), {
            query: params,
        })) as any[];
        return members.map(m => ({
            userId: m.user.id,
            username: m.user.username,
            displayName: m.user.global_name ?? m.user.username,
            nickname: m.nick ?? null,
            avatar: m.user.avatar,
            roles: (m.roles ?? []).map((roleId: string) => ({
                id: roleId,
                name: '', // role names not available in this endpoint
                color: 0,
            })),
            joinedAt: m.joined_at,
            bot: m.user.bot ?? false,
        }));
    }

    async setNickname(guildId: string, userId: string, nickname: string, reason?: string): Promise<void> {
        await this.rest.patch(Routes.guildMember(guildId, userId), {
            body: { nick: nickname || null },
            reason,
        });
    }

    async bulkBan(
        guildId: string,
        userIds: string[],
        reason?: string,
        deleteMessageSeconds?: number
    ): Promise<{ bannedCount: number; failed: string[] }> {
        const body: any = { user_ids: userIds };
        if (deleteMessageSeconds !== undefined) body.delete_message_seconds = deleteMessageSeconds;
        const result = (await this.rest.post(`/guilds/${guildId}/bulk-ban`, {
            body,
            reason,
        })) as any;
        const banned = (result?.banned_users ?? []) as string[];
        const failed = (result?.failed_users ?? []) as string[];
        return { bannedCount: banned.length, failed };
    }

    async listBans(guildId: string, limit = 100, after?: string): Promise<PaginatedResult<Ban>> {
        const query = new URLSearchParams({ limit: String(limit) });
        if (after) query.set('after', after);
        const bans = (await this.rest.get(Routes.guildBans(guildId), { query })) as any[];
        const items = bans.map(b => mapApiBan(b));
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
        const body: any = { days, compute_prune_count: true };
        if (includeRoles?.length) body.include_roles = includeRoles;
        const isDry = dryRun ?? false;
        const result = isDry
            ? ((await this.rest.get(Routes.guildPrune(guildId), {
                query: new URLSearchParams({
                    days: String(days),
                    ...(includeRoles?.length ? { include_roles: includeRoles.join(',') } : {}),
                }),
            })) as any)
            : ((await this.rest.post(Routes.guildPrune(guildId), { body })) as any);
        return { prunedCount: result?.pruned ?? 0, dryRun: isDry };
    }

    async getMemberInfo(guildId: string, userId: string): Promise<DiscordMember> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
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
        const m = (await this.rest.get(Routes.guildMember(guildId, userId))) as any;
        return mapApiMember(m);
    }

    // ─── Roles ──────────────────────────────────────────────────

    async listRoles(guildId: string): Promise<DiscordRole[]> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
            const roles = await guild.roles.fetch();
            return roles.map(r => mapRole(r));
        }
        const roles = (await this.rest.get(Routes.guildRoles(guildId))) as any[];
        return roles.map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions,
            mentionable: r.mentionable,
            managed: r.managed,
        }));
    }

    async createRole(options: CreateRoleOptions): Promise<DiscordRole> {
        if (this.client) {
            const guild = await this.resolveGuild(options.guildId);
            const role = await guild.roles.create({
                name: options.name,
                color: options.color,
                mentionable: options.mentionable,
                hoist: options.hoist,
            });
            return mapRole(role);
        }
        // REST fallback
        const body: any = {
            name: options.name,
        };
        if (options.color !== undefined) body.color = options.color;
        if (options.mentionable !== undefined) body.mentionable = options.mentionable;
        if (options.hoist !== undefined) body.hoist = options.hoist;

        const r = (await this.rest.post(Routes.guildRoles(options.guildId), { body })) as any;
        return {
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions,
            mentionable: r.mentionable,
            managed: r.managed,
        };
    }

    async addRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
        await this.rest.put(Routes.guildMemberRole(guildId, userId, roleId), { reason });
    }

    async removeRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void> {
        await this.rest.delete(Routes.guildMemberRole(guildId, userId, roleId), { reason });
    }

    async editRole(options: EditRoleOptions): Promise<DiscordRole> {
        const body: any = {};
        if (options.name !== undefined) body.name = options.name;
        if (options.color !== undefined) body.color = options.color;
        if (options.hoist !== undefined) body.hoist = options.hoist;
        if (options.mentionable !== undefined) body.mentionable = options.mentionable;
        if (options.permissions !== undefined) {
            body.permissions = permissionFlagsToBitfield(options.permissions);
        }
        const r = (await this.rest.patch(Routes.guildRole(options.guildId, options.roleId), {
            body,
        })) as any;
        return {
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions,
            mentionable: r.mentionable,
            managed: r.managed,
        };
    }

    async deleteRole(guildId: string, roleId: string, reason?: string): Promise<void> {
        await this.rest.delete(Routes.guildRole(guildId, roleId), { reason });
    }

    async getRoleMembers(guildId: string, roleId: string): Promise<DiscordMember[]> {
        if (this.client) {
            const guild = await this.resolveGuild(guildId);
            const role = await guild.roles.fetch(roleId);
            if (!role) throw new Error(`Role ${roleId} not found`);
            return role.members.map(m => mapMember(m));
        }
        const members: any[] = [];
        let after: string | undefined;
        // Paginate through guild members (REST lacks a direct role-members endpoint).
        for (;;) {
            const query = new URLSearchParams({ limit: '1000' });
            if (after) query.set('after', after);
            const page = (await this.rest.get(Routes.guildMembers(guildId), { query })) as any[];
            if (page.length === 0) break;
            for (const m of page) {
                if ((m.roles ?? []).includes(roleId)) members.push(m);
            }
            if (page.length < 1000) break;
            after = page[page.length - 1].user.id;
        }
        return members.map(m => mapApiMember(m));
    }

    async setRolePosition(guildId: string, roleId: string, position: number): Promise<void> {
        await this.rest.patch(Routes.guildRoles(guildId), {
            body: [{ id: roleId, position }],
        });
    }

    async setRoleIcon(guildId: string, roleId: string, icon: string): Promise<void> {
        const body: any = /^https?:\/\//i.test(icon)
            ? { icon }
            : { unicode_emoji: icon };
        await this.rest.patch(Routes.guildRole(guildId, roleId), { body });
    }

    // ─── Moderation ─────────────────────────────────────────────

    async timeoutUser(options: TimeoutOptions): Promise<void> {
        const until = new Date(Date.now() + options.durationMs).toISOString();
        await this.rest.patch(Routes.guildMember(options.guildId, options.userId), {
            body: { communication_disabled_until: until },
            reason: options.reason,
        });
    }

    async kickUser(options: KickOptions): Promise<void> {
        await this.rest.delete(Routes.guildMember(options.guildId, options.userId), {
            reason: options.reason,
        });
    }

    async banUser(options: BanOptions): Promise<void> {
        await this.rest.put(Routes.guildBan(options.guildId, options.userId), {
            body: { delete_message_seconds: options.deleteMessageSeconds },
            reason: options.reason,
        });
    }

    async unbanUser(guildId: string, userId: string, reason?: string): Promise<void> {
        await this.rest.delete(Routes.guildBan(guildId, userId), { reason });
    }

    // ─── Monitoring / Audit ─────────────────────────────────────

    async getAuditLog(guildId: string, limit = 50, _actionType?: string): Promise<AuditLogEntry[]> {
        const query = new URLSearchParams({ limit: String(limit) });
        const result = (await this.rest.get(Routes.guildAuditLog(guildId), { query })) as any;
        return (result.audit_log_entries ?? []).map((e: any) => ({
            id: e.id,
            action: String(e.action_type),
            executorId: e.user_id ?? null,
            executorName: null,
            targetId: e.target_id ?? null,
            targetType: null,
            reason: e.reason ?? null,
            createdAt: new Date(Number(BigInt(e.id) >> 22n) + 1420070400000).toISOString(),
            changes: (e.changes ?? []).map((c: any) => ({
                key: c.key,
                old: c.old_value != null ? String(c.old_value) : undefined,
                new: c.new_value != null ? String(c.new_value) : undefined,
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
    // Methods added by PR 3 (feat/forums).

    // ─── Invites ─────────────────────────────────────────────────
    // Methods added by PR 4 (feat/invites-dms).

    // ─── DMs ─────────────────────────────────────────────────────
    // Methods added by PR 4 (feat/invites-dms).

    // ─── Scheduled Events ────────────────────────────────────────
    // Methods added by PR 5 (feat/scheduled-events).

    // ─── Screening ───────────────────────────────────────────────
    // Methods added by PR 6b (feat/screening).
}

