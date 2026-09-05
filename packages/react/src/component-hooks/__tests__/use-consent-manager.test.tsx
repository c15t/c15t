import { beforeEach, describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { offline } from '~/transports/offline';

import { useConsentManager } from '../use-consent-manager';

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

describe('useConsentManager', () => {
	beforeEach(() => {
		window.localStorage.clear();
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const name = cookie.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
			}
		}
	});

	test('returns consent state and methods when used within provider', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: createWrapper(),
		});

		expect(result.current).toBeDefined();
		expect(typeof result.current.activeUI).toBe('string');
		expect(result.current.explicitChoice).toBeNull();
		expect(typeof result.current.saveConsents).toBe('function');
	});

	test('exposes a stable subscribeToConsentChanges function across rerenders', async () => {
		const { result, rerender } = await renderHook(() => useConsentManager(), {
			wrapper: createWrapper(),
		});

		const firstSubscribe = result.current.subscribeToConsentChanges;

		rerender();

		expect(typeof result.current.subscribeToConsentChanges).toBe('function');
		expect(result.current.subscribeToConsentChanges).toBe(firstSubscribe);
	});

	test('permissive scope retains explicit restrictions outside its categories', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: createWrapper({
				prefetch: {
					...policyFixture(
						{
							experience: false,
							functionality: false,
							marketing: false,
							measurement: false,
							necessary: true,
						},
						{
							categories: ['necessary', 'measurement'],
							id: 'scope-test',
							model: 'opt-in',
							prompt: 'choice',
							scopeMode: 'permissive',
						}
					),
					initialDraft: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				},
			}),
		});

		// In-policy categories honor the stored consent value; categories the
		// policy does not govern are ungated under permissive scope.
		expect(result.current.has('measurement')).toBe(false);
		expect(result.current.has('marketing')).toBe(false);
		expect(result.current.has({ and: ['necessary', 'marketing'] })).toBe(false);
	});

	test('restricts has() to policy categories in strict scope mode', async () => {
		const { result } = await renderHook(() => useConsentManager(), {
			wrapper: createWrapper({
				prefetch: {
					...policyFixture(
						{
							experience: true,
							functionality: false,
							marketing: false,
							measurement: false,
							necessary: true,
						},
						{
							categories: ['necessary', 'measurement'],
							id: 'scope-test',
							model: 'opt-in',
							prompt: 'choice',
							scopeMode: 'strict',
						}
					),
					initialDraft: {
						experience: true,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				},
			}),
		});

		expect(result.current.has('experience')).toBe(false);
		expect(result.current.has('necessary')).toBe(true);
	});
});
