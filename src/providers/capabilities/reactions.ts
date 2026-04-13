export interface ReactionCapability {
    addReaction(channelId: string, messageId: string, emoji: string): Promise<void>;
    removeReaction(channelId: string, messageId: string, emoji: string, userId?: string): Promise<void>;
}
