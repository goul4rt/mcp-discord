import { vi } from 'vitest';
import type { RoleCapability } from '../../../providers/capabilities/roles.js';

export function makeRoleStubs(): RoleCapability {
    return {
        listRoles: vi.fn().mockResolvedValue([]),
        createRole: vi.fn().mockResolvedValue({ id: 'r1' }),
        addRole: vi.fn().mockResolvedValue(undefined),
        removeRole: vi.fn().mockResolvedValue(undefined),
        editRole: vi.fn().mockResolvedValue({ id: 'r1' }),
        deleteRole: vi.fn().mockResolvedValue(undefined),
        getRoleMembers: vi.fn().mockResolvedValue([]),
        setRolePosition: vi.fn().mockResolvedValue(undefined),
        setRoleIcon: vi.fn().mockResolvedValue(undefined),
    };
}
