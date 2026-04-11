import { vi } from 'vitest';
import type { ServerCapability } from '../../../providers/capabilities/server.js';

export function makeServerStubs(): ServerCapability {
    return {
        listGuilds: vi.fn().mockResolvedValue([]),
        getGuild: vi.fn().mockResolvedValue({}),
    };
}
