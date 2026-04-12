import { vi } from 'vitest';
import type { PermissionCapability } from '../../../providers/capabilities/permissions.js';

export function makePermissionStubs(): PermissionCapability {
    return {
        getChannelPermissions: vi.fn().mockResolvedValue([]),
        setRolePermission: vi.fn().mockResolvedValue(undefined),
        setMemberPermission: vi.fn().mockResolvedValue(undefined),
        resetChannelPermissions: vi.fn().mockResolvedValue(undefined),
        copyPermissions: vi.fn().mockResolvedValue(undefined),
        auditPermissions: vi.fn().mockResolvedValue([]),
    };
}
