import { vi } from 'vitest';

import type { DefaultComFormsSdkClient } from '../vendors/analytics/default-com';

export const createDefaultComFormsSdkMock = (
	overrides: Partial<DefaultComFormsSdkClient> = {}
): DefaultComFormsSdkClient => ({
	init: vi.fn(),
	on: vi.fn(() => vi.fn()),
	recordFormInteraction: vi.fn(async () => {}),
	scheduler: {
		display: vi.fn(() => vi.fn()),
		onClosed: vi.fn(() => vi.fn()),
		onDisplayed: vi.fn(() => vi.fn()),
		onMeetingBooked: vi.fn(() => vi.fn()),
		onMeetingCancelled: vi.fn(() => vi.fn()),
		onMeetingTimeout: vi.fn(() => vi.fn()),
	},
	setConsent: vi.fn(),
	submitForm: vi
		.fn<DefaultComFormsSdkClient['submitForm']>()
		.mockResolvedValue({ status: 200, success: true }),
	...overrides,
});
