import { describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { offline } from '~/transports/offline';

import { useConsentTextDirection } from '../use-consent-text-direction';

const createWrapper = function createWrapper(
	options: Partial<ConsentProviderOptions> = {}
) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<ConsentProvider
				options={{ mode: offline(), persistence: false, ...options }}
			>
				{children}
			</ConsentProvider>
		);
	};
};

describe('useConsentTextDirection', () => {
	test('is left-to-right for the default language', async () => {
		const { result } = await renderHook(() => useConsentTextDirection(), {
			wrapper: createWrapper(),
		});

		expect(result.current).toBe('ltr');
	});

	test('is right-to-left when the copy is in Hebrew', async () => {
		const { result } = await renderHook(() => useConsentTextDirection(), {
			wrapper: createWrapper({
				i18n: {
					detectBrowserLanguage: false,
					locale: 'he',
					messages: { he: { common: { acceptAll: 'קבל הכל' } } },
				},
			}),
		});

		expect(result.current).toBe('rtl');
	});
});
