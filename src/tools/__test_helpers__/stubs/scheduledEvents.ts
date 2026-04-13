import { vi } from 'vitest';
import type { ScheduledEventCapability } from '../../../providers/capabilities/scheduledEvents.js';

export function makeScheduledEventStubs(): ScheduledEventCapability {
    return {
        listScheduledEvents: vi.fn().mockResolvedValue([]),
        getScheduledEvent: vi.fn().mockResolvedValue({ id: 'ev1' }),
        createScheduledEvent: vi.fn().mockResolvedValue({ id: 'ev1' }),
        editScheduledEvent: vi.fn().mockResolvedValue({ id: 'ev1' }),
        deleteScheduledEvent: vi.fn().mockResolvedValue(undefined),
        getEventSubscribers: vi.fn().mockResolvedValue([]),
        createEventInvite: vi.fn().mockResolvedValue({ code: 'abc', url: 'https://discord.gg/abc?event=ev1', eventId: 'ev1' }),
    };
}
