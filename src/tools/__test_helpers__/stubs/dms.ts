import { vi } from 'vitest';
import type { DMCapability } from '../../../providers/capabilities/dms.js';

export function makeDMStubs(): DMCapability {
    return {
        sendDM: vi.fn().mockResolvedValue({ id: 'msg1' }),
    };
}
