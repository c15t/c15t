import type {
	AllConsentNames,
	ConsentKernel,
	ConsentState,
	KernelConfig,
} from '@c15t/core';
import type { PolicyRule } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { KernelContext } from '~/context';
import { offline } from '~/transports/offline';

import { useConsentGate } from '../use-consent-gate';

interface FixtureOptions {
	values?: Partial<ConsentState>;
	rule?: Partial<PolicyRule>;
	initialTranslations?: KernelConfig['initialTranslations'];
}

const STRICT_MEASUREMENT_ONLY: Partial<PolicyRule> = {
	categories: ['measurement'],
	scopeMode: 'strict',
};

const createWrapper = function createWrapper({
	values,
	rule,
	initialTranslations,
}: FixtureOptions = {}) {
	// Built once, outside render: the fixture reads the clock, and the server
	// and client renders must share one snapshot.
	const prefetch = { ...policyFixture(values, rule), initialTranslations };
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<ComponentFixtureProvider
				options={{ mode: offline(), persistence: false, prefetch }}
			>
				{children}
			</ComponentFixtureProvider>
		);
	};
};

const renderGate = (category: AllConsentNames, options?: FixtureOptions) =>
	renderHook(() => useConsentGate(category), {
		wrapper: createWrapper(options),
	});

const useGateWithKernel = function useGateWithKernel(
	category: AllConsentNames
) {
	const kernel = useContext(KernelContext) as ConsentKernel;
	return { gate: useConsentGate(category), kernel };
};

describe('useConsentGate state', () => {
	test('is denied while the category has no grant', async () => {
		const { result } = await renderGate('marketing');
		expect(result.current.state).toBe('denied');
	});

	test('is granted once the category is granted and the page has hydrated', async () => {
		const { result } = await renderGate('marketing', {
			values: { marketing: true },
		});
		expect(result.current.state).toBe('granted');
	});

	test('is policy-blocked when a strict scope excludes the category, even with a stored grant', async () => {
		const { result } = await renderGate('marketing', {
			rule: STRICT_MEASUREMENT_ONLY,
			values: { marketing: true },
		});
		expect(result.current.state).toBe('policy-blocked');
	});

	// A permissive scope allows categories outside it by default, so this
	// one needs an explicit denial to stay ungranted.
	test('is denied, not policy-blocked, when a permissive scope excludes a denied category', async () => {
		const { result } = await renderGate('marketing', {
			rule: { categories: ['measurement'], scopeMode: 'permissive' },
			values: { marketing: false },
		});
		expect(result.current.state).toBe('denied');
	});

	test('is denied, not policy-blocked, for a category inside a strict scope', async () => {
		const { result } = await renderGate('measurement', {
			rule: STRICT_MEASUREMENT_ONLY,
		});
		expect(result.current.state).toBe('denied');
	});

	test('never policy-blocks necessary', async () => {
		const { result } = await renderGate('necessary', {
			rule: STRICT_MEASUREMENT_ONLY,
		});
		expect(result.current.state).toBe('granted');
	});

	test('treats a strict wildcard scope as covering every category', async () => {
		const { result } = await renderGate('marketing', {
			rule: { categories: ['*'], scopeMode: 'strict' },
		});
		expect(result.current.state).toBe('denied');
	});
});

describe('useConsentGate server rendering', () => {
	const serverApp = function serverApp(
		onState: (state: string) => void,
		marketing: boolean
	) {
		const Gate = () => {
			const { state } = useConsentGate('marketing');
			onState(state);
			return <output data-testid="gate-state">{state}</output>;
		};
		const Wrapper = createWrapper({ values: { marketing } });
		return (
			<Wrapper>
				<Gate />
			</Wrapper>
		);
	};

	// Next.js `cacheComponents` fails a prerender that reads the clock in a
	// Client Component.
	test.each([false, true])(
		'reads no clock while rendering on the server (granted: %s)',
		(marketing) => {
			const app = serverApp(() => undefined, marketing);
			const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
				throw new Error('Date.now() read during server rendering');
			});
			try {
				expect(renderToString(app)).toContain(marketing ? 'pending' : 'denied');
			} finally {
				clock.mockRestore();
			}
		}
	);

	test('is pending in the server HTML and during hydration, then granted', async () => {
		const states: string[] = [];
		const onHydrated = vi.fn();
		const Hydrated = () => {
			useEffect(() => {
				onHydrated();
			}, []);
			return null;
		};
		const app = (
			<>
				{serverApp((state) => states.push(state), true)}
				<Hydrated />
			</>
		);
		const host = document.createElement('div');
		host.innerHTML = renderToString(app);
		document.body.append(host);
		expect(states).toEqual(['pending']);

		states.length = 0;
		const onRecoverableError = vi.fn();
		const root = hydrateRoot(host, app, { onRecoverableError });
		try {
			await vi.waitFor(() => expect(onHydrated).toHaveBeenCalled());
			await vi.waitFor(() =>
				expect(
					host.querySelector('[data-testid="gate-state"]')
				).toHaveTextContent('granted')
			);
			expect(states[0]).toBe('pending');
			expect(onRecoverableError).not.toHaveBeenCalled();
		} finally {
			root.unmount();
			host.remove();
		}
	});
});

describe('useConsentGate side effects', () => {
	test('registers the category with the provider', async () => {
		const { result } = await renderHook(() => useGateWithKernel('experience'), {
			wrapper: createWrapper(),
		});
		await vi.waitFor(() => {
			expect(result.current.kernel.getSnapshot().consentCategories).toContain(
				'experience'
			);
		});
	});

	test('requestConsent opens the consent dialog', async () => {
		const { result } = await renderHook(() => useGateWithKernel('marketing'), {
			wrapper: createWrapper(),
		});
		expect(result.current.kernel.getSnapshot().activeUI).not.toBe('dialog');

		result.current.gate.requestConsent();

		await vi.waitFor(() => {
			expect(result.current.kernel.getSnapshot().activeUI).toBe('dialog');
		});
	});
});

describe('useConsentGate copy', () => {
	test('fills the category title into the English copy', async () => {
		const { result } = await renderGate('marketing');
		expect(result.current).toMatchObject({
			actionLabel: 'Enable Marketing consent',
			categoryTitle: 'Marketing',
			policyBlockedMessage:
				"This content is unavailable under your region's consent policy.",
			title: 'Accept Marketing consent to view this content.',
		});
	});

	test('falls back to the category name and the English policy message', async () => {
		const { result } = await renderGate('marketing', {
			initialTranslations: {
				language: 'en',
				translations: {
					common: {},
					consentGate: {
						actionButton: 'Turn on {category}',
						title: 'Allow {category} to see this',
					},
					consentManagerDialog: {},
					consentTypes: {},
					cookieBanner: {},
				},
			},
		});
		expect(result.current).toMatchObject({
			actionLabel: 'Turn on marketing',
			categoryTitle: 'marketing',
			policyBlockedMessage:
				"This content is unavailable under your region's consent policy.",
			title: 'Allow marketing to see this',
		});
	});
});
