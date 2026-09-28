import { beforeEach, describe, expect, test } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import type { ComponentFixtureOptions as ConsentProviderOptions } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import {
	useActiveUI,
	useConsent,
	useExplicitChoice,
	useSaveConsents,
	useSubscribeToConsentChanges,
} from '~/hooks';
import { offline } from '~/transports/offline';

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

describe('v3 selector hooks: provider state and policy scope', () => {
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

	test('reads the active surface, the recorded choice and the save action', async () => {
		const { result } = await renderHook(
			() => ({
				activeUI: useActiveUI(),
				explicitChoice: useExplicitChoice(),
				save: useSaveConsents(),
			}),
			{ wrapper: createWrapper() }
		);

		expect(typeof result.current.activeUI).toBe('string');
		expect(result.current.explicitChoice).toBeNull();
		expect(typeof result.current.save).toBe('function');
	});

	test('useSubscribeToConsentChanges is stable across rerenders', async () => {
		const { result, rerender } = await renderHook(
			() => useSubscribeToConsentChanges(),
			{ wrapper: createWrapper() }
		);

		const firstSubscribe = result.current;

		rerender();

		expect(typeof result.current).toBe('function');
		expect(result.current).toBe(firstSubscribe);
	});

	test('permissive scope retains explicit restrictions outside its categories', async () => {
		const { result } = await renderHook(
			() => ({
				marketing: useConsent('marketing'),
				measurement: useConsent('measurement'),
				necessary: useConsent('necessary'),
			}),
			{
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
			}
		);

		// In-policy categories honor the stored consent value; categories the
		// policy does not govern are ungated under permissive scope.
		expect(result.current.measurement).toBe(false);
		expect(result.current.marketing).toBe(false);
		expect(result.current.necessary).toBe(true);
	});

	test('strict scope denies categories outside the policy', async () => {
		const { result } = await renderHook(
			() => ({
				experience: useConsent('experience'),
				necessary: useConsent('necessary'),
			}),
			{
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
			}
		);

		expect(result.current.experience).toBe(false);
		expect(result.current.necessary).toBe(true);
	});
});
