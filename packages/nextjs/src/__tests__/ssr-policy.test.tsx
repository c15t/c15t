import { buildPrefetchScript, createConsentKernel } from '@c15t/core';
import type { ConsentSnapshot, KernelConfig } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import {
	ConsentDialog,
	ConsentDialogTrigger,
	custom,
	useSnapshot,
} from '@c15t/react';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { encodeStoredConsentEnvelopeJson } from '../../../core/src/modules/persistence/record-codec';
import { ConsentBoundary } from '../boundary';
import { RscConsentBanner } from '../rsc/banner';
import { prefetchInitialConsent, readInitialConsentConfig } from '../server';
import { policyFixture } from './policy-fixture';

const required = <Value,>(value: Value): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error('Required fixture value missing');
	}
	return value;
};
const storageKey = 'next-ssr-policy';
const now = 1_780_000_000_000;
const request = (cookie: string, gpc?: string, async = true) => ({
	cookies: () =>
		async
			? Promise.resolve({ toString: () => cookie })
			: { toString: () => cookie },
	headers: () => {
		const headers = new Headers({
			cookie,
			host: 'example.test',
		});
		if (gpc) {
			headers.set('sec-gpc', gpc);
		}
		return async ? Promise.resolve(headers) : headers;
	},
});
const rule = {
	categories: ['marketing'],
	scopeMode: 'strict',
} satisfies Partial<PolicyRule>;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
	root?.unmount();
	root = undefined;
	container?.remove();
	for (const key of [
		storageKey,
		`${storageKey}-notice`,
		`${storageKey}-privacy`,
	]) {
		document.cookie = `${key}=; Max-Age=0; Path=/`;
		localStorage.removeItem(key);
	}
	vi.restoreAllMocks();
});
const getSnapshotProbe = (onSnapshot: (snapshot: ConsentSnapshot) => void) =>
	function Probe() {
		const snapshot = useSnapshot();
		onSnapshot(snapshot);
		return (
			<output data-testid="permissions">
				{String(snapshot.effectivePermissions.marketing)}
			</output>
		);
	};

const hydrate = async (config: KernelConfig) => {
	const init = vi.fn();
	const errors: string[] = [];
	const error = vi
		.spyOn(console, 'error')
		.mockImplementation((...args) => errors.push(args.map(String).join(' ')));
	let snapshot: ConsentSnapshot | undefined;
	const Probe = getSnapshotProbe((value) => {
		snapshot = value;
	});
	const app = (
		<ConsentBoundary
			config={JSON.parse(JSON.stringify(config))}
			persistence={{ storageConfig: { storageKey } }}
			options={{ disableAnimation: true, mode: custom({ init }) }}
		>
			<RscConsentBanner config={config} />
			<ConsentDialog />
			<ConsentDialogTrigger />
			<Probe />
		</ConsentBoundary>
	);
	container = document.createElement('div');
	document.body.append(container);
	container.innerHTML = renderToString(app);
	const server = container.innerHTML;
	const prompts: boolean[] = [server.includes('consent-banner-root')];
	const observer = new MutationObserver(() =>
		prompts.push(
			!!container?.querySelector('[data-testid="consent-banner-root"]')
		)
	);
	observer.observe(container, { childList: true, subtree: true });
	root = hydrateRoot(container, app, {
		onRecoverableError: (value) => errors.push(String(value)),
	});
	// oxlint-disable-next-line promise/avoid-new -- Let hydration and portal effects commit before observing the DOM.
	await new Promise((resolve) => {
		setTimeout(resolve, 60);
	});
	observer.disconnect();
	error.mockRestore();
	expect(init).not.toHaveBeenCalled();
	expect(errors).toEqual([]);
	return { element: container, prompts, server, snapshot: () => snapshot };
};

describe('Next.js request policy and RSC hydration', () => {
	for (const asynchronous of [false, true]) {
		test(`preserves raw receipt metadata through ${asynchronous ? 'async App Router' : 'synchronous request adapter'} headers`, async () => {
			vi.spyOn(Date, 'now').mockReturnValue(now);
			const prepared = policyFixture({ marketing: true }, rule);
			const record = {
				choice: required(prepared.initialRecords?.choice),
				iab: { customVendorConsents: { original: true } },
				subject: { subjectId: 'legacy_subject+literal' },
				version: 3 as const,
			};
			const raw = encodeStoredConsentEnvelopeJson({
				...record,
				categories: record.choice.categories,
			});
			const cookie = `${storageKey}=${encodeURIComponent(raw)}`;
			document.cookie = `${cookie}; Path=/`;
			localStorage.setItem(storageKey, raw);
			const before = {
				cookie: document.cookie,
				local: localStorage.getItem(storageKey),
			};
			const fetch = vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						location: { countryCode: null, regionCode: null },
						policyResolution: writePolicyResolutionWire(
							required(prepared.initialPolicyResolution)
						),
						translations: { language: 'en', translations: {} },
					}),
					{ headers: { 'x-c15t-policy-contract': '1' } }
				)
			);
			const config = await prefetchInitialConsent({
				backendURL: '/api/c15t',
				cookieName: storageKey,
				fetch,
				now,
				request: request(cookie, undefined, asynchronous),
			});
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(config.initialRecords?.choice).toEqual(record.choice);
			expect(config.initialRecords?.subject).toEqual(record.subject);
			expect(config.now).toBe(now);
			const rendered = await hydrate(config);
			expect(rendered.prompts.every((value) => !value)).toBe(true);
			expect(rendered.snapshot()?.effectivePermissions.marketing).toBe(true);
			expect(
				document.querySelector('[data-testid="consent-dialog-trigger"]')
			).not.toBeNull();
			expect({
				cookie: document.cookie,
				local: localStorage.getItem(storageKey),
			}).toEqual(before);
		});
	}

	for (const prompt of ['choice', 'notice', 'none'] as const) {
		test(`hydrates ${prompt} with the same prompt and required actions`, async () => {
			vi.spyOn(Date, 'now').mockReturnValue(now);
			const config = {
				...policyFixture(
					{},
					{ ...rule, model: prompt === 'choice' ? 'opt-in' : 'opt-out', prompt }
				),
				...(await readInitialConsentConfig({ now, request: request('') })),
			};
			const rendered = await hydrate(config);
			expect(rendered.snapshot()?.promptRequirement.kind).toBe(prompt);
			expect(
				rendered.prompts.every((value) => value === (prompt !== 'none'))
			).toBe(true);
			if (prompt === 'notice') {
				expect(
					rendered.element.querySelector(
						'[data-testid="consent-banner-accept-button"]'
					)
				).toBeNull();
				const dismiss = rendered.element.querySelector<HTMLButtonElement>(
					'[data-testid="consent-banner-dismiss-button"]'
				);
				expect(dismiss).not.toBeNull();
				required(dismiss).click();
				await vi.waitFor(() =>
					expect(rendered.snapshot()?.noticeDismissal?.dismissedAt).toBe(now)
				);
				expect(rendered.snapshot()?.explicitChoice).toBeNull();
				expect(
					rendered.element.querySelector('[aria-modal="true"]')
				).toBeNull();
			}
		});
	}

	for (const reason of ['expired', 'policy-changed'] as const) {
		test(`renders a returning visitor's ${reason} choice before hydration`, async () => {
			vi.spyOn(Date, 'now').mockReturnValue(now);
			const old = policyFixture(
				{ marketing: true },
				{ ...rule, validity: { choiceDays: 1 } }
			);
			if (reason === 'expired') {
				required(old.initialRecords?.choice?.categories.marketing).confirmedAt =
					now - 86_400_000;
			}
			const config =
				reason === 'expired'
					? old
					: {
							...policyFixture({}, { ...rule, copyRevision: 'new-copy' }),
							initialRecords: old.initialRecords,
						};
			const rendered = await hydrate(config);
			expect(rendered.snapshot()?.promptRequirement).toEqual({
				kind: 'choice',
				reason,
			});
			expect(rendered.prompts.every(Boolean)).toBe(true);
			expect(rendered.snapshot()?.explicitChoice).toEqual(
				old.initialRecords?.choice
			);
		});
	}

	test('server reads notice and standing privacy projections without writes', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(now);
		const prepared = policyFixture(
			{},
			{
				...rule,
				model: 'opt-out',
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
				prompt: 'notice',
			}
		);
		const kernel = createConsentKernel(prepared);
		const persistence = createPersistence({
			kernel,
			now: () => now,
			storageConfig: { storageKey },
		});
		await kernel.commands.dismissNotice();
		kernel.set.privacySignals({ gpc: true });
		await vi.waitFor(() =>
			expect(document.cookie).toContain(`${storageKey}-privacy=`)
		);
		persistence.dispose();
		kernel.dispose();
		const { cookie } = document;
		const config = {
			...prepared,
			...(await readInitialConsentConfig({
				cookieName: storageKey,
				now,
				request: request(cookie),
			})),
		};
		const rendered = await hydrate(config);
		expect(rendered.prompts.every((value) => !value)).toBe(true);
		expect(rendered.snapshot()?.effectivePermissions.marketing).toBe(false);
		expect(rendered.snapshot()?.optOutDirectives).toHaveLength(1);
		expect(document.cookie).toBe(cookie);
	});

	test('the RSC gate reopens an expired receipt after an initially hidden prompt', async () => {
		const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
		const config = policyFixture(
			{ marketing: true },
			{ ...rule, validity: { choiceDays: 1 } }
		);
		const rendered = await hydrate(config);
		expect(rendered.server).not.toContain('consent-banner-root');
		clock.mockReturnValue(now + 86_400_000);
		document.dispatchEvent(new Event('visibilitychange'));
		await vi.waitFor(() =>
			expect(
				rendered.element.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull()
		);
		expect(rendered.snapshot()?.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		expect(rendered.snapshot()?.explicitChoice).toEqual(
			config.initialRecords?.choice
		);
	});

	test('C15tPrefetch script and the boundary share one browser init request', async () => {
		const config = policyFixture({}, rule);
		const fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					location: { countryCode: null, regionCode: null },
					policyResolution: writePolicyResolutionWire(
						required(config.initialPolicyResolution)
					),
					translations: { language: 'en', translations: {} },
				}),
				{ headers: { 'x-c15t-policy-contract': '1' } }
			)
		);
		vi.stubGlobal('fetch', fetch);
		try {
			window.eval(
				buildPrefetchScript({ backendURL: '/api/next-prefetch-test' })
			);
			container = document.createElement('div');
			document.body.append(container);
			root = createRoot(container);
			let snapshot: ConsentSnapshot | undefined;
			const Probe = getSnapshotProbe((value) => {
				snapshot = value;
			});
			root.render(
				<ConsentBoundary
					config={{}}
					backendURL="/api/next-prefetch-test"
					persistence={false}
				>
					<Probe />
				</ConsentBoundary>
			);
			await vi.waitFor(() =>
				expect(snapshot?.resolution.status).toBe('matched')
			);
			expect(fetch).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	test('prepared SSR detects browser GPC after hydration when the request omitted it', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(now);
		const before = Object.getOwnPropertyDescriptor(
			navigator,
			'globalPrivacyControl'
		);
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		try {
			const config = policyFixture(
				{},
				{
					...rule,
					model: 'opt-out',
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					prompt: 'none',
				}
			);
			const rendered = await hydrate(config);
			expect(rendered.snapshot()?.privacySignals.gpc.detected).toBe(true);
			expect(rendered.snapshot()?.optOutDirectives).toHaveLength(1);
			expect(rendered.snapshot()?.effectivePermissions.marketing).toBe(false);
		} finally {
			if (before) {
				Object.defineProperty(navigator, 'globalPrivacyControl', before);
			} else {
				Reflect.deleteProperty(navigator, 'globalPrivacyControl');
			}
		}
	});

	test('Sec-GPC remains a detected signal rather than a developer override', async () => {
		const config = await readInitialConsentConfig({
			now,
			request: request('', '1'),
		});
		expect(config.initialPrivacySignals).toEqual({ gpc: true });
		expect(config.initialOverrides?.gpc).toBeUndefined();
	});
});
