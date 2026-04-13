import { vi } from 'vitest';
import type { ModerationCapability } from '../../../providers/capabilities/moderation.js';

export function makeModerationStubs(): ModerationCapability {
    return {
        timeoutUser: vi.fn().mockResolvedValue(undefined),
        kickUser: vi.fn().mockResolvedValue(undefined),
        banUser: vi.fn().mockResolvedValue(undefined),
        unbanUser: vi.fn().mockResolvedValue(undefined),
    };
}
