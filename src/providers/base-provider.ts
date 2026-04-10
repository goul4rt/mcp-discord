/**
 * BaseProvider — shared logic extracted from both providers.
 *
 * Contains default implementations for methods that don't depend
 * on whether the connection is integrated or standalone.
 */

import type { DiscordProvider } from './discord-provider.js';
import type { DiscordMessage, PaginatedResult, SearchMessagesOptions } from '../types/discord.js';

/**
 * Mixin that provides default implementations for methods
 * that can be built on top of other provider methods.
 *
 * Usage: call these from your provider implementation when
 * the logic would be identical.
 */
export const ProviderDefaults = {
    /**
     * Default checkMentions implementation using searchMessages.
     */
    async checkMentions(
        provider: DiscordProvider,
        guildId: string,
        userId?: string,
        limit = 25
    ): Promise<DiscordMessage[]> {
        const targetId = userId ?? provider.getBotUserId();
        const result = await provider.searchMessages({
            guildId,
            query: `<@${targetId}>`,
            limit,
        });
        return result.items;
    },

    /**
     * Default searchMessages via REST (works with any REST instance).
     * Both providers can delegate to this when using REST-based search.
     */
    async searchMessagesViaRest(
        restGet: (path: string, options?: any) => Promise<unknown>,
        options: SearchMessagesOptions
    ): Promise<PaginatedResult<DiscordMessage>> {
        const query = new URLSearchParams();
        if (options.query) query.set('content', options.query);
        if (options.authorId) query.set('author_id', options.authorId);
        if (options.channelId) query.set('channel_id', options.channelId);
        if (options.before) query.set('max_id', options.before);
        if (options.after) query.set('min_id', options.after);
        query.set('limit', String(options.limit ?? 25));

        try {
            // Need to import mapApiMessage dynamically to avoid circular deps
            const { mapApiMessage } = await import('../utils/mappers.js');

            const result = (await restGet(`/guilds/${options.guildId}/messages/search?${query.toString()}`)) as any;
            const messages: DiscordMessage[] = (result.messages ?? [])
                .flat()
                .map((msg: any) => mapApiMessage(msg, options.guildId));

            return {
                items: messages,
                total: result.total_results,
                hasMore: messages.length === (options.limit ?? 25),
            };
        } catch (err: any) {
            const errorMsg = err?.message ?? String(err);
            console.error(`[discord-mcp] searchMessages failed: ${errorMsg}`);
            return { items: [], hasMore: false, error: errorMsg };
        }
    },
};
