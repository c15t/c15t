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

import { Frame } from '~/components/frame';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

const frameApp = function frameApp(
	ui: ReactElement,
	consents: Record<string, boolean>,
	strict = false
) {
	const now = Date.now();
	const policy = normalizePolicyRule({
		categories: strict ? ['measurement'] : ['marketing'],
		id: 'frame-test-policy',
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

const renderFrame = (ui: ReactElement, consents: Record<string, boolean>) =>
	render(frameApp(ui, consents));

describe('Frame default placeholder', () => {
	test('renders the shared placeholder slots when consent is missing', async () => {
		const { container } = await renderFrame(
			<Frame category="marketing">
				<div data-testid="frame-content">Marketing content</div>
			</Frame>,
			{ marketing: false, necessary: true }
		);

		await vi.waitFor(() => {
			const placeholder = container.querySelector(
				'[data-testid="frame-placeholder"]'
			);
			expect(placeholder).toBeInTheDocument();

			const button = placeholder?.querySelector(
				'[data-testid="frame-open-dialog"]'
			);
			expect(button).toBeInTheDocument();
			// The category title comes from the translation bundle, not the
			// raw category key.
			expect(placeholder).toHaveTextContent('Marketing');
			expect(
				container.querySelector('[data-testid="frame-content"]')
			).toBeNull();
		});
	});

	test('a supplied placeholder replaces the default slots', async () => {
		const { container } = await renderFrame(
			<Frame
				category="marketing"
				placeholder={<div data-testid="custom-placeholder">Blocked</div>}
			>
				<div data-testid="frame-content">Marketing content</div>
			</Frame>,
			{ marketing: false, necessary: true }
		);

		await vi.waitFor(() => {
			expect(
				container.querySelector('[data-testid="custom-placeholder"]')
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-testid="frame-placeholder"]')
			).toBeNull();
			expect(
				container.querySelector('[data-testid="frame-open-dialog"]')
			).toBeNull();
		});
	});
});

describe('Frame server rendering', () => {
	const content = (
		<Frame category="marketing">
			<div data-testid="frame-content">Marketing content</div>
		</Frame>
	);

	test('includes the default placeholder in the first HTML when consent is missing', () => {
		const html = renderToString(frameApp(content, { necessary: true }));
		expect(html).toContain('data-testid="frame-placeholder"');
		expect(html).toContain('data-testid="frame-open-dialog"');
		expect(html).not.toContain('data-testid="frame-content"');
	});

	test('includes a supplied placeholder in the first HTML', () => {
		const html = renderToString(
			frameApp(
				<Frame
					category="marketing"
					placeholder={<p>Video requires consent</p>}
				>
					<div data-testid="frame-content">Marketing content</div>
				</Frame>,
				{ marketing: false, necessary: true }
			)
		);
		expect(html).toContain('Video requires consent');
		expect(html).not.toContain('data-testid="frame-content"');
	});

	test('includes children in the first HTML when effective permission is granted', () => {
		const html = renderToString(
			frameApp(content, { marketing: true, necessary: true })
		);
		expect(html).toContain('data-testid="frame-content"');
		expect(html).not.toContain('data-testid="frame-placeholder"');
	});

	test('keeps a stored grant blocked outside a strict policy scope', () => {
		const html = renderToString(
			frameApp(content, { marketing: true, necessary: true }, true)
		);
		expect(html).toContain('data-testid="frame-placeholder"');
		expect(html).not.toContain('data-testid="frame-content"');
		expect(html).not.toContain('data-testid="frame-open-dialog"');
	});

	test.each([false, true])(
		'hydrates the server content without replacing it (granted: %s)',
		async (marketing) => {
			const onHydrated = vi.fn();
			const Hydrated = () => {
				useEffect(() => {
					onHydrated();
				}, []);
				return null;
			};
			const app = frameApp(
				<>
					{content}
					<Hydrated />
				</>,
				{ marketing, necessary: true }
			);
			const host = document.createElement('div');
			host.innerHTML = renderToString(app);
			document.body.append(host);
			const selector = marketing
				? '[data-testid="frame-content"]'
				: '[data-testid="frame-placeholder"]';
			const serverContent = host.querySelector(selector);
			expect(serverContent).not.toBeNull();
			const onRecoverableError = vi.fn();
			let root: ReturnType<typeof hydrateRoot> | undefined;
			try {
				root = hydrateRoot(host, app, { onRecoverableError });
				await vi.waitFor(() => expect(onHydrated).toHaveBeenCalled());
				expect(host.querySelector(selector)).toBe(serverContent);
				expect(onRecoverableError).not.toHaveBeenCalled();
			} finally {
				root?.unmount();
				host.remove();
			}
		}
	);
});
