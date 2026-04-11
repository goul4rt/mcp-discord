/**
 * Mappers — convert discord.js objects into our provider-agnostic types.
 *
 * These functions are used by both IntegratedProvider and StandaloneProvider
 * (when in gateway mode) to normalize discord.js cache objects into the
 * flat, serializable shapes that MCP tools consume.
 */

import {
    ChannelType as DjsChannelType,
    PermissionFlagsBits,
    type Guild,
    type GuildBasedChannel,
    type GuildMember,
    type Message,
    type PermissionOverwrites,
    type Role,
    type User,
} from 'discord.js';

import {
    ChannelType,
    OverwriteType,
    type DiscordChannel,
    type DiscordChannelSummary,
    type DiscordGuild,
    type DiscordGuildDetailed,
    type DiscordMember,
    type DiscordMessage,
    type DiscordRole,
    type DiscordUser,
    type PermissionOverwrite,
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

// ─── Channel Permissions ────────────────────────────────────────

// Discord API exposes permissions as SCREAMING_SNAKE_CASE in the MCP schema
// but discord.js uses PascalCase keys on PermissionFlagsBits. We keep an
// explicit lookup so irregular names (SendTTSMessages, UseVAD) round-trip
// correctly without ad-hoc string conversion.
const PERMISSION_NAME_TO_BIT: Record<string, bigint> = {
    CREATE_INSTANT_INVITE: PermissionFlagsBits.CreateInstantInvite,
    KICK_MEMBERS: PermissionFlagsBits.KickMembers,
    BAN_MEMBERS: PermissionFlagsBits.BanMembers,
    ADMINISTRATOR: PermissionFlagsBits.Administrator,
    MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
    MANAGE_GUILD: PermissionFlagsBits.ManageGuild,
    ADD_REACTIONS: PermissionFlagsBits.AddReactions,
    VIEW_AUDIT_LOG: PermissionFlagsBits.ViewAuditLog,
    PRIORITY_SPEAKER: PermissionFlagsBits.PrioritySpeaker,
    STREAM: PermissionFlagsBits.Stream,
    VIEW_CHANNEL: PermissionFlagsBits.ViewChannel,
    SEND_MESSAGES: PermissionFlagsBits.SendMessages,
    SEND_TTS_MESSAGES: PermissionFlagsBits.SendTTSMessages,
    MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
    EMBED_LINKS: PermissionFlagsBits.EmbedLinks,
    ATTACH_FILES: PermissionFlagsBits.AttachFiles,
    READ_MESSAGE_HISTORY: PermissionFlagsBits.ReadMessageHistory,
    MENTION_EVERYONE: PermissionFlagsBits.MentionEveryone,
    USE_EXTERNAL_EMOJIS: PermissionFlagsBits.UseExternalEmojis,
    VIEW_GUILD_INSIGHTS: PermissionFlagsBits.ViewGuildInsights,
    CONNECT: PermissionFlagsBits.Connect,
    SPEAK: PermissionFlagsBits.Speak,
    MUTE_MEMBERS: PermissionFlagsBits.MuteMembers,
    DEAFEN_MEMBERS: PermissionFlagsBits.DeafenMembers,
    MOVE_MEMBERS: PermissionFlagsBits.MoveMembers,
    USE_VAD: PermissionFlagsBits.UseVAD,
    CHANGE_NICKNAME: PermissionFlagsBits.ChangeNickname,
    MANAGE_NICKNAMES: PermissionFlagsBits.ManageNicknames,
    MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
    MANAGE_WEBHOOKS: PermissionFlagsBits.ManageWebhooks,
    MANAGE_GUILD_EXPRESSIONS: PermissionFlagsBits.ManageGuildExpressions,
    USE_APPLICATION_COMMANDS: PermissionFlagsBits.UseApplicationCommands,
    REQUEST_TO_SPEAK: PermissionFlagsBits.RequestToSpeak,
    MANAGE_EVENTS: PermissionFlagsBits.ManageEvents,
    MANAGE_THREADS: PermissionFlagsBits.ManageThreads,
    CREATE_PUBLIC_THREADS: PermissionFlagsBits.CreatePublicThreads,
    CREATE_PRIVATE_THREADS: PermissionFlagsBits.CreatePrivateThreads,
    USE_EXTERNAL_STICKERS: PermissionFlagsBits.UseExternalStickers,
    SEND_MESSAGES_IN_THREADS: PermissionFlagsBits.SendMessagesInThreads,
    USE_EMBEDDED_ACTIVITIES: PermissionFlagsBits.UseEmbeddedActivities,
    MODERATE_MEMBERS: PermissionFlagsBits.ModerateMembers,
    VIEW_CREATOR_MONETIZATION_ANALYTICS: PermissionFlagsBits.ViewCreatorMonetizationAnalytics,
    USE_SOUNDBOARD: PermissionFlagsBits.UseSoundboard,
    CREATE_GUILD_EXPRESSIONS: PermissionFlagsBits.CreateGuildExpressions,
    CREATE_EVENTS: PermissionFlagsBits.CreateEvents,
    USE_EXTERNAL_SOUNDS: PermissionFlagsBits.UseExternalSounds,
    SEND_VOICE_MESSAGES: PermissionFlagsBits.SendVoiceMessages,
    SEND_POLLS: PermissionFlagsBits.SendPolls,
    USE_EXTERNAL_APPS: PermissionFlagsBits.UseExternalApps,
};

const BIT_TO_PERMISSION_NAME: Array<{ bit: bigint; name: string }> = Object.entries(
    PERMISSION_NAME_TO_BIT,
).map(([name, bit]) => ({ bit, name }));

export function permissionNamesToBitfield(names: string[]): string {
    let bits = 0n;
    for (const name of names) {
        const bit = PERMISSION_NAME_TO_BIT[name];
        if (bit === undefined) {
            throw new Error(`Unknown permission flag: ${name}`);
        }
        bits |= bit;
    }
    return bits.toString();
}

export function bitfieldToPermissionNames(bitfield: string | bigint): string[] {
    const bits = typeof bitfield === 'bigint' ? bitfield : BigInt(bitfield);
    const names: string[] = [];
    for (const { bit, name } of BIT_TO_PERMISSION_NAME) {
        if ((bits & bit) === bit) names.push(name);
    }
    return names;
}

export function mapPermissionOverwrite(overwrite: PermissionOverwrites): PermissionOverwrite {
    return {
        id: overwrite.id,
        type: overwrite.type === 0 ? OverwriteType.ROLE : OverwriteType.MEMBER,
        allow: bitfieldToPermissionNames(overwrite.allow.bitfield),
        deny: bitfieldToPermissionNames(overwrite.deny.bitfield),
    };
}

export function mapApiPermissionOverwrite(raw: any): PermissionOverwrite {
    return {
        id: raw.id,
        type: Number(raw.type) === 0 ? OverwriteType.ROLE : OverwriteType.MEMBER,
        allow: bitfieldToPermissionNames(String(raw.allow ?? '0')),
        deny: bitfieldToPermissionNames(String(raw.deny ?? '0')),
    };
}
