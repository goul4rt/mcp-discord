import { vi } from 'vitest';
import type { ReactionCapability } from '../../../providers/capabilities/reactions.js';

export function makeReactionStubs(): ReactionCapability {
    return {
        addReaction: vi.fn().mockResolvedValue(undefined),
        removeReaction: vi.fn().mockResolvedValue(undefined),
    };
}
