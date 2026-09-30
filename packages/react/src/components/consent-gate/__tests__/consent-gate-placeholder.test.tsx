import { defaultTranslationConfig } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentGate, Frame } from '~/components/consent-gate';
import * as reactEntry from '~/index';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

const gateApp = function gateApp(
	ui: ReactElement,
	consents: Record<string, boolean>,
	strict = false
) {
	const now = Date.now();
	const policy = normalizePolicyRule({
		categories: strict ? ['measurement'] : ['marketing'],
		id: 'consent-gate-test-policy',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: strict ? 'strict' : 'permissive',
	});
	const fingerprints = createPolicyRuleFingerprints(policy);
	return (
		<ConsentProvider
			options={{
				mode: offline(),
				persistence: false,
				prefetch: {
					initialPolicyResolution: {
						fingerprints,
						matchedBy: 'fallback',
						policy,
						policyId: policy.id,
						status: 'matched',
					},
					initialRecords: {
						choice: {
							categories:
								consents.marketing === undefined
									? {}
									: {
											marketing: {
												basis: {
													fingerprint: fingerprints.choice,
													kind: 'choice-v1',
												},
												confirmedAt: now - 1000,
												value: consents.marketing,
											},
										},
							version: 3,
						},
						now,
					},
					initialTranslations: {
						language: 'en',
						translations: defaultTranslationConfig.translations.en,
					},
				},
			}}
		>
			{ui}
		</ConsentProvider>
	);
};

const renderGate = (ui: ReactElement, consents: Record<string, boolean>) =>
	render(gateApp(ui, consents));

describe('ConsentGate default placeholder', () => {
	test('renders the shared placeholder slots when consent is missing', async () => {
		const { container } = await renderGate(
			<ConsentGate category="marketing">
				<div data-testid="gate-content">Marketing content</div>
			</ConsentGate>,
			{ marketing: false, necessary: true }
		);

		await vi.waitFor(() => {
			const placeholder = container.querySelector(
				'[data-testid="consent-gate-placeholder"]'
			);
			expect(placeholder).toBeInTheDocument();

			const button = placeholder?.querySelector(
				'[data-testid="consent-gate-button"]'
			);
			expect(button).toBeInTheDocument();
			// The category title comes from the translation bundle, not the
			// raw category key.
			expect(placeholder).toHaveTextContent('Marketing');
			expect(
				container.querySelector('[data-testid="gate-content"]')
			).toBeNull();
		});
	});

	test('a supplied placeholder replaces the default slots', async () => {
		const { container } = await renderGate(
			<ConsentGate
				category="marketing"
				placeholder={<div data-testid="custom-placeholder">Blocked</div>}
			>
				<div data-testid="gate-content">Marketing content</div>
			</ConsentGate>,
			{ marketing: false, necessary: true }
		);

		await vi.waitFor(() => {
			expect(
				container.querySelector('[data-testid="custom-placeholder"]')
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-testid="consent-gate-placeholder"]')
			).toBeNull();
			expect(
				container.querySelector('[data-testid="consent-gate-button"]')
			).toBeNull();
		});
	});
});

describe('ConsentGate server rendering', () => {
	const content = (
		<ConsentGate category="marketing">
			<div data-testid="gate-content">Marketing content</div>
		</ConsentGate>
	);

	test('includes the default placeholder in the first HTML when consent is missing', () => {
		const html = renderToString(gateApp(content, { necessary: true }));
		expect(html).toContain('data-testid="consent-gate-placeholder"');
		expect(html).toContain('data-testid="consent-gate-button"');
		expect(html).not.toContain('data-testid="gate-content"');
	});

	test('includes a supplied placeholder in the first HTML', () => {
		const html = renderToString(
			gateApp(
				<ConsentGate
					category="marketing"
					placeholder={<p>Video requires consent</p>}
				>
					<div data-testid="gate-content">Marketing content</div>
				</ConsentGate>,
				{ marketing: false, necessary: true }
			)
		);
		expect(html).toContain('Video requires consent');
		expect(html).not.toContain('data-testid="gate-content"');
	});

	// Inside a streamed Suspense boundary React moves the server HTML into
	// place after parsing it, which reloads an iframe that was already
	// loading. Granted children therefore mount after hydration only.
	test('leaves granted children out of the first HTML', () => {
		const html = renderToString(
			gateApp(content, { marketing: true, necessary: true })
		);
		expect(html).not.toContain('data-testid="gate-content"');
		expect(html).not.toContain('data-testid="consent-gate-placeholder"');
	});

	test('keeps a stored grant blocked outside a strict policy scope', () => {
		const html = renderToString(
			gateApp(content, { marketing: true, necessary: true }, true)
		);
		expect(html).toContain('data-testid="consent-gate-placeholder"');
		expect(html).not.toContain('data-testid="gate-content"');
		expect(html).not.toContain('data-testid="consent-gate-button"');
	});

	// Next.js `cacheComponents` fails a prerender that reads the clock in a
	// Client Component, so the gate must decide from the snapshot alone.
	test.each([false, true])(
		'reads no clock while rendering on the server (granted: %s)',
		(marketing) => {
			const app = gateApp(content, { marketing, necessary: true });
			const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
				throw new Error('Date.now() read during server rendering');
			});
			try {
				const html = renderToString(app);
				expect(html.includes('data-testid="consent-gate-placeholder"')).toBe(
					!marketing
				);
			} finally {
				clock.mockRestore();
			}
		}
	);

	const hydrate = async function hydrate(marketing: boolean) {
		const onHydrated = vi.fn();
		const Hydrated = () => {
			useEffect(() => {
				onHydrated();
			}, []);
			return null;
		};
		const app = gateApp(
			<>
				{content}
				<Hydrated />
			</>,
			{ marketing, necessary: true }
		);
		const host = document.createElement('div');
		host.innerHTML = renderToString(app);
		document.body.append(host);
		const onRecoverableError = vi.fn();
		const before = {
			placeholder: host.querySelector(
				'[data-testid="consent-gate-placeholder"]'
			),
			wrapper: host.firstElementChild,
		};
		const root = hydrateRoot(host, app, { onRecoverableError });
		await vi.waitFor(() => expect(onHydrated).toHaveBeenCalled());
		return {
			before,
			cleanup: () => {
				root.unmount();
				host.remove();
			},
			host,
			onRecoverableError,
		};
	};

	test('hydrates the server placeholder without replacing it', async () => {
		const { before, cleanup, host, onRecoverableError } = await hydrate(false);
		try {
			expect(before.placeholder).not.toBeNull();
			expect(
				host.querySelector('[data-testid="consent-gate-placeholder"]')
			).toBe(before.placeholder);
			expect(onRecoverableError).not.toHaveBeenCalled();
		} finally {
			cleanup();
		}
	});

	test('mounts granted children once hydration completes', async () => {
		const { before, cleanup, host, onRecoverableError } = await hydrate(true);
		try {
			await vi.waitFor(() =>
				expect(
					host.querySelectorAll('[data-testid="gate-content"]')
				).toHaveLength(1)
			);
			expect(host.firstElementChild).toBe(before.wrapper);
			expect(onRecoverableError).not.toHaveBeenCalled();
		} finally {
			cleanup();
		}
	});
});

describe('Frame alias', () => {
	test('stays the same component as ConsentGate', () => {
		expect(Frame).toBe(ConsentGate);
		expect(Frame.Root).toBe(ConsentGate.Root);
		expect(reactEntry.Frame).toBe(reactEntry.ConsentGate);
	});
});
