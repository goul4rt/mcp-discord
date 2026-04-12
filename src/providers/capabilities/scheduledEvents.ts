import type { DiscordUser, EventEntityType, ScheduledEvent } from '../../types/discord.js';

export interface CreateScheduledEventOptions {
    guildId: string;
    name: string;
    entityType: EventEntityType;
    scheduledStartTime: string;
    scheduledEndTime?: string;
    description?: string;
    channelId?: string;
    location?: string;
    privacyLevel?: 'GUILD_ONLY';
}

export interface EditScheduledEventOptions {
    guildId: string;
    eventId: string;
    name?: string;
    entityType?: EventEntityType;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    description?: string;
    channelId?: string;
    location?: string;
    privacyLevel?: 'GUILD_ONLY';
}

export interface ScheduledEventInvite {
    code: string;
    url: string;
    eventId: string;
}

export interface ScheduledEventCapability {
    listScheduledEvents(guildId: string): Promise<ScheduledEvent[]>;
    getScheduledEvent(guildId: string, eventId: string): Promise<ScheduledEvent>;
    createScheduledEvent(options: CreateScheduledEventOptions): Promise<ScheduledEvent>;
    editScheduledEvent(options: EditScheduledEventOptions): Promise<ScheduledEvent>;
    deleteScheduledEvent(guildId: string, eventId: string): Promise<void>;
    getEventSubscribers(guildId: string, eventId: string, limit?: number): Promise<DiscordUser[]>;
    createEventInvite(guildId: string, eventId: string, channelId: string): Promise<ScheduledEventInvite>;
}
