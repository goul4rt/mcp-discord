import type { CreateInviteOptions, Invite } from '../../types/discord.js';

export interface InviteCapability {
    listInvites(guildId: string): Promise<Invite[]>;
    listChannelInvites(channelId: string): Promise<Invite[]>;
    getInvite(code: string): Promise<Invite>;
    createInvite(options: CreateInviteOptions): Promise<Invite>;
    deleteInvite(code: string, reason?: string): Promise<void>;
}
