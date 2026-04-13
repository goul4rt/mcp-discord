import { vi } from 'vitest';
import type { ForumCapability } from '../../../providers/capabilities/forums.js';

export function makeForumStubs(): ForumCapability {
    return {
        getForumChannels: vi.fn().mockResolvedValue([]),
        createForumPost: vi.fn().mockResolvedValue({ id: 'p1' }),
        getForumPost: vi.fn().mockResolvedValue({ id: 'p1' }),
        listForumThreads: vi.fn().mockResolvedValue([]),
        deleteForumPost: vi.fn().mockResolvedValue(undefined),
        getForumTags: vi.fn().mockResolvedValue([]),
        setForumTags: vi.fn().mockResolvedValue([]),
        updateForumPost: vi.fn().mockResolvedValue({ id: 'p1' }),
        replyToForum: vi.fn().mockResolvedValue({ id: 'm1' }),
    };
}
