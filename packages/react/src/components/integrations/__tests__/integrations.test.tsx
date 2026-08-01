import { type ConsentStoreState, defaultTranslationConfig } from 'c15t';
import { createRef, type ReactNode, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { useConsentScript } from '~/hooks/use-consent-script';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { GoogleMap } from '../google-map';
import { YouTubeEmbed, type YouTubeEmbedProps } from '../youtube-embed';

async function waitFor(assertion: () => undefined | boolean, timeoutMs = 1000) {
	const start = Date.now();
	let lastError: unknown;

	while (Date.now() - start < timeoutMs) {
		try {
			const result = assertion();
			if (result !== false) {
				return;
			}
		} catch (error) {
			lastError = error;
		}
		await new Promise((resolve) => setTimeout(resolve, 20));
	}

	if (lastError) {
		throw lastError;
	}
	throw new Error('Timed out waiting for assertion');
}

function Provider({ children }: { children: ReactNode }) {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				noStyle: true,
			}}
		>
			{children}
		</ConsentManagerProvider>
	);
}

function createMockConsentState(overrides: Partial<ConsentStoreState> = {}) {
	const state = {
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		consentInfo: null,
		consentCategories: ['necessary'],
		consentTypes: [],
		loadedScripts: {},
		policyCategories: ['*'],
		policyScopeMode: 'permissive',
		scripts: [],
		translationConfig: defaultTranslationConfig,
		removeScript: vi.fn(),
		setScripts: vi.fn(),
		subscribeToConsentChanges: () => () => undefined,
		getDisplayedConsents: () => [],
		...overrides,
	} as unknown as ConsentStoreState;

	return state;
}

function MockConsentProvider({
	children,
	state,
}: {
	children: ReactNode;
	state: ConsentStoreState;
}) {
	const stateRef = useRef(state);
	stateRef.current = state;
	const storeRef = useRef({
		getState: () => stateRef.current,
		setState: () => undefined,
		subscribe: () => () => undefined,
	});

	return (
		<ConsentStateContext.Provider
			value={{
				state,
				store: storeRef.current,
				manager: null,
			}}
		>
			{children}
		</ConsentStateContext.Provider>
	);
}

function ConsentScriptProbe({
	retryKey,
	script,
}: {
	retryKey?: string | number;
	script: Parameters<typeof useConsentScript>[0]['script'];
}) {
	const result = useConsentScript({ retryKey, script });
	let readyText = 'missing-ready-promise';
	if (result.ready) {
		readyText = 'has-ready-promise';
	}

	return (
		<div>
			<span>{result.status}</span>
			<span>{readyText}</span>
			<span>{result.error?.message}</span>
		</div>
	);
}

function InlineConsentScriptProbe({ onLoad }: { onLoad: () => void }) {
	const result = useConsentScript({
		script: {
			id: 'inline-script',
			src: 'https://example.com/inline.js',
			category: 'necessary',
			onLoad: () => onLoad(),
		},
	});

	return <span>{result.status}</span>;
}

function ToggleGoogleMap({ onReady }: { onReady: () => void }) {
	const [visible, setVisible] = useState(true);

	return (
		<>
			<button
				onClick={() => setVisible((value) => !value)}
				type="button"
			>
				Toggle map
			</button>
			{visible && (
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					onReady={onReady}
					scriptId="route-google-map"
				/>
			)}
		</>
	);
}

function UpdatingGoogleMap() {
	const [renderCount, setRenderCount] = useState(0);
	const [useAlternateView, setUseAlternateView] = useState(false);

	return (
		<>
			<button
				data-action="rerender"
				onClick={() => setRenderCount((value) => value + 1)}
				type="button"
			>
				Rerender parent
			</button>
			<button
				data-action="update"
				onClick={() => setUseAlternateView(true)}
				type="button"
			>
				Update map props
			</button>
			<span>renders: {renderCount}</span>
			<GoogleMap
				apiKey="test-key"
				center={
					useAlternateView
						? { lat: 40.7128, lng: -74.006 }
						: { lat: 51.5072, lng: -0.1276 }
				}
				consentCategory="necessary"
				options={{
					disableDefaultUI: true,
					gestureHandling: useAlternateView ? 'greedy' : 'cooperative',
					styles: [
						{
							featureType: 'poi',
							stylers: [{ visibility: useAlternateView ? 'on' : 'off' }],
						},
					],
				}}
				zoom={useAlternateView ? 11 : 10}
			/>
		</>
	);
}

describe('renderable integrations', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete (window as unknown as Record<string, unknown>).google;
		delete (window as unknown as Record<string, unknown>).gm_authFailure;
	});

	test('keeps YouTube iframe unmounted until consent is available', async () => {
		const { container } = await render(
			<Provider>
				<YouTubeEmbed
					consentCategory="marketing"
					src="https://www.youtube.com/embed/test-video"
					title="Blocked video"
				/>
			</Provider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(container.querySelector('iframe')).toBeNull();
		expect(container.textContent).toContain('Marketing');
	});

	test('renders YouTube iframe through Frame when consent is available', async () => {
		const iframeRef = createRef<HTMLIFrameElement>();
		const { container } = await render(
			<Provider>
				<YouTubeEmbed
					className="video-frame"
					consentCategory="necessary"
					params={{ autoplay: false, controls: true, start: 5 }}
					ref={iframeRef}
					start={15}
					videoId="abc123"
					title="Allowed video"
					wrapperClassName="video-wrapper"
				/>
			</Provider>
		);

		await waitFor(() => {
			expect(container.querySelector('iframe')).not.toBeNull();
		});

		const iframe = container.querySelector('iframe');
		expect(iframe?.src).toContain('youtube-nocookie.com/embed/abc123');
		expect(iframe?.src).toContain('autoplay=0');
		expect(iframe?.src).toContain('controls=1');
		expect(iframe?.src).toContain('start=15');
		expect(iframe?.src).not.toContain('start=5');
		expect(iframe?.className).toBe('video-frame');
		expect(iframe?.loading).toBe('lazy');
		expect(iframeRef.current).toBe(iframe);
		const wrapper = iframe?.closest('.video-wrapper') as HTMLDivElement | null;
		expect(wrapper?.style.aspectRatio).toBe('16 / 9');
		expect(wrapper?.style.minHeight).toBe('200px');
		expect(wrapper?.style.width).toBe('100%');
		expect(iframe?.style.borderWidth).toBe('0px');
		expect(iframe?.style.height).toBe('100%');
		expect(iframe?.style.width).toBe('100%');
	});

	test('preserves YouTube params when URLSearchParams.size is unavailable', async () => {
		const sizeDescriptor = Object.getOwnPropertyDescriptor(
			URLSearchParams.prototype,
			'size'
		);
		Object.defineProperty(URLSearchParams.prototype, 'size', {
			configurable: true,
			get: () => undefined,
		});

		try {
			const { container } = await render(
				<Provider>
					<YouTubeEmbed
						consentCategory="necessary"
						params={{ playsinline: true }}
						start={36}
						title="Legacy browser video"
						videoId="legacy-browser"
					/>
				</Provider>
			);

			await waitFor(() => {
				expect(container.querySelector('iframe')).not.toBeNull();
			});

			const iframe = container.querySelector('iframe');
			expect(iframe?.src).toContain('playsinline=1');
			expect(iframe?.src).toContain('start=36');
		} finally {
			if (sizeDescriptor) {
				Object.defineProperty(
					URLSearchParams.prototype,
					'size',
					sizeDescriptor
				);
			} else {
				Reflect.deleteProperty(URLSearchParams.prototype, 'size');
			}
		}
	});

	test('shows the accessible YouTube loading state until the iframe loads', async () => {
		const { container } = await render(
			<Provider>
				<YouTubeEmbed
					consentCategory="necessary"
					src="https://www.youtube-nocookie.com/embed/loading-fixture"
					title="Loading video"
				/>
			</Provider>
		);

		await waitFor(() => {
			expect(container.querySelector('iframe')).not.toBeNull();
			expect(container.textContent).toContain('Loading content…');
		});

		const iframe = container.querySelector('iframe');
		expect(container.querySelector('[role="status"]')).not.toBeNull();
		expect(iframe?.getAttribute('aria-hidden')).toBe('true');
		expect(iframe?.style.visibility).toBe('hidden');

		iframe?.dispatchEvent(new Event('load', { bubbles: true }));

		await waitFor(() => {
			expect(
				container
					.querySelector('[data-c15t-integration="youtube-embed"]')
					?.getAttribute('data-c15t-status')
			).toBe('ready');
		});
		expect(container.querySelector('[role="status"]')).toBeNull();
		expect(iframe?.getAttribute('aria-hidden')).toBeNull();
		expect(iframe?.style.visibility).toBe('visible');
	});

	test('renders an error fallback instead of throwing when no videoId or src is provided', async () => {
		const invalidProps = {
			consentCategory: 'necessary',
			title: 'Misconfigured video',
		} as unknown as YouTubeEmbedProps;
		const { container } = await render(
			<Provider>
				<YouTubeEmbed {...invalidProps} />
			</Provider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(container.querySelector('iframe')).toBeNull();
		expect(container.textContent).toContain(
			'This content could not be loaded.'
		);
		expect(
			container
				.querySelector('[data-c15t-integration="youtube-embed"]')
				?.getAttribute('data-c15t-status')
		).toBe('error');
	});

	test('keeps Google Maps script unregistered until consent is available', async () => {
		const setScripts = vi.fn();
		const removeScript = vi.fn();
		const state = createMockConsentState({
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			setScripts,
			removeScript,
		});

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="measurement"
					placeholder={<div>Blocked measurement map</div>}
					scriptId="blocked-google-map"
					zoom={10}
				/>
			</MockConsentProvider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(setScripts).not.toHaveBeenCalled();
		expect(removeScript).not.toHaveBeenCalled();
		expect(container.textContent).toContain('measurement');
	});

	test('uses localized category copy for the default Google Maps placeholder', async () => {
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="measurement"
					scriptId="localized-google-map"
				/>
			</MockConsentProvider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(setScripts).not.toHaveBeenCalled();
		expect(container.textContent).toContain(
			'Accept Analytics consent to view this content.'
		);
		expect(container.textContent).toContain('Enable Analytics consent');
		expect(container.textContent).not.toContain('Allow measurement');
	});

	test('renders an accessible default Google Maps loading state', async () => {
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					scriptId="loading-google-map"
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(container.textContent).toContain('Loading content…');
		});
		expect(container.querySelector('[role="status"]')).not.toBeNull();
		expect(
			container
				.querySelector('[data-c15t-integration="google-map"]')
				?.getAttribute('data-c15t-status')
		).toBe('loading');
		expect(
			container
				.querySelector('[data-c15t-integration="google-map"]')
				?.getAttribute('aria-busy')
		).toBe('true');
		expect(setScripts).toHaveBeenCalledTimes(1);
	});

	test('keeps Google Maps script unregistered when the API key is missing', async () => {
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey=""
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					errorFallback={<div>Google Maps requires an API key</div>}
					scriptId="missing-key-google-map"
					zoom={10}
				/>
			</MockConsentProvider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(setScripts).not.toHaveBeenCalled();
		expect(container.textContent).toContain('requires an API key');
	});

	test('keeps configuration errors behind the consent placeholder', async () => {
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey=""
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="measurement"
					errorFallback={<div>Missing browser key</div>}
					placeholder={<div>Consent required first</div>}
					scriptId="blocked-missing-key-google-map"
				/>
			</MockConsentProvider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(setScripts).not.toHaveBeenCalled();
		expect(container.textContent).toContain('Consent required first');
		expect(container.textContent).not.toContain('Missing browser key');
		expect(
			container
				.querySelector('[data-c15t-integration="google-map"]')
				?.getAttribute('data-c15t-status')
		).toBe('blocked');
	});

	test('exposes a ready promise while a consent script is loading', async () => {
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					script={{
						id: 'pending-script',
						src: 'https://example.com/pending.js',
						category: 'necessary',
					}}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(container.textContent).toContain('loading');
			expect(container.textContent).toContain('has-ready-promise');
		});
	});

	test('does not re-register inline script objects or lifecycle callbacks', async () => {
		const onLoad = vi.fn();
		const setScripts = vi.fn((scripts) => {
			const script = scripts[0];
			script?.onLoad?.({
				id: script.id,
				elementId: script.id,
				hasConsent: true,
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
			});
		});
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<InlineConsentScriptProbe onLoad={onLoad} />
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(container.textContent).toContain('ready');
		});
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(setScripts).toHaveBeenCalledTimes(1);
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	test('adopts but never removes a compatible manager-owned script', async () => {
		const script = {
			id: 'manager-owned-script',
			src: 'https://example.com/manager-owned.js',
			category: 'necessary' as const,
		};
		const setScripts = vi.fn();
		const removeScript = vi.fn();
		const state = createMockConsentState({
			loadedScripts: { [script.id]: true },
			removeScript,
			scripts: [script],
			setScripts,
		});

		const rendered = await render(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe script={script} />
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(rendered.container.textContent).toContain('ready');
		});
		await rendered.unmount();

		expect(setScripts).not.toHaveBeenCalled();
		expect(removeScript).not.toHaveBeenCalled();
	});

	test('surfaces conflicting script ids as hook errors', async () => {
		const state = createMockConsentState();

		const { container } = await render(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					script={{
						attributes: { 'data-tenant': 'first' },
						id: 'shared-script',
						src: 'https://example.com/shared.js',
						category: 'necessary',
					}}
				/>
				<ConsentScriptProbe
					script={{
						attributes: { 'data-tenant': 'second' },
						id: 'shared-script',
						src: 'https://example.com/shared.js',
						category: 'necessary',
					}}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(container.textContent).toContain(
				'Conflicting consent script options'
			);
		});
		expect(container.textContent).toContain(
			'choose a different id only when the vendor supports multiple page-level loaders'
		);
		expect(container.textContent).not.toContain(
			'Use a unique script id for each vendor configuration'
		);
	});

	test('retries a failed consent script when retryKey changes', async () => {
		let attempt = 0;
		const removeScript = vi.fn();
		const setScripts = vi.fn((scripts) => {
			const script = scripts[0];
			attempt += 1;

			setTimeout(() => {
				const info = {
					id: script?.id ?? 'retry-script',
					elementId: script?.id ?? 'retry-script',
					hasConsent: true,
					consents: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				};

				if (attempt === 1) {
					script?.onError?.({
						...info,
						error: new Error('Temporary loader failure'),
					});
					return;
				}

				script?.onLoad?.(info);
			}, 0);
		});
		const state = createMockConsentState({ removeScript, setScripts });
		const script = {
			id: 'retry-script',
			src: 'https://example.com/retry.js',
			category: 'necessary' as const,
		};
		const rendered = await render(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					retryKey={0}
					script={script}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(rendered.container.textContent).toContain(
				'Temporary loader failure'
			);
		});

		await rendered.rerender(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					retryKey={1}
					script={script}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(rendered.container.textContent).toContain('ready');
		});
		expect(setScripts).toHaveBeenCalledTimes(2);
		expect(removeScript).toHaveBeenCalledWith('retry-script');
	});

	test('retries one consumer of a failed shared consent script', async () => {
		let attempt = 0;
		const removeScript = vi.fn();
		const setScripts = vi.fn((scripts) => {
			const script = scripts[0];
			attempt += 1;

			setTimeout(() => {
				const info = {
					id: script?.id ?? 'shared-retry-script',
					elementId: script?.id ?? 'shared-retry-script',
					hasConsent: true,
					consents: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				};

				if (attempt === 1) {
					script?.onError?.({
						...info,
						error: new Error('Shared loader failure'),
					});
					return;
				}

				script?.onLoad?.(info);
			}, 0);
		});
		const state = createMockConsentState({ removeScript, setScripts });
		const script = {
			id: 'shared-retry-script',
			src: 'https://example.com/shared-retry.js',
			category: 'necessary' as const,
		};
		const rendered = await render(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					retryKey={0}
					script={script}
				/>
				<ConsentScriptProbe
					retryKey={0}
					script={script}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(rendered.container.textContent).toContain('Shared loader failure');
		});

		await rendered.rerender(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					retryKey={1}
					script={script}
				/>
				<ConsentScriptProbe
					retryKey={0}
					script={script}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(rendered.container.textContent).toContain('ready');
		});
		expect(setScripts).toHaveBeenCalledTimes(2);
		expect(removeScript).toHaveBeenCalledTimes(1);
		expect(removeScript).toHaveBeenCalledWith('shared-retry-script');
	});

	test('gives singleton-safe guidance for conflicting Google Maps loaders', async () => {
		const onError = vi.fn();
		const state = createMockConsentState();

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					language="en"
					scriptId="conflicting-google-map"
				/>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 40.71, lng: -74 }}
					consentCategory="necessary"
					language="fr"
					onError={onError}
					scriptId="conflicting-google-map"
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(onError).toHaveBeenCalled();
		});
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('one page-level loader'),
			})
		);
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining(
					'Do not work around this conflict by changing scriptId'
				),
			})
		);
		expect(container.querySelector('[role="alert"]')).not.toBeNull();
	});

	test('isolates shared script ids between consent managers', async () => {
		const firstSetScripts = vi.fn();
		const secondSetScripts = vi.fn();
		const firstState = createMockConsentState({
			setScripts: firstSetScripts,
		});
		const secondState = createMockConsentState({
			setScripts: secondSetScripts,
		});

		const { container } = await render(
			<>
				<MockConsentProvider state={firstState}>
					<ConsentScriptProbe
						script={{
							id: 'provider-scoped-script',
							src: 'https://first.example.com/sdk.js',
							category: 'necessary',
						}}
					/>
				</MockConsentProvider>
				<MockConsentProvider state={secondState}>
					<ConsentScriptProbe
						script={{
							id: 'provider-scoped-script',
							src: 'https://second.example.com/sdk.js',
							category: 'necessary',
						}}
					/>
				</MockConsentProvider>
			</>
		);

		await waitFor(() => {
			expect(firstSetScripts).toHaveBeenCalledTimes(1);
			expect(secondSetScripts).toHaveBeenCalledTimes(1);
		});
		expect(container.textContent).not.toContain(
			'Conflicting consent script options'
		);
	});

	test('loads Google Maps through the shared script hook and callback readiness', async () => {
		const mapInstance = {
			setCenter: vi.fn(),
			setOptions: vi.fn(),
			setZoom: vi.fn(),
		};
		let mapsApi: unknown;
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			return mapInstance;
		});
		const clearInstanceListeners = vi.fn();
		const onReady = vi.fn();
		const consents = {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		};
		const setScripts = vi.fn((scripts) => {
			const script = scripts[0];
			let callbackName: string | null = null;
			if (script?.src) {
				callbackName = new URL(script.src).searchParams.get('callback');
			}

			setTimeout(() => {
				mapsApi = {
					maps: {
						Map: mapConstructor,
						event: {
							clearInstanceListeners,
						},
					},
				};
				(window as unknown as Record<string, unknown>).google = mapsApi;

				if (callbackName) {
					const callback = (window as unknown as Record<string, unknown>)[
						callbackName
					];
					if (typeof callback === 'function') {
						callback();
					}
				}

				script?.onLoad?.({
					id: script.id,
					elementId: script.id,
					hasConsent: true,
					consents,
				});
			}, 0);
		});
		const removeScript = vi.fn();
		const state = createMockConsentState({
			consents,
			setScripts,
			removeScript,
		});

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					authReferrerPolicy="origin"
					center={{ lat: 51.5, lng: -0.12 }}
					channel="test-channel"
					consentCategory="necessary"
					data-testid="map"
					libraries={['places']}
					mapId="test-map-id"
					mapIds={['test-map-id']}
					onReady={onReady}
					scriptId="ready-google-map"
					solutionChannel="test-solution"
					zoom={10}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(mapConstructor).toHaveBeenCalled();
			expect(onReady).toHaveBeenCalled();
		});

		expect(
			container.querySelector('[data-c15t-integration="google-map"]')
		).not.toBeNull();
		expect(mapConstructor).toHaveBeenCalledWith(
			expect.any(HTMLDivElement),
			expect.objectContaining({
				center: { lat: 51.5, lng: -0.12 },
				mapId: 'test-map-id',
				zoom: 10,
			})
		);
		expect(onReady).toHaveBeenCalledWith(mapInstance, mapsApi);

		const registeredScript = setScripts.mock.calls[0]?.[0]?.[0];
		expect(registeredScript?.persistAfterConsentRevoked).toBe(true);
		const loaderUrl = new URL(registeredScript?.src ?? '');
		expect(loaderUrl.searchParams.get('auth_referrer_policy')).toBe('origin');
		expect(loaderUrl.searchParams.get('channel')).toBe('test-channel');
		expect(loaderUrl.searchParams.get('libraries')).toBe('places');
		expect(loaderUrl.searchParams.get('loading')).toBe('async');
		expect(loaderUrl.searchParams.get('map_ids')).toBe('test-map-id');
		expect(loaderUrl.searchParams.get('solution_channel')).toBe(
			'test-solution'
		);
		expect(mapInstance.setOptions).toHaveBeenCalledWith(
			expect.not.objectContaining({ mapId: 'test-map-id' })
		);
	});

	test('preserves the map viewport across unrelated parent renders', async () => {
		const mapInstance = {
			setCenter: vi.fn(),
			setOptions: vi.fn(),
			setZoom: vi.fn(),
		};
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			return mapInstance;
		});
		(window as unknown as Record<string, unknown>).google = {
			maps: {
				Map: mapConstructor,
				event: {
					clearInstanceListeners: vi.fn(),
				},
			},
		};
		const state = createMockConsentState();

		const { container } = await render(
			<MockConsentProvider state={state}>
				<UpdatingGoogleMap />
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(mapConstructor).toHaveBeenCalledTimes(1);
			expect(mapInstance.setCenter).toHaveBeenCalled();
		});

		mapInstance.setCenter.mockClear();
		mapInstance.setOptions.mockClear();
		mapInstance.setZoom.mockClear();

		const rerenderButton = container.querySelector<HTMLButtonElement>(
			'[data-action="rerender"]'
		);
		rerenderButton?.click();
		await waitFor(() => {
			expect(container.textContent).toContain('renders: 1');
		});
		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(mapConstructor).toHaveBeenCalledTimes(1);
		expect(mapInstance.setCenter).not.toHaveBeenCalled();
		expect(mapInstance.setOptions).not.toHaveBeenCalled();
		expect(mapInstance.setZoom).not.toHaveBeenCalled();

		const updateButton = container.querySelector<HTMLButtonElement>(
			'[data-action="update"]'
		);
		updateButton?.click();
		await waitFor(() => {
			expect(mapInstance.setCenter).toHaveBeenCalledWith({
				lat: 40.7128,
				lng: -74.006,
			});
			expect(mapInstance.setZoom).toHaveBeenCalledWith(11);
			expect(mapInstance.setOptions).toHaveBeenCalledWith(
				expect.objectContaining({
					gestureHandling: 'greedy',
				})
			);
		});
		expect(mapConstructor).toHaveBeenCalledTimes(1);
	});

	test('shares one Google Maps script across multiple map instances', async () => {
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			return {
				setCenter: vi.fn(),
				setOptions: vi.fn(),
				setZoom: vi.fn(),
			};
		});
		const onFirstReady = vi.fn();
		const onSecondReady = vi.fn();
		const setScripts = vi.fn((scripts) => {
			const script = scripts[0];
			let callbackName: string | null = null;
			if (script?.src) {
				callbackName = new URL(script.src).searchParams.get('callback');
			}

			setTimeout(() => {
				(window as unknown as Record<string, unknown>).google = {
					maps: {
						Map: mapConstructor,
					},
				};

				if (callbackName) {
					const callback = (window as unknown as Record<string, unknown>)[
						callbackName
					];
					if (typeof callback === 'function') {
						callback();
					}
				}

				script?.onLoad?.({
					id: script.id,
					elementId: script.id,
					hasConsent: true,
					consents: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				});
			}, 0);
		});
		const state = createMockConsentState({ setScripts });

		await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					onReady={onFirstReady}
					scriptId="shared-google-map"
					zoom={10}
				/>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 40.71, lng: -74 }}
					consentCategory="necessary"
					onReady={onSecondReady}
					scriptId="shared-google-map"
					zoom={12}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(setScripts).toHaveBeenCalledTimes(1);
			expect(mapConstructor).toHaveBeenCalledTimes(2);
			expect(onFirstReady).toHaveBeenCalled();
			expect(onSecondReady).toHaveBeenCalled();
		});
	});

	test('adopts an existing Google Maps API without injecting another script', async () => {
		const mapInstance = {
			setCenter: vi.fn(),
			setOptions: vi.fn(),
			setZoom: vi.fn(),
		};
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			return mapInstance;
		});
		(window as unknown as Record<string, unknown>).google = {
			maps: {
				Map: mapConstructor,
				event: {
					clearInstanceListeners: vi.fn(),
				},
			},
		};
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(mapConstructor).toHaveBeenCalledTimes(1);
		});

		expect(setScripts).not.toHaveBeenCalled();
		const wrapper = container.querySelector(
			'[data-c15t-integration="google-map"]'
		) as HTMLDivElement | null;
		expect(wrapper?.style.height).toBe('320px');
	});

	test('retains one Google Maps loader across route-style remounts', async () => {
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			return {
				setCenter: vi.fn(),
				setOptions: vi.fn(),
				setZoom: vi.fn(),
			};
		});
		const onReady = vi.fn();
		const removeScript = vi.fn();
		const setScripts = vi.fn((scripts) => {
			const script = scripts[0];
			const callbackName = script?.src
				? new URL(script.src).searchParams.get('callback')
				: null;

			setTimeout(() => {
				(window as unknown as Record<string, unknown>).google = {
					maps: {
						Map: mapConstructor,
						event: {
							clearInstanceListeners: vi.fn(),
						},
					},
				};

				if (callbackName) {
					const callback = (window as unknown as Record<string, unknown>)[
						callbackName
					];
					if (typeof callback === 'function') {
						callback();
					}
				}
			}, 0);
		});
		const state = createMockConsentState({ removeScript, setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<ToggleGoogleMap onReady={onReady} />
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(onReady).toHaveBeenCalledTimes(1);
		});

		const toggle = container.querySelector('button');
		toggle?.click();
		await waitFor(() => {
			expect(
				container.querySelector('[data-c15t-integration="google-map"]')
			).toBeNull();
		});

		toggle?.click();
		await waitFor(() => {
			expect(onReady).toHaveBeenCalledTimes(2);
		});

		expect(setScripts).toHaveBeenCalledTimes(1);
		expect(removeScript).not.toHaveBeenCalled();
		expect(mapConstructor).toHaveBeenCalledTimes(2);
	});

	test('renders the error fallback when Google Maps construction fails', async () => {
		const initializationError = new Error('Map constructor failed');
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			throw initializationError;
		});
		(window as unknown as Record<string, unknown>).google = {
			maps: {
				Map: mapConstructor,
				event: {
					clearInstanceListeners: vi.fn(),
				},
			},
		};
		const onError = vi.fn();
		const state = createMockConsentState();

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					errorFallback={<div>Custom map error</div>}
					onError={onError}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(container.textContent).toContain('Custom map error');
		});

		expect(onError).toHaveBeenCalledWith(initializationError);
		expect(
			container
				.querySelector('[data-c15t-integration="google-map"]')
				?.getAttribute('data-c15t-status')
		).toBe('error');
	});

	test('surfaces Google Maps authentication failures', async () => {
		const mapConstructor = vi.fn(function GoogleMapConstructor() {
			return {
				setCenter: vi.fn(),
				setOptions: vi.fn(),
				setZoom: vi.fn(),
			};
		});
		(window as unknown as Record<string, unknown>).google = {
			maps: {
				Map: mapConstructor,
				event: {
					clearInstanceListeners: vi.fn(),
				},
			},
		};
		const onError = vi.fn();
		const state = createMockConsentState();

		const { container } = await render(
			<MockConsentProvider state={state}>
				<GoogleMap
					apiKey="invalid-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					errorFallback={<div>Authentication failed</div>}
					onError={onError}
				/>
			</MockConsentProvider>
		);

		await waitFor(() => {
			expect(mapConstructor).toHaveBeenCalled();
		});

		const authFailure = (window as unknown as Record<string, unknown>)
			.gm_authFailure;
		expect(authFailure).toBeTypeOf('function');
		if (typeof authFailure === 'function') {
			authFailure();
		}

		await waitFor(() => {
			expect(container.textContent).toContain('Authentication failed');
		});
		expect(onError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('failed to authenticate'),
			})
		);
	});
});
