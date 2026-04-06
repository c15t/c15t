import { describe, expect, it, vi } from 'vitest';

vi.mock('@c15t/react', () => ({
	ConsentManagerProvider: (props: unknown) => props,
}));

vi.mock('next/headers', () => ({
	headers: vi.fn(() => new Headers()),
}));

vi.mock('./utils/initial-data', () => ({
	getC15TInitialData: vi.fn(),
}));

import { ConsentManagerProvider } from './index';
import { getC15TInitialData } from './utils/initial-data';

describe('App Router ConsentManagerProvider', () => {
	it('awaits initial data before passing it into the client provider options', async () => {
		const initialData = {
			showConsentBanner: false,
			branding: 'c15t',
			jurisdiction: {
				code: 'NONE',
				message: 'No consent banner required',
			},
			location: {
				countryCode: 'US',
				regionCode: null,
			},
			translations: {
				language: 'en',
				translations: {
					common: {
						acceptAll: 'Accept All',
						rejectAll: 'Reject All',
						customize: 'Customize',
						save: 'Save',
					},
				},
			},
		};

		vi.mocked(getC15TInitialData).mockResolvedValue(initialData);

		const element = await ConsentManagerProvider({
			children: <div>child</div>,
			options: {
				mode: 'c15t',
				backendURL: '/api/c15t',
			},
		});

		expect(getC15TInitialData).toHaveBeenCalled();
		expect(element.props.options.store._initialData).toEqual(initialData);
	});
});
