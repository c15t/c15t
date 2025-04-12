import { renderHook } from 'vitest-browser-react';
import { describe, expect, test } from 'vitest';
import { ConsentManagerProvider } from '~/providers/consent-manager-provider';
import { useConsentManager } from '../use-consent-manager';

describe('useConsentManager', () => {
	test('returns consent state and methods when used within provider', () => {
		const { result } = renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current).toBeDefined();
		expect(typeof result.current.showPopup).toBe('boolean');
	});

	test('provides manager object when configured', () => {
		const { result } = renderHook(() => useConsentManager(), {
			wrapper: ({ children }) => (
				<ConsentManagerProvider
					options={{
						mode: 'offline',
						react: {
							noStyle: false,
						},
					}}
				>
					{children}
				</ConsentManagerProvider>
			),
		});

		expect(result.current.manager).toBeDefined();
	});
});
