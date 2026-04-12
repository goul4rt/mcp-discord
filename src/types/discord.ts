/**
 * Shared types for the Discord MCP Server.
 * These types decouple MCP tools from discord.js internals,
 * making it possible to swap providers without touching tool logic.
 */

// ─── Server / Guild ─────────────────────────────────────────────

export interface DiscordGuild {
    id: string;
    name: string;
    icon: string | null;
    memberCount: number;
    ownerId: string;
    description: string | null;
    createdAt: string;
    features: string[];
}

export interface DiscordGuildDetailed extends DiscordGuild {
    roles: DiscordRole[];
    channels: DiscordChannelSummary[];
    emojis: { id: string; name: string; animated: boolean }[];
    boostLevel: number;
    boostCount: number;
}

// ─── Channel ────────────────────────────────────────────────────

export interface DiscordChannelSummary {
    id: string;
    name: string;
    type: ChannelType;
    parentId: string | null;
    parentName: string | null;
    position: number;
    topic: string | null;
}

export interface DiscordChannel extends DiscordChannelSummary {
    guildId: string;
    nsfw: boolean;
    rateLimitPerUser: number;
    createdAt: string;
}

export enum ChannelType {
    TEXT = 'text',
    VOICE = 'voice',
    CATEGORY = 'category',
    ANNOUNCEMENT = 'announcement',
    STAGE = 'stage',
    FORUM = 'forum',
    THREAD = 'thread',
    UNKNOWN = 'unknown',
}

export interface CreateChannelOptions {
    guildId: string;
    name: string;
    type?: ChannelType;
    topic?: string;
    parentId?: string;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    position?: number;
}

export interface EditChannelOptions {
    channelId: string;
    name?: string;
    topic?: string;
    nsfw?: boolean;
    rateLimitPerUser?: number;
    position?: number;
    parentId?: string | null;
}

// ─── Message ────────────────────────────────────────────────────

export interface DiscordMessage {
    id: string;
    channelId: string;
    guildId: string | null;
    author: {
        id: string;
        username: string;
        displayName: string;
        bot: boolean;
    };
    content: string;
    timestamp: string;
    editedTimestamp: string | null;
    attachments: { url: string; name: string; size: number }[];
    embeds: DiscordEmbed[];
    reactions: { emoji: string; count: number; me: boolean }[];
    replyTo: string | null;
    pinned: boolean;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string; iconUrl?: string };
    thumbnail?: { url: string };
    image?: { url: string };
    author?: { name: string; url?: string; iconUrl?: string };
    timestamp?: string;
}

export interface SendMessageOptions {
    channelId: string;
    content?: string;
    embeds?: DiscordEmbed[];
    replyToMessageId?: string;
}

export interface ReadMessagesOptions {
    channelId: string;
    limit?: number;
    before?: string;
    after?: string;
    around?: string;
}

export interface SearchMessagesOptions {
    guildId: string;
    query?: string;
    authorId?: string;
    channelId?: string;
    before?: string;
    after?: string;
    limit?: number;
}

// ─── Member / User ──────────────────────────────────────────────

export interface DiscordMember {
    userId: string;
    username: string;
    displayName: string;
    nickname: string | null;
    avatar: string | null;
    roles: { id: string; name: string; color: number }[];
    joinedAt: string;
    bot: boolean;
    status?: 'online' | 'idle' | 'dnd' | 'offline';
    premiumSince?: string | null;
    pending?: boolean;
    voiceState?: {
        channelId: string | null;
        selfMute: boolean;
        selfDeaf: boolean;
        serverMute: boolean;
        serverDeaf: boolean;
    } | null;
}

export interface DiscordUser {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
    bot: boolean;
    createdAt: string;
    banner: string | null;
}

// ─── Role ───────────────────────────────────────────────────────

export interface DiscordRole {
    id: string;
    name: string;
    color: number;
    position: number;
    permissions: string;
    mentionable: boolean;
    managed: boolean;
    memberCount?: number;
}

export interface CreateRoleOptions {
    guildId: string;
    name: string;
    color?: number;
    permissions?: string[];
    mentionable?: boolean;
    hoist?: boolean;
}

// ─── Moderation ─────────────────────────────────────────────────

export interface TimeoutOptions {
    guildId: string;
    userId: string;
    durationMs: number;
    reason?: string;
}

export interface BanOptions {
    guildId: string;
    userId: string;
    reason?: string;
    deleteMessageSeconds?: number;
}

export interface KickOptions {
    guildId: string;
    userId: string;
    reason?: string;
}

export interface Ban {
    userId: string;
    username: string;
    displayName: string;
    avatar: string | null;
    reason: string | null;
}

// ─── Audit Log ──────────────────────────────────────────────────

export interface AuditLogEntry {
    id: string;
    action: string;
    executorId: string | null;
    executorName: string | null;
    targetId: string | null;
    targetType: string | null;
    reason: string | null;
    createdAt: string;
    changes: { key: string; old?: string; new?: string }[];
}

// ─── Thread ─────────────────────────────────────────────────────

export interface CreateThreadOptions {
    channelId: string;
    name: string;
    messageId?: string;
    autoArchiveDuration?: 60 | 1440 | 4320 | 10080;
    reason?: string;
}

// ─── Invite ─────────────────────────────────────────────────────

export interface Invite {
    code: string;
    url: string;
    channelId: string | null;
    channelName: string | null;
    guildId: string | null;
    inviterId: string | null;
    inviterName: string | null;
    uses: number | null;
    maxUses: number | null;
    maxAge: number | null;
    temporary: boolean;
    createdAt: string | null;
    expiresAt: string | null;
    approximateMemberCount: number | null;
    approximatePresenceCount: number | null;
}

export interface CreateInviteOptions {
    channelId: string;
    maxUses?: number;
    maxAge?: number;
    temporary?: boolean;
    unique?: boolean;
}

// ─── Scheduled Events ───────────────────────────────────────────

export type EventStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
export type EventEntityType = 'STAGE_INSTANCE' | 'VOICE' | 'EXTERNAL';

export interface ScheduledEvent {
    id: string;
    guildId: string;
    channelId: string | null;
    creatorId: string | null;
    name: string;
    description: string | null;
    scheduledStartTime: string;
    scheduledEndTime: string | null;
    privacyLevel: 'GUILD_ONLY';
    status: EventStatus;
    entityType: EventEntityType;
    entityId: string | null;
    location: string | null;
    userCount: number;
    image: string | null;
}

// ─── Pagination ─────────────────────────────────────────────────

export interface PaginatedResult<T> {
    items: T[];
    total?: number;
    hasMore: boolean;
    cursor?: string;
    error?: string;
}

// ─── Channel Permissions ────────────────────────────────────────

export enum OverwriteType {
    ROLE = 'role',
    MEMBER = 'member',
}

export interface PermissionOverwrite {
    id: string;
    type: OverwriteType;
    allow: string[];
    deny: string[];
}

export interface ChannelPermissionsAudit {
    channelId: string;
    channelName: string;
    overwrites: PermissionOverwrite[];
}

// ─── Forum ──────────────────────────────────────────────────────

export interface ForumTag {
    id: string;
    name: string;
    moderated: boolean;
    emoji: { id: string | null; name: string | null } | null;
}

export interface ForumTagInput {
    name: string;
    emoji?: { id?: string | null; name?: string | null };
    moderated?: boolean;
}

export interface ForumPost {
    id: string;
    name: string;
    parentId: string | null;
    guildId: string | null;
    ownerId: string | null;
    archived: boolean;
    locked: boolean;
    appliedTagIds: string[];
    messageCount: number | null;
    createdAt: string | null;
    autoArchiveDuration: number | null;
}

export interface CreateForumPostOptions {
    channelId: string;
    name: string;
    content: string;
    tagIds?: string[];
    autoArchiveDuration?: 60 | 1440 | 4320 | 10080;
}

export interface UpdateForumPostOptions {
    postId: string;
    name?: string;
    archived?: boolean;
    locked?: boolean;
    appliedTagIds?: string[];
}

export interface ReplyToForumOptions {
    postId: string;
    content?: string;
    embeds?: DiscordEmbed[];
}

// ─── Membership Screening ───────────────────────────────────────

export interface ScreeningField {
    channelId: string;
    description: string;
    emojiName: string | null;
    emojiId: string | null;
}

export interface WelcomeScreen {
    description: string | null;
    welcomeChannels: ScreeningField[];
}

export interface UpdateWelcomeScreenOptions {
    guildId: string;
    enabled?: boolean;
    description?: string;
    welcomeChannels?: ScreeningField[];
}
