/**
 * DiscordProvider — the core abstraction layer.
 *
 * Every method here maps to a Discord capability that MCP tools need.
 * Two implementations exist:
 *
 *   1. IntegratedProvider — receives an existing discord.js Client
 *      from the host bot (zero overhead, shared cache & gateway)
 *
 *   2. StandaloneProvider — creates its own connection using a bot
 *      token (independent process, REST-first with optional gateway)
 *
 * MCP tools NEVER touch discord.js directly — they only call this interface.
 * This makes it trivial to add new providers (e.g., a mock for tests,
 * an HTTP proxy, or a user-token provider).
 */

import type {
    AuditLogEntry,
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
} from '../types/discord.js';

export interface DiscordProvider {
    /** Provider identifier for logging/debugging */
    readonly name: string;

    /** Initialize the provider (connect, authenticate, etc.) */
    connect(): Promise<void>;

    /** Gracefully shut down the provider */
    disconnect(): Promise<void>;

    /** Whether the provider is ready to handle requests */
    isReady(): boolean;

    /** Get the bot's own user ID */
    getBotUserId(): string;

    // ─── Server / Guild ─────────────────────────────────────────

    listGuilds(): Promise<DiscordGuild[]>;
    getGuild(guildId: string): Promise<DiscordGuildDetailed>;

    // ─── Channels ───────────────────────────────────────────────

    getChannels(guildId: string): Promise<DiscordChannelSummary[]>;
    getChannel(channelId: string): Promise<DiscordChannel>;
    createChannel(options: CreateChannelOptions): Promise<DiscordChannel>;
    editChannel(options: EditChannelOptions): Promise<DiscordChannel>;
    deleteChannel(channelId: string, reason?: string): Promise<void>;

    // ─── Threads ────────────────────────────────────────────────

    createThread(options: CreateThreadOptions): Promise<DiscordChannel>;
    archiveThread(threadId: string): Promise<void>;

    // ─── Messages ───────────────────────────────────────────────

    sendMessage(options: SendMessageOptions): Promise<DiscordMessage>;
    readMessages(options: ReadMessagesOptions): Promise<PaginatedResult<DiscordMessage>>;
    editMessage(channelId: string, messageId: string, content: string, embeds?: DiscordEmbed[]): Promise<DiscordMessage>;
    deleteMessage(channelId: string, messageId: string, reason?: string): Promise<void>;
    deleteMessagesBulk(channelId: string, messageIds: string[], reason?: string): Promise<number>;
    pinMessage(channelId: string, messageId: string): Promise<void>;
    unpinMessage(channelId: string, messageId: string): Promise<void>;
    searchMessages(options: SearchMessagesOptions): Promise<PaginatedResult<DiscordMessage>>;

    // ─── Reactions ──────────────────────────────────────────────

    addReaction(channelId: string, messageId: string, emoji: string): Promise<void>;
    removeReaction(channelId: string, messageId: string, emoji: string, userId?: string): Promise<void>;

    // ─── Members / Users ────────────────────────────────────────

    listMembers(guildId: string, limit?: number, after?: string): Promise<PaginatedResult<DiscordMember>>;
    getMember(guildId: string, userId: string): Promise<DiscordMember>;
    getUser(userId: string): Promise<DiscordUser>;
    searchMembers(guildId: string, query: string, limit?: number): Promise<DiscordMember[]>;

    // ─── Roles ──────────────────────────────────────────────────

    listRoles(guildId: string): Promise<DiscordRole[]>;
    createRole(options: CreateRoleOptions): Promise<DiscordRole>;
    addRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void>;
    removeRole(guildId: string, userId: string, roleId: string, reason?: string): Promise<void>;

    // ─── Moderation ─────────────────────────────────────────────

    timeoutUser(options: TimeoutOptions): Promise<void>;
    kickUser(options: KickOptions): Promise<void>;
    banUser(options: BanOptions): Promise<void>;
    unbanUser(guildId: string, userId: string, reason?: string): Promise<void>;

    // ─── Monitoring / Audit ─────────────────────────────────────

    getAuditLog(guildId: string, limit?: number, actionType?: string): Promise<AuditLogEntry[]>;
    checkMentions(guildId: string, userId?: string, limit?: number): Promise<DiscordMessage[]>;
}

/**
 * Configuration for creating a provider.
 */
export interface StandaloneProviderConfig {
    /** Discord bot token */
    token: string;
    /** Whether to connect to the gateway (WebSocket) or use REST-only */
    useGateway?: boolean;
    /** Gateway intents (only relevant if useGateway is true) */
    intents?: number[];
}

export interface IntegratedProviderConfig {
    /**
     * A discord.js Client instance that is already logged in.
     * Typed as `unknown` here to avoid forcing discord.js as a
     * peer dependency — the IntegratedProvider casts it internally.
     */
    client: unknown;
}
