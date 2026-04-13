/**
 * DiscordProvider — the core abstraction layer.
 *
 * Composed from per-feature capability interfaces in ./capabilities/.
 * Each capability covers one Discord domain (channels, messages, webhooks, etc.).
 *
 * Two implementations exist:
 *   1. IntegratedProvider — receives an existing discord.js Client from the host bot
 *   2. StandaloneProvider — creates its own connection using a bot token
 *
 * MCP tools NEVER touch discord.js directly — they only call this interface.
 */

import type { ServerCapability } from './capabilities/server.js';
import type { ChannelCapability } from './capabilities/channels.js';
import type { MessageCapability } from './capabilities/messages.js';
import type { ReactionCapability } from './capabilities/reactions.js';
import type { MemberCapability } from './capabilities/members.js';
import type { RoleCapability } from './capabilities/roles.js';
import type { ModerationCapability } from './capabilities/moderation.js';
import type { MonitoringCapability } from './capabilities/monitoring.js';
import type { PermissionCapability } from './capabilities/permissions.js';
import type { WebhookCapability } from './capabilities/webhooks.js';
import type { ForumCapability } from './capabilities/forums.js';
import type { InviteCapability } from './capabilities/invites.js';
import type { DMCapability } from './capabilities/dms.js';
import type { ScheduledEventCapability } from './capabilities/scheduledEvents.js';
import type { ScreeningCapability } from './capabilities/screening.js';

export interface DiscordProvider extends
    ServerCapability,
    ChannelCapability,
    MessageCapability,
    ReactionCapability,
    MemberCapability,
    RoleCapability,
    ModerationCapability,
    MonitoringCapability,
    PermissionCapability,
    WebhookCapability,
    ForumCapability,
    InviteCapability,
    DMCapability,
    ScheduledEventCapability,
    ScreeningCapability {
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
