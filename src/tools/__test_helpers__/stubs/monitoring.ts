import { vi } from 'vitest';
import type { MonitoringCapability } from '../../../providers/capabilities/monitoring.js';

export function makeMonitoringStubs(): MonitoringCapability {
    return {
        getAuditLog: vi.fn().mockResolvedValue([]),
        checkMentions: vi.fn().mockResolvedValue([]),
    };
}
