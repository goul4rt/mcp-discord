import type { UpdateWelcomeScreenOptions, WelcomeScreen } from '../../types/discord.js';

export interface ScreeningCapability {
    getWelcomeScreen(guildId: string): Promise<WelcomeScreen>;
    updateWelcomeScreen(options: UpdateWelcomeScreenOptions): Promise<WelcomeScreen>;
}
