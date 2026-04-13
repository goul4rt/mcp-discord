import type { BanOptions, KickOptions, TimeoutOptions } from '../../types/discord.js';

export interface ModerationCapability {
    timeoutUser(options: TimeoutOptions): Promise<void>;
    kickUser(options: KickOptions): Promise<void>;
    banUser(options: BanOptions): Promise<void>;
    unbanUser(guildId: string, userId: string, reason?: string): Promise<void>;
}
