import { vi } from 'vitest';
import type { MemberCapability } from '../../../providers/capabilities/members.js';

export function makeMemberStubs(): MemberCapability {
    return {
        listMembers: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
        getMember: vi.fn().mockResolvedValue({}),
        getUser: vi.fn().mockResolvedValue({}),
        searchMembers: vi.fn().mockResolvedValue([]),
        setNickname: vi.fn().mockResolvedValue(undefined),
        bulkBan: vi.fn().mockResolvedValue({ bannedCount: 0, failed: [] }),
        listBans: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
        pruneMembers: vi.fn().mockResolvedValue({ prunedCount: 0, dryRun: false }),
        getMemberInfo: vi.fn().mockResolvedValue({}),
    };
}
