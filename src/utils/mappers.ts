/**
 * Mappers — convert discord.js objects into our provider-agnostic types.
 *
 * These functions are used by both IntegratedProvider and StandaloneProvider
 * (when in gateway mode) to normalize discord.js cache objects into the
 * flat, serializable shapes that MCP tools consume.
 */

import {
    ChannelType as DjsChannelType,
    type Guild,
    type GuildBasedChannel,
    type GuildForumTag,
    type GuildMember,
    type Message,
    type Role,
    type ThreadChannel,
    type User,
} from 'discord.js';

import {
    ChannelType,
    type DiscordChannel,
    type DiscordChannelSummary,
    type DiscordGuild,
    type DiscordGuildDetailed,
    type DiscordMember,
    type DiscordMessage,
    type DiscordRole,
    type DiscordUser,
    type ForumPost,
    type ForumTag,
} from '../types/discord.js';

// ─── Channel Type Mapping ───────────────────────────────────────

export function mapChannelType(type: DjsChannelType | number): ChannelType {
    switch (type) {
        case DjsChannelType.GuildText:
            return ChannelType.TEXT;
        case DjsChannelType.GuildVoice:
            return ChannelType.VOICE;
        case DjsChannelType.GuildCategory:
            return ChannelType.CATEGORY;
        case DjsChannelType.GuildAnnouncement:
            return ChannelType.ANNOUNCEMENT;
        case DjsChannelType.GuildStageVoice:
            return ChannelType.STAGE;
        case DjsChannelType.GuildForum:
            return ChannelType.FORUM;
        case DjsChannelType.PublicThread:
        case DjsChannelType.PrivateThread:
        case DjsChannelType.AnnouncementThread:
            return ChannelType.THREAD;
        default:
            return ChannelType.UNKNOWN;
    }
}

// ─── Guild ──────────────────────────────────────────────────────

export function mapGuild(guild: Guild): DiscordGuild {
    return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        description: guild.description,
        createdAt: guild.createdAt.toISOString(),
        features: guild.features,
    };
}

export function mapGuildDetailed(guild: Guild): DiscordGuildDetailed {
    return {
        ...mapGuild(guild),
        roles: guild.roles.cache.map(r => mapRole(r)),
        channels: guild.channels.cache.map(c => mapChannelSummary(c)),
        emojis: guild.emojis.cache.map(e => ({
            id: e.id ?? '',
            name: e.name ?? '',
            animated: e.animated ?? false,
        })),
        boostLevel: guild.premiumTier,
        boostCount: guild.premiumSubscriptionCount ?? 0,
    };
}

// ─── Channel ────────────────────────────────────────────────────

export function mapChannelSummary(channel: GuildBasedChannel): DiscordChannelSummary {
    return {
        id: channel.id,
        name: channel.name,
        type: mapChannelType(channel.type),
        parentId: channel.parentId,
        parentName: channel.parent?.name ?? null,
        position: 'position' in channel ? (channel as any).position : 0,
        topic: 'topic' in channel ? (channel as any).topic ?? null : null,
    };
}

export function mapChannel(channel: GuildBasedChannel): DiscordChannel {
    return {
        ...mapChannelSummary(channel),
        guildId: channel.guildId,
        nsfw: 'nsfw' in channel ? (channel as any).nsfw ?? false : false,
        rateLimitPerUser: 'rateLimitPerUser' in channel ? (channel as any).rateLimitPerUser ?? 0 : 0,
        createdAt: channel.createdAt?.toISOString() ?? new Date().toISOString(),
    };
}

// ─── Message ────────────────────────────────────────────────────

export function mapMessage(message: Message): DiscordMessage {
    return {
        id: message.id,
        channelId: message.channelId,
        guildId: message.guildId,
        author: {
            id: message.author.id,
            username: message.author.username,
            displayName: message.author.displayName,
            bot: message.author.bot,
        },
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        editedTimestamp: message.editedAt?.toISOString() ?? null,
        attachments: message.attachments.map(a => ({
            url: a.url,
            name: a.name,
            size: a.size,
        })),
        embeds: message.embeds.map(e => ({
            title: e.title ?? undefined,
            description: e.description ?? undefined,
            url: e.url ?? undefined,
            color: e.color ?? undefined,
            fields: e.fields.map(f => ({
                name: f.name,
                value: f.value,
                inline: f.inline,
            })),
            footer: e.footer ? { text: e.footer.text, iconUrl: e.footer.iconURL ?? undefined } : undefined,
            thumbnail: e.thumbnail ? { url: e.thumbnail.url } : undefined,
            image: e.image ? { url: e.image.url } : undefined,
            author: e.author ? { name: e.author.name, url: e.author.url ?? undefined, iconUrl: e.author.iconURL ?? undefined } : undefined,
            timestamp: e.timestamp ?? undefined,
        })),
        reactions: message.reactions.cache.map(r => ({
            emoji: r.emoji.toString(),
            count: r.count,
            me: r.me,
        })),
        replyTo: message.reference?.messageId ?? null,
        pinned: message.pinned,
    };
}

// ─── Member / User ──────────────────────────────────────────────

export function mapMember(member: GuildMember): DiscordMember {
    return {
        userId: member.id,
        username: member.user.username,
        displayName: member.user.displayName,
        nickname: member.nickname,
        avatar: member.displayAvatarURL(),
        roles: member.roles.cache.map(r => ({
            id: r.id,
            name: r.name,
            color: r.color,
        })),
        joinedAt: member.joinedAt?.toISOString() ?? '',
        bot: member.user.bot,
        status: member.presence?.status as any ?? 'offline',
    };
}

export function mapUser(user: User): DiscordUser {
    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatarURL(),
        bot: user.bot,
        createdAt: user.createdAt.toISOString(),
        banner: user.bannerURL() ?? null,
    };
}

// ─── Role ───────────────────────────────────────────────────────

export function mapRole(role: Role): DiscordRole {
    return {
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        managed: role.managed,
        memberCount: role.members.size,
    };
}

// ─── API Message ────────────────────────────────────

/**
 * Map a raw Discord REST API message object to our DiscordMessage type.
 * Used by StandaloneProvider when not using gateway/cache.
 */
export function mapApiMessage(msg: any, fallbackGuildId?: string): DiscordMessage {
    return {
        id: msg.id,
        channelId: msg.channel_id,
        guildId: msg.guild_id ?? fallbackGuildId ?? null,
        author: {
            id: msg.author.id,
            username: msg.author.username,
            displayName: msg.author.global_name ?? msg.author.username,
            bot: msg.author.bot ?? false,
        },
        content: msg.content,
        timestamp: msg.timestamp,
        editedTimestamp: msg.edited_timestamp ?? null,
        attachments: (msg.attachments ?? []).map((a: any) => ({
            url: a.url,
            name: a.filename ?? a.name ?? 'unknown',
            size: a.size ?? 0,
        })),
        embeds: (msg.embeds ?? []).map((e: any) => ({
            title: e.title,
            description: e.description,
            url: e.url,
            color: e.color,
            fields: e.fields?.map((f: any) => ({ name: f.name, value: f.value, inline: f.inline })),
            footer: e.footer ? { text: e.footer.text, iconUrl: e.footer.icon_url } : undefined,
            thumbnail: e.thumbnail ? { url: e.thumbnail.url } : undefined,
            image: e.image ? { url: e.image.url } : undefined,
            author: e.author ? { name: e.author.name, url: e.author.url, iconUrl: e.author.icon_url } : undefined,
            timestamp: e.timestamp,
        })),
        reactions: (msg.reactions ?? []).map((r: any) => ({
            emoji: r.emoji.name ?? r.emoji.id ?? '',
            count: r.count ?? 0,
            me: r.me ?? false,
        })),
        replyTo: msg.message_reference?.message_id ?? null,
        pinned: msg.pinned ?? false,
    };
}

// ─── Forum ──────────────────────────────────────────────────────

export function mapForumTag(tag: GuildForumTag): ForumTag {
    return {
        id: tag.id,
        name: tag.name,
        moderated: tag.moderated,
        emoji: tag.emoji ? { id: tag.emoji.id, name: tag.emoji.name } : null,
    };
}

export function mapApiForumTag(tag: any): ForumTag {
    return {
        id: tag.id,
        name: tag.name,
        moderated: tag.moderated ?? false,
        emoji: tag.emoji_id || tag.emoji_name
            ? { id: tag.emoji_id ?? null, name: tag.emoji_name ?? null }
            : null,
    };
}

export function mapForumPost(thread: ThreadChannel): ForumPost {
    return {
        id: thread.id,
        name: thread.name,
        parentId: thread.parentId,
        guildId: thread.guildId ?? null,
        ownerId: thread.ownerId ?? null,
        archived: thread.archived ?? false,
        locked: thread.locked ?? false,
        appliedTagIds: thread.appliedTags ?? [],
        messageCount: thread.messageCount ?? null,
        createdAt: thread.createdAt?.toISOString() ?? null,
        autoArchiveDuration: thread.autoArchiveDuration ?? null,
    };
}

export function mapApiForumPost(thread: any, fallbackGuildId?: string): ForumPost {
    const metadata = thread.thread_metadata ?? {};
    return {
        id: thread.id,
        name: thread.name,
        parentId: thread.parent_id ?? null,
        guildId: thread.guild_id ?? fallbackGuildId ?? null,
        ownerId: thread.owner_id ?? null,
        archived: metadata.archived ?? false,
        locked: metadata.locked ?? false,
        appliedTagIds: thread.applied_tags ?? [],
        messageCount: thread.message_count ?? null,
        createdAt: metadata.create_timestamp
            ?? new Date(Number(BigInt(thread.id) >> 22n) + 1420070400000).toISOString(),
        autoArchiveDuration: metadata.auto_archive_duration ?? null,
    };
}
