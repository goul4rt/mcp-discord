import { vi } from 'vitest';
import type { ChannelCapability } from '../../../providers/capabilities/channels.js';

export function makeChannelStubs(): ChannelCapability {
    return {
        getChannels: vi.fn().mockResolvedValue([]),
        getChannel: vi.fn().mockResolvedValue({}),
        createChannel: vi.fn().mockResolvedValue({ id: 'ch1' }),
        editChannel: vi.fn().mockResolvedValue({ id: 'ch1' }),
        deleteChannel: vi.fn().mockResolvedValue(undefined),
        createThread: vi.fn().mockResolvedValue({ id: 'th1' }),
        archiveThread: vi.fn().mockResolvedValue(undefined),
    };
}
