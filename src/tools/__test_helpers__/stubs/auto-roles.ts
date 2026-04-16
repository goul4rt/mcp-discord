import { vi } from 'vitest';
import type { AutoRolesCapability } from '../../../providers/capabilities/auto-roles.js';

export function makeAutoRoleStubs(): AutoRolesCapability {
    return {
        getAutoRolesConfig: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: [],
            botRoles: [],
        }),
        setAutoRolesEnabled: vi.fn().mockResolvedValue({
            enabled: true,
            memberRoles: [],
            botRoles: [],
        }),
        setMemberRoles: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: ['111111111', '222222222'],
            botRoles: [],
        }),
        setBotRoles: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: [],
            botRoles: ['333333333'],
        }),
        addMemberRole: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: ['111111111'],
            botRoles: [],
        }),
        addBotRole: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: [],
            botRoles: ['333333333'],
        }),
        removeMemberRole: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: [],
            botRoles: [],
        }),
        removeBotRole: vi.fn().mockResolvedValue({
            enabled: false,
            memberRoles: [],
            botRoles: [],
        }),
    };
}
