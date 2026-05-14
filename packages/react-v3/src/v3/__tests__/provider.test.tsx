import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useTheme } from '../../hooks/use-theme';
import { InlineLegalLinks } from '../components/shared/primitives/legal-links';
import {
	ConsentProvider,
	type ConsentProviderOptions,
	useConsent,
	useOverrides,
	usePolicy,
	useSaveConsents,
	useSetConsent,
	useSnapshot,
	useTranslations,
	useUser,
} from '../index';

const STORAGE_KEY = 'c15t-provider-test';

function clearCookies() {
	for (const cookie of document.cookie.split(';')) {
		const key = cookie.split('=')[0]?.trim();
		if (key) {
			// biome-ignore lint/suspicious/noDocumentCookie: Test cleanup needs legacy cookie API.
			document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
}

function withProvider(options = {}) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<ConsentProvider options={{ ...options }}>{children}</ConsentProvider>
	);
	return { Wrapper };
}

beforeEach(() => {
	localStorage.clear();
	clearCookies();
	vi.restoreAllMocks();
});

describe('v3 ConsentProvider options API', () => {
	test('keeps one kernel instance across provider rerenders', async () => {
		function Probe() {
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
		}

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
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
					persistence: false,
					prefetch: { initialConsents: { marketing: false } },
					theme: { slots: { bannerCard: 'updated' } },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('marketing')).toHaveTextContent('true');
	});

	test('syncs dynamic user option after mount', async () => {
		function Probe() {
			const user = useUser();
			return <div data-testid="user">{user?.externalId ?? 'none'}</div>;
		}

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
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
			new Response(JSON.stringify({}), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			})
		);

		function Probe() {
			const overrides = useOverrides();
			return <div data-testid="country">{overrides.country ?? 'none'}</div>;
		}

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
					mode: 'hosted',
					backendURL: '/api/c15t',
					customFetch: fetchSpy,
					persistence: false,
					overrides: { country: 'US' },
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
					mode: 'hosted',
					backendURL: '/api/c15t',
					customFetch: fetchSpy,
					persistence: false,
					overrides: { country: 'DE' },
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('country')).toHaveTextContent('DE');
		await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
		const body = JSON.parse(
			(fetchSpy.mock.calls[1]?.[1] as RequestInit).body as string
		);
		expect(body.overrides).toEqual({ country: 'DE' });
	});

	test('syncs enabled option after mount', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					policy: { id: 'gdpr', model: 'opt-in', ui: { mode: 'banner' } },
				}),
				{
					status: 200,
					headers: { 'content-type': 'application/json' },
				}
			)
		);

		function Probe() {
			const snapshot = useSnapshot();
			return <div data-testid="active-ui">{snapshot.activeUI}</div>;
		}

		const { getByTestId, rerender } = await render(
			<ConsentProvider
				options={{
					enabled: false,
					mode: 'hosted',
					backendURL: '/api/c15t',
					customFetch: fetchSpy,
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
					mode: 'hosted',
					backendURL: '/api/c15t',
					customFetch: fetchSpy,
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
				consents: { marketing: true },
				consentInfo: { subjectId: 'sub_111', time: Date.now() },
			})
		);

		const { Wrapper } = withProvider({
			storageConfig: { storageKey: STORAGE_KEY },
		});

		function Probe() {
			const marketing = useConsent('marketing');
			return <div data-testid="marketing">{String(marketing)}</div>;
		}

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
				consents: { marketing: true },
				consentInfo: { subjectId: 'sub_111', time: Date.now() },
			})
		);

		const { Wrapper } = withProvider({
			persistence: false,
			storageConfig: { storageKey: STORAGE_KEY },
		});

		function Probe() {
			const marketing = useConsent('marketing');
			return <div data-testid="marketing">{String(marketing)}</div>;
		}

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

		function Probe() {
			const marketing = useConsent('marketing');
			const snapshot = useSnapshot();
			return (
				<div data-testid="probe">
					{String(marketing)}|{snapshot.activeUI}
				</div>
			);
		}

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					enabled: false,
					mode: 'hosted',
					backendURL: '/api/c15t',
					scripts: [
						{
							id: 'disabled-script',
							src: 'https://example.com/disabled.js',
							category: 'marketing',
						},
					],
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('probe')).toHaveTextContent('true|none');
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(
			document.head.querySelector(
				'script[src="https://example.com/disabled.js"]'
			)
		).toBeNull();
	});

	test('provides theme and v3 UI config without changing kernel context', async () => {
		function ThemeProbe() {
			const theme = useTheme();
			const slot = theme.theme?.slots?.consentBannerCard;
			const className =
				typeof slot === 'object' && slot !== null ? slot.className : '';

			return (
				<div data-testid="theme">
					{String(theme.noStyle)}|{className}
				</div>
			);
		}

		function KernelProbe() {
			const marketing = useConsent('marketing');
			return <div data-testid="kernel">{String(marketing)}</div>;
		}

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					persistence: false,
					prefetch: { initialConsents: { marketing: true } },
					noStyle: true,
					theme: {
						slots: {
							consentBannerCard: {
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
				}}
			>
				<ThemeProbe />
				<KernelProbe />
				<InlineLegalLinks
					links={['privacyPolicy']}
					testIdPrefix="provider-legal-link"
					themeKey="consentBannerDescription"
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

	test('accepts deprecated v2-shaped options as migration fallbacks', async () => {
		const options = {
			mode: 'offline',
			persistence: false,
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
			offlinePolicy: {
				policy: {
					id: 'legacy-offline-policy',
					model: 'opt-in',
					consent: {
						categories: ['marketing'],
						scopeMode: 'strict',
					},
					ui: {
						mode: 'banner',
					},
				},
				policySnapshotToken: 'legacy-token',
			},
			store: {
				storageConfig: { storageKey: STORAGE_KEY },
				initialConsentCategories: ['marketing'],
				legalLinks: {
					privacyPolicy: {
						href: '/store-privacy',
						label: 'Store Privacy',
					},
				},
			},
		} satisfies ConsentProviderOptions;

		function Probe() {
			const translations = useTranslations();
			const policy = usePolicy();
			return (
				<div data-testid="legacy">
					{translations?.language}|{policy?.id}
				</div>
			);
		}

		const { getByTestId } = await render(
			<ConsentProvider options={options}>
				<Probe />
				<InlineLegalLinks
					links={['privacyPolicy']}
					testIdPrefix="store-legal-link"
					themeKey="consentBannerDescription"
				/>
			</ConsentProvider>
		);

		await expect
			.element(getByTestId('legacy'))
			.toHaveTextContent('de|legacy-offline-policy');
		await expect
			.element(getByTestId('store-legal-link-privacyPolicy'))
			.toHaveAttribute('href', '/store-privacy');
	});

	test('uses deprecated ssrData as a v3 prefetch bridge', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

		function Probe() {
			const snapshot = useSnapshot();
			return <div data-testid="active-ui">{snapshot.activeUI}</div>;
		}

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: 'hosted',
					backendURL: '/api/c15t',
					customFetch: fetchSpy,
					persistence: false,
					ssrData: Promise.resolve({
						init: {
							policy: {
								id: 'gdpr',
								model: 'opt-in',
								ui: { mode: 'banner' },
							},
							location: {
								countryCode: 'DE',
								regionCode: null,
							},
							translations: {
								language: 'en',
								translations: {},
							},
							branding: 'c15t',
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

	test('maps hosted v2 transport options into the v3 hosted transport', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					policy: {
						id: 'gdpr',
						model: 'opt-in',
						ui: { mode: 'banner' },
					},
				}),
				{ status: 200 }
			)
		);

		function Probe() {
			const snapshot = useSnapshot();
			return <div data-testid="active-ui">{snapshot.activeUI}</div>;
		}

		const { getByTestId } = await render(
			<ConsentProvider
				options={{
					mode: 'c15t',
					backendURL: '/custom-c15t',
					headers: { 'x-test': 'yes' },
					customFetch: fetchSpy,
					retryConfig: { maxRetries: 2 },
					persistence: false,
				}}
			>
				<Probe />
			</ConsentProvider>
		);

		await expect.element(getByTestId('active-ui')).toHaveTextContent('banner');
		expect(fetchSpy).toHaveBeenCalledWith(
			'/custom-c15t/init',
			expect.objectContaining({
				headers: expect.objectContaining({
					'x-test': 'yes',
				}),
			})
		);
	});

	test('bridges init, save, change, and error callbacks', async () => {
		const callbacks = {
			onBannerFetched: vi.fn(),
			onConsentSet: vi.fn(),
			onConsentChanged: vi.fn(),
			onError: vi.fn(),
		};

		function SaveAll() {
			const save = useSaveConsents();
			return (
				<button
					data-testid="save"
					onClick={() => void save('all')}
					type="button"
				>
					save
				</button>
			);
		}

		const { getByTestId, unmount } = await render(
			<ConsentProvider
				options={{
					persistence: false,
					callbacks,
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
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(fetchError);

		await render(
			<ConsentProvider
				options={{
					mode: 'hosted',
					backendURL: '/api/c15t',
					persistence: false,
					callbacks,
				}}
			>
				<div>hosted</div>
			</ConsentProvider>
		);

		await vi.waitFor(() => expect(callbacks.onError).toHaveBeenCalled());
	});
});
