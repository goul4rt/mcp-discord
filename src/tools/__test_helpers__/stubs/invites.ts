import { vi } from 'vitest';
import type { InviteCapability } from '../../../providers/capabilities/invites.js';

export function makeInviteStubs(): InviteCapability {
    return {
        listInvites: vi.fn().mockResolvedValue([]),
        listChannelInvites: vi.fn().mockResolvedValue([]),
        getInvite: vi.fn().mockResolvedValue({ code: 'abc' }),
        createInvite: vi.fn().mockResolvedValue({ code: 'abc' }),
        deleteInvite: vi.fn().mockResolvedValue(undefined),
    };
}
