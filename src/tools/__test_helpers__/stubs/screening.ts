import { vi } from 'vitest';
import type { ScreeningCapability } from '../../../providers/capabilities/screening.js';

export function makeScreeningStubs(): ScreeningCapability {
    return {
        getWelcomeScreen: vi.fn().mockResolvedValue({ description: null, welcomeChannels: [] }),
        updateWelcomeScreen: vi.fn().mockResolvedValue({ description: null, welcomeChannels: [] }),
    };
}
