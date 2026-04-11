import { vi } from 'vitest';
import type { MemberCapability } from '../../../providers/capabilities/members.js';

export function makeMemberStubs(): MemberCapability {
    return {
        listMembers: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
        getMember: vi.fn().mockResolvedValue({}),
        getUser: vi.fn().mockResolvedValue({}),
        searchMembers: vi.fn().mockResolvedValue([]),
    };
}
