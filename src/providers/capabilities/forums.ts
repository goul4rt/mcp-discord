import type {
    CreateForumPostOptions,
    DiscordChannelSummary,
    DiscordMessage,
    ForumPost,
    ForumTag,
    ForumTagInput,
    ReplyToForumOptions,
    UpdateForumPostOptions,
} from '../../types/discord.js';

export interface ForumCapability {
    getForumChannels(guildId: string): Promise<DiscordChannelSummary[]>;
    createForumPost(options: CreateForumPostOptions): Promise<ForumPost>;
    getForumPost(postId: string): Promise<ForumPost>;
    listForumThreads(channelId: string, archived?: boolean, limit?: number): Promise<ForumPost[]>;
    deleteForumPost(postId: string, reason?: string): Promise<void>;
    getForumTags(channelId: string): Promise<ForumTag[]>;
    setForumTags(channelId: string, tags: ForumTagInput[]): Promise<ForumTag[]>;
    updateForumPost(options: UpdateForumPostOptions): Promise<ForumPost>;
    replyToForum(options: ReplyToForumOptions): Promise<DiscordMessage>;
}
