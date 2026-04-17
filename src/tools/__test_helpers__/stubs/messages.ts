import { vi } from 'vitest';
import type { MessageCapability } from '../../../providers/capabilities/messages.js';

export function makeMessageStubs(): MessageCapability {
    return {
        sendMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
        readMessages: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
        getMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
        editMessage: vi.fn().mockResolvedValue({ id: 'm1' }),
        deleteMessage: vi.fn().mockResolvedValue(undefined),
        deleteMessagesBulk: vi.fn().mockResolvedValue(2),
        pinMessage: vi.fn().mockResolvedValue(undefined),
        unpinMessage: vi.fn().mockResolvedValue(undefined),
        searchMessages: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
    };
}
