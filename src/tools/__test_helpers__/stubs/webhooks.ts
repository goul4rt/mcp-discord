import { vi } from 'vitest';
import type { WebhookCapability } from '../../../providers/capabilities/webhooks.js';

export function makeWebhookStubs(): WebhookCapability {
    return {
        createWebhook: vi.fn().mockResolvedValue({ id: 'wh1' }),
        listWebhooks: vi.fn().mockResolvedValue([]),
        editWebhook: vi.fn().mockResolvedValue({ id: 'wh1' }),
        deleteWebhook: vi.fn().mockResolvedValue(undefined),
        sendWebhookMessage: vi.fn().mockResolvedValue({ id: 'msg1' }),
        editWebhookMessage: vi.fn().mockResolvedValue({ id: 'msg1' }),
        deleteWebhookMessage: vi.fn().mockResolvedValue(undefined),
        fetchWebhookMessage: vi.fn().mockResolvedValue({ id: 'msg1' }),
    };
}
