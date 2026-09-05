import type { ConsentKernel, InitOutput } from '@c15t/core';
import { iab as configureIAB } from '@c15t/iab';
import type { ReactNode } from 'react';
import { useContext, useEffect } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { mockGVL } from '../components/iab/__tests__/fixtures/mock-consent-state';
import { InlineLegalLinks } from '../components/shared/primitives/legal-links';
import { KernelContext } from '../context';
import { useTheme } from '../hooks/use-theme';
import {
	ConsentProvider,
	custom,
	hosted,
	offline,
	useConsent,
	useOverrides,
	usePolicy,
	useSaveConsents,
	useSetConsent,
	useSnapshot,
	useTranslations,
	useUser,
} from '../index';
import type { ConsentProviderOptions } from '../index';
import { useUIConfig } from '../ui-config-context';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

const STORAGE_KEY = 'c15t-provider-test';

type WindowWithC15t = Window & {
	c15t?: {
		version: string;
		pkg: string;
		mode: string;
	};
	c15tKernel?: ConsentKernel;
	__tcfapi?: unknown;
};

const hostedInitOutput = function hostedInitOutput(
	policy: InitOutput['policy'] = {
		id: 'gdpr',
		model: 'opt-in',
		ui: { mode: 'banner' },
	}
): InitOutput {
	return {
		branding: 'c15t',
		gvl: null,
		jurisdiction: 'GDPR',
		location: { countryCode: 'DE', regionCode: null },
		policy,
		translations: { language: 'en', translations: {} },
	} as InitOutput;
};

const clearCookies = function clearCookies() {
	for (const cookie of document.cookie.split(';')) {
		const key = cookie.split('=')[0]?.trim();
		if (key) {
			// oxlint-disable-next-line unicorn/no-document-cookie -- Test cleanup needs legacy cookie API.
			document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
};

const withProvider = function withProvider(options = {}) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider options={{ mode: offline(), ...options }}>
			{children}
		</ConsentProvider>
	);
	return { Wrapper };
};

beforeEach(() => {
	delete (window as WindowWithC15t).c15t;
	delete (window as WindowWithC15t).c15tKernel;
	delete (window as WindowWithC15t).__tcfapi;
	localStorage.clear();
	clearCookies();
	vi.restoreAllMocks();
});

describe('v3 ConsentProvider options API', () => {
	test('installs window.c15t after mount with React adapter identity', async () => {
		const { unmount } = await render(
			<ConsentProvider
				options={{
					mode: hosted({ url: '/api/c15t' }),
					persistence: false,
				}}
			>
				<div data-testid="child">ready</div>
			</ConsentProvider>
		);

		await vi.waitFor(() => {
			expect((window as WindowWithC15t).c15t).toMatchObject({
				mode: 'hosted',
				pkg: '@c15t/react',
			});
		});
		expect(typeof (window as WindowWithC15t).c15t?.version).toBe('string');
		expect((window as WindowWithC15t).c15tKernel).toMatchObject({
			commands: expect.any(Object),
			getSnapshot: expect.any(Function),
		});

		unmount();
		await vi.waitFor(() => {
			expect((window as WindowWithC15t).c15t).toBeUndefined();
			expect((window as WindowWithC15t).c15tKernel).toBeUndefined();
		});
	});

	test('offline() works without a backend', async () => {
		const { unmount } = await render(
			<ConsentProvider options={{ mode: offline(), persistence: false }}>
				<div data-testid="child">ready</div>
			</ConsentProvider>
		);

		await vi.waitFor(() => {
			expect((window as WindowWithC15t).c15t).toMatchObject({
				mode: 'offline',
				pkg: '@c15t/react',
			});
		});

		unmount();
	});

	test('mounts IAB with the CMP ID returned by hosted init', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					...hostedInitOutput({
						id: 'iab',
						model: 'iab',
						ui: { mode: 'banner' },
					}),
					cmpId: 160,
					gvl: mockGVL,
				}),
				{ headers: { 'content-type': 'application/json' }, status: 200 }
			)
		);

		const Probe = () => {
			const snapshot = useSnapshot();
			return (
				<div data-testid="iab-cmp-id">{snapshot.iab?.cmpId ?? 'none'}</div>
			);
		};

		const { getByTestId, unmount } = await render(
			<ConsentProvider
				options={{
					iab: configureIAB({ vendors: [755] }),
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('iab-cmp-id')).toHaveTextContent('160');
		await vi.waitFor(() => {
			expect((window as WindowWithC15t).__tcfapi).toEqual(expect.any(Function));
		});

		unmount();
	});

	test('custom() reports custom mode for endpoint handlers', async () => {
		const { unmount } = await render(
			<ConsentProvider
				options={{
					mode: custom({
						init: () => Promise.resolve({ data: hostedInitOutput(), ok: true }),
						setConsent: () => Promise.resolve({ data: {}, ok: true }),
					}),
					persistence: false,
				}}
			>
				<div data-testid="child">ready</div>
			</ConsentProvider>
		);

		await vi.waitFor(() => {
			expect((window as WindowWithC15t).c15t).toMatchObject({
				mode: 'custom',
				pkg: '@c15t/react',
			});
		});

		unmount();
	});

	test('throws when mode is missing', async () => {
		await expect(
			render(
				<ConsentProvider
					// @ts-expect-error Verify the runtime guard for untyped callers.
					options={{ persistence: false }}
				>
					<div>missing mode</div>
				</ConsentProvider>
			)
		).rejects.toThrow('Use hosted(), offline(), or custom().');
	});

	test('keeps one kernel instance across provider rerenders', async () => {
		const Probe = () => {
			const marketing = useConsent('marketing');
			const setConsent = useSetConsent();
			return (
				<>
					<div data-testid="marketing">{String(marketing)}</div>
					<button
						data-testid="set"
						onClick={() => setConsent({ marketing: true })}
						type="button"
					>
						set
					</button>
				</>
			);
		};

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					prefetch: { initialConsents: { marketing: false } },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('marketing')).toHaveTextContent('false');
		await getByTestId('set').click();
		await expect.element(getByTestId('marketing')).toHaveTextContent('true');

		rerender(
			<ConsentProvider
				options={{
					components: { banner: { card: { className: 'updated' } } },
					mode: offline(),
					persistence: false,
					prefetch: { initialConsents: { marketing: false } },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('marketing')).toHaveTextContent('true');
	});

	test('disposes the kernel on unmount but not on rerender', async () => {
		let mountedKernel: ConsentKernel | null = null;
		const KernelCapture = () => {
			const contextKernel = useContext(KernelContext);
			useEffect(() => {
				mountedKernel = contextKernel;
			}, [contextKernel]);
			return null;
		};
		const options = { mode: offline(), persistence: false };
		const result = await render(
			<ConsentProvider options={options}>
				<KernelCapture />
			</ConsentProvider>
		);

		await vi.waitFor(() => expect(mountedKernel).not.toBeNull());
		const kernel = mountedKernel;
		if (!kernel) {
			throw new Error('Expected the provider to expose its kernel');
		}
		const dispose = vi.spyOn(kernel, 'dispose');

		await result.rerender(
			<ConsentProvider options={options}>
				<KernelCapture />
			</ConsentProvider>
		);
		expect(dispose).not.toHaveBeenCalled();

		result.unmount();
		expect(dispose).toHaveBeenCalledOnce();
	});

	test('syncs dynamic user option after mount', async () => {
		const Probe = () => {
			const user = useUser();
			return <div data-testid="user">{user?.externalId ?? 'none'}</div>;
		};

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					user: { externalId: 'user-1' },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('user')).toHaveTextContent('user-1');

		rerender(
			<ConsentProvider
				options={{
					mode: offline(),
					persistence: false,
					user: { externalId: 'user-2' },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('user')).toHaveTextContent('user-2');
	});

	test('syncs dynamic overrides option and re-inits when enabled', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(hostedInitOutput()), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);

		const Probe = () => {
			const overrides = useOverrides();
			return <div data-testid="country">{overrides.country ?? 'none'}</div>;
		};

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					overrides: { country: 'US' },
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('US');
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

		rerender(
			<ConsentProvider
				options={{
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					overrides: { country: 'DE' },
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('DE');
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
		const [url, init] = fetchSpy.mock.calls[1] ?? [];
		expect(url).toBe('/api/c15t/init');
		expect((init as RequestInit).method).toBe('GET');
		expect((init as RequestInit).body).toBeUndefined();
	});

	test('syncs enabled option after mount', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(hostedInitOutput()), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);

		const Probe = () => {
			const snapshot = useSnapshot();
			return <div data-testid="active-ui">{snapshot.activeUI}</div>;
		};

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
					enabled: false,
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('active-ui')).toHaveTextContent('none');
		expect(fetchSpy).not.toHaveBeenCalled();

		rerender(
			<ConsentProvider
				options={{
					enabled: true,
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('active-ui')).toHaveTextContent('banner');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	test('defaults persistence on and hydrates with storageConfig', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				consentInfo: { subjectId: 'sub_111', time: Date.now() },
				consents: { marketing: true },
			})
		);

		const { Wrapper } = withProvider({
			storageConfig: { storageKey: STORAGE_KEY },
		});

		const Probe = () => {
			const marketing = useConsent('marketing');
			return <div data-testid="marketing">{String(marketing)}</div>;
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);

		await expect.element(getByTestId('marketing')).toHaveTextContent('true');
	});

	test('persistence=false disables storage hydration', async () => {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({
				consentInfo: { subjectId: 'sub_111', time: Date.now() },
				consents: { marketing: true },
			})
		);

		const { Wrapper } = withProvider({
			persistence: false,
			storageConfig: { storageKey: STORAGE_KEY },
		});

		const Probe = () => {
			const marketing = useConsent('marketing');
			return <div data-testid="marketing">{String(marketing)}</div>;
		};

		const { getByTestId } = await render(
			<Wrapper>
				<Probe />
			</Wrapper>
		);

		await expect.element(getByTestId('marketing')).toHaveTextContent('false');
	});

	test('enabled=false skips init/modules and treats consents as allowed', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response('{}'));

		const Probe = () => {
			const marketing = useConsent('marketing');
			const snapshot = useSnapshot();
			return (
				<div data-testid="probe">
					{String(marketing)}|{snapshot.activeUI}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					enabled: false,
					mode: hosted({ url: '/api/c15t' }),
					scripts: [
						{
							category: 'marketing',
							id: 'disabled-script',
							src: 'https://example.com/disabled.js',
						},
					],
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('probe')).toHaveTextContent('true|none');
		await createDeferredPromise((resolve) => setTimeout(resolve, 10));
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(
			document.head.querySelector(
				'script[src="https://example.com/disabled.js"]'
			)
		).toBeNull();
	});

	test('provides theme and v3 UI config without changing kernel context', async () => {
		const ThemeProbe = () => {
			const theme = useTheme();
			const uiConfig = useUIConfig();
			const className = uiConfig.components?.banner?.card?.className ?? '';

			return (
				<div data-testid="theme">
					{String(theme.noStyle)}|{className}
				</div>
			);
		};

		const KernelProbe = () => {
			const marketing = useConsent('marketing');
			return <div data-testid="kernel">{String(marketing)}</div>;
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					components: {
						banner: {
							card: {
								className: 'provider-theme-card',
							},
						},
					},
					legalLinks: {
						privacyPolicy: {
							href: '/privacy',
							label: 'Privacy',
						},
					},
					mode: offline(),
					noStyle: true,
					persistence: false,
					prefetch: {
						initialConsents: { marketing: true },
						initialHasConsented: true,
					},
				}}
			>
				<ThemeProbe />
				<KernelProbe />
				<InlineLegalLinks
					links={['privacyPolicy']}
					testIdPrefix="provider-legal-link"
					context="banner"
				/>
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('theme'))
			.toHaveTextContent('true|provider-theme-card');
		await expect.element(getByTestId('kernel')).toHaveTextContent('true');
		await expect
			.element(getByTestId('provider-legal-link-privacyPolicy'))
			.toHaveTextContent('Privacy');
		await expect
			.element(getByTestId('provider-legal-link-privacyPolicy'))
			.toHaveAttribute('href', '/privacy');
	});

	test('accepts deprecated offlinePolicy and translations options', async () => {
		const options = {
			consentCategories: ['marketing'],
			legalLinks: {
				privacyPolicy: {
					href: '/legacy-privacy',
					label: 'Legacy Privacy',
				},
			},
			mode: offline(),
			offlinePolicy: {
				policy: {
					consent: {
						categories: ['marketing'],
						scopeMode: 'strict',
					},
					id: 'legacy-offline-policy',
					model: 'opt-in',
					ui: {
						mode: 'banner',
					},
				},
				policySnapshotToken: 'legacy-token',
			},
			persistence: false,
			storageConfig: { storageKey: STORAGE_KEY },
			translations: {
				defaultLanguage: 'de',
				translations: {
					de: {
						common: {
							acceptAll: 'Alle akzeptieren',
						},
					},
				},
			},
		} satisfies ConsentProviderOptions;

		const Probe = () => {
			const { translations } = useSnapshot();
			const policy = usePolicy();
			return (
				<div data-testid="legacy">
					{translations?.language}|{policy?.id}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentProvider options={options}>
				<Probe />
				<InlineLegalLinks
					links={['privacyPolicy']}
					testIdPrefix="legacy-legal-link"
					context="banner"
				/>
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('legacy'))
			.toHaveTextContent('de|legacy-offline-policy');
		await expect
			.element(getByTestId('legacy-legal-link-privacyPolicy'))
			.toHaveAttribute('href', '/legacy-privacy');
	});

	test('deep-merges selected i18n messages over the default language base', async () => {
		const Probe = () => {
			const translations = useTranslations();
			const marketing = translations.consentTypes?.marketing ?? {};
			return (
				<div data-testid="copy">
					{marketing.title}|{marketing.description}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					i18n: {
						locale: 'en',
						messages: {
							en: {
								consentTypes: {
									marketing: {
										title: 'Advertising',
									},
								},
							},
						},
					},
					mode: offline(),
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('copy'))
			.toHaveTextContent(
				'Advertising|These cookies are used to deliver relevant advertisements and track their effectiveness.'
			);
	});

	test('uses deprecated ssrData as a v3 prefetch bridge', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

		const Probe = () => {
			const snapshot = useSnapshot();
			return <div data-testid="active-ui">{snapshot.activeUI}</div>;
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: hosted({ fetch: fetchSpy, url: '/api/c15t' }),
					persistence: false,
					ssrData: Promise.resolve({
						init: {
							branding: 'c15t',
							location: {
								countryCode: 'DE',
								regionCode: null,
							},
							policy: {
								id: 'gdpr',
								model: 'opt-in',
								ui: { mode: 'banner' },
							},
							translations: {
								language: 'en',
								translations: {},
							},
						},
					} as never),
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('active-ui')).toHaveTextContent('banner');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test('ssrData bridge preserves rich init fields through the shared mapper', async () => {
		const Probe = () => {
			const snapshot = useSnapshot();
			return (
				<div data-testid="ssr-rich">
					{snapshot.branding ?? 'none'}|{String(snapshot.hasConsented)}|
					{snapshot.subjectId ?? 'none'}|{snapshot.overrides.country}|
					{snapshot.overrides.language}|{snapshot.activeUI}
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: hosted({ fetch: vi.fn(), url: '/api/c15t' }),
					persistence: false,
					ssrData: Promise.resolve({
						init: {
							branding: 'none',
							consents: { marketing: true },
							hasConsented: true,
							location: {
								countryCode: 'DE',
								regionCode: null,
							},
							policy: {
								id: 'gdpr',
								model: 'opt-in',
								ui: { mode: 'banner' },
							},
							subjectId: 'sub_ssr',
							translations: {
								language: 'de',
								translations: {},
							},
						},
					} as never),
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('ssr-rich'))
			.toHaveTextContent('none|true|sub_ssr|DE|de|none');
	});

	test('maps hosted v2 transport options into the v3 hosted transport', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify(hostedInitOutput()), { status: 200 })
			);

		const Probe = () => {
			const snapshot = useSnapshot();
			return <div data-testid="active-ui">{snapshot.activeUI}</div>;
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: hosted({
						fetch: fetchSpy,
						headers: { 'accept-language': 'de', 'x-test': 'yes' },
						url: '/custom-c15t',
					}),
					persistence: false,
					retryConfig: { maxRetries: 2 },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('active-ui')).toHaveTextContent('banner');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('/custom-c15t/init');
		expect((init as RequestInit).method).toBe('GET');
		expect((init as RequestInit).body).toBeUndefined();
		expect((init as RequestInit).headers).toEqual(
			expect.objectContaining({
				accept: 'application/json',
				'accept-language': 'de',
			})
		);
		expect((init as RequestInit).headers).not.toHaveProperty('x-test');
	});

	test('custom transport save uses the shared subject POST body', async () => {
		const setConsent = vi.fn().mockResolvedValue({
			data: { subjectId: 'sub_custom' },
			ok: true,
		});

		const SaveAll = () => {
			const save = useSaveConsents();
			return (
				<button
					data-testid="save"
					onClick={async () => {
						await save('all');
					}}
					type="button"
				>
					save
				</button>
			);
		};

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: custom({
						init: vi.fn().mockResolvedValue({
							data: hostedInitOutput(),
							ok: true,
						}),
						setConsent,
					}),
					persistence: false,
					user: {
						externalId: 'user-1',
						identityProvider: 'app',
						properties: { plan: 'pro' },
					},
				}}
			>
				<SaveAll />
			</ConsentProvider>
		);

		await getByTestId('save').click();
		await vi.waitFor(() => expect(setConsent).toHaveBeenCalled());
		expect(setConsent.mock.calls[0]?.[0].body).toMatchObject({
			consentAction: 'all',
			domain: 'localhost',
			externalSubjectId: 'user-1',
			identityProvider: 'app',
			metadata: {
				userProperties: { plan: 'pro' },
			},
			subjectId: expect.any(String),
			type: 'cookie_banner',
		});
	});

	test('bridges init, save, change, and error callbacks', async () => {
		const callbacks = {
			onBannerFetched: vi.fn(),
			onConsentChanged: vi.fn(),
			onConsentSet: vi.fn(),
			onError: vi.fn(),
		};

		const SaveAll = () => {
			const save = useSaveConsents();
			return (
				<button
					data-testid="save"
					onClick={async () => {
						await save('all');
					}}
					type="button"
				>
					save
				</button>
			);
		};

		const { getByTestId, unmount } = await render(
			<ConsentProvider
				options={{
					callbacks,
					mode: offline(),
					persistence: false,
					reloadOnConsentRevoked: false,
				}}
			>
				<SaveAll />
			</ConsentProvider>
		);

		await vi.waitFor(() =>
			expect(callbacks.onBannerFetched).toHaveBeenCalled()
		);
		await getByTestId('save').click();
		await vi.waitFor(() => expect(callbacks.onConsentSet).toHaveBeenCalled());
		expect(callbacks.onConsentChanged).toHaveBeenCalled();
		unmount();

		const fetchError = new Error('init failed');
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockRejectedValue(fetchError);

		const failing = await render(
			<ConsentProvider
				options={{
					callbacks,
					mode: hosted({ url: '/api/c15t' }),
					persistence: false,
				}}
			>
				<div>hosted</div>
			</ConsentProvider>
		);

		await vi.waitFor(() => expect(callbacks.onError).toHaveBeenCalled());
		// Tear down before the kernel's retry timer fires, so the rejected
		// fetch and its act() work cannot bleed into the next test.
		failing.unmount();
		fetchSpy.mockRestore();
	});
});
