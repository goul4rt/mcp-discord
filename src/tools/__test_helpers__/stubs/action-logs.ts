import { vi } from 'vitest';
import type { ActionLogCapability } from '../../../providers/capabilities/action-logs.js';

export function makeActionLogStubs(): ActionLogCapability {
    return {
        getActionLogConfig: vi.fn().mockResolvedValue({
            enabled: false,
            mode: 'single',
            singleChannelId: null,
            events: {},
            ignoredChannelIds: [],
            ignoredRoleIds: [],
            ignoreBots: true,
        }),
        setActionLogEnabled: vi.fn().mockResolvedValue({
            enabled: true,
            mode: 'single',
            singleChannelId: null,
            events: {},
            ignoredChannelIds: [],
            ignoredRoleIds: [],
            ignoreBots: true,
        }),
        setActionLogMode: vi.fn().mockResolvedValue({
            enabled: false,
            mode: 'per-event',
            singleChannelId: null,
            events: {},
            ignoredChannelIds: [],
            ignoredRoleIds: [],
            ignoreBots: true,
        }),
        setEventLogChannel: vi.fn().mockResolvedValue({
            enabled: false,
            mode: 'single',
            singleChannelId: '123456789',
            events: {},
            ignoredChannelIds: [],
            ignoredRoleIds: [],
            ignoreBots: true,
        }),
        setEventLogEnabled: vi.fn().mockResolvedValue({
            enabled: false,
            mode: 'single',
            singleChannelId: null,
            events: { messageDelete: { enabled: true, channelId: null } },
            ignoredChannelIds: [],
            ignoredRoleIds: [],
            ignoreBots: true,
        }),
        updateLogFilters: vi.fn().mockResolvedValue({
            enabled: false,
            mode: 'single',
            singleChannelId: null,
            events: {},
            ignoredChannelIds: ['111111111'],
            ignoredRoleIds: ['222222222'],
            ignoreBots: false,
        }),
    };
}
