import { vi } from 'vitest';
import type { ReactionRolesCapability } from '../../../providers/capabilities/reaction-roles.js';

export function makeReactionRoleStubs(): ReactionRolesCapability {
    return {
        getReactionRolesConfig: vi.fn().mockResolvedValue({
            enabled: false,
            panels: [],
        }),
        setReactionRolesEnabled: vi.fn().mockResolvedValue({
            enabled: true,
            panels: [],
        }),
        createReactionRolePanel: vi.fn().mockResolvedValue({
            id: 'panel-123',
            name: 'Test Panel',
            enabled: true,
            channelId: '111111111',
            buttons: [
                {
                    id: 'btn-1',
                    label: 'Role 1',
                    roleId: '222222222',
                    style: 'primary',
                },
            ],
            mode: 'standard',
            allowMultiple: true,
        }),
        updateReactionRolePanel: vi.fn().mockResolvedValue({
            id: 'panel-123',
            name: 'Updated Panel',
            enabled: true,
            channelId: '111111111',
            buttons: [],
            mode: 'standard',
            allowMultiple: true,
        }),
        deleteReactionRolePanel: vi.fn().mockResolvedValue(undefined),
        deployReactionRolePanel: vi.fn().mockResolvedValue({
            messageId: '333333333',
        }),
        addPanelButton: vi.fn().mockResolvedValue({
            id: 'panel-123',
            name: 'Test Panel',
            enabled: true,
            channelId: '111111111',
            buttons: [
                {
                    id: 'btn-2',
                    label: 'New Button',
                    roleId: '444444444',
                    style: 'secondary',
                },
            ],
            mode: 'standard',
            allowMultiple: true,
        }),
        removePanelButton: vi.fn().mockResolvedValue({
            id: 'panel-123',
            name: 'Test Panel',
            enabled: true,
            channelId: '111111111',
            buttons: [],
            mode: 'standard',
            allowMultiple: true,
        }),
    };
}
