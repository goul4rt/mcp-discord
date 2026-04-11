import { vi } from 'vitest';
import type { RoleCapability } from '../../../providers/capabilities/roles.js';

export function makeRoleStubs(): RoleCapability {
    return {
        listRoles: vi.fn().mockResolvedValue([]),
        createRole: vi.fn().mockResolvedValue({ id: 'r1' }),
        addRole: vi.fn().mockResolvedValue(undefined),
        removeRole: vi.fn().mockResolvedValue(undefined),
    };
}
