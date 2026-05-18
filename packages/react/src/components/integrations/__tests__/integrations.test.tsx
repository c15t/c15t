import type { ConsentStoreState } from 'c15t';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsentStateContext } from '~/context/consent-manager-context';
import { useConsentScript } from '~/hooks/use-consent-script';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '~/providers/consent-manager-provider';
import { C15TGoogleMap } from '../google-map';
import { C15TYouTubeEmbed } from '../youtube-embed';

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
	return (
		<ConsentStateContext.Provider
			value={{
				state,
				store: {
					getState: () => state,
					setState: () => undefined,
					subscribe: () => () => undefined,
				},
				manager: null,
			}}
		>
			{children}
		</ConsentStateContext.Provider>
	);
}

function ConsentScriptProbe({
	script,
}: {
	script: Parameters<typeof useConsentScript>[0]['script'];
}) {
	const result = useConsentScript({ script });
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

describe('renderable integrations', () => {
	beforeEach(() => {
		clearConsentRuntimeCache();
		document.body.innerHTML = '';
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete (window as unknown as Record<string, unknown>).google;
	});

	test('keeps YouTube iframe unmounted until consent is available', async () => {
		const { container } = await render(
			<Provider>
				<C15TYouTubeEmbed
					consentCategory="marketing"
					src="https://www.youtube.com/embed/test-video"
					title="Blocked video"
				/>
			</Provider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(container.querySelector('iframe')).toBeNull();
		expect(container.textContent).toContain('marketing');
	});

	test('renders YouTube iframe through Frame when consent is available', async () => {
		const { container } = await render(
			<Provider>
				<C15TYouTubeEmbed
					consentCategory="necessary"
					iframeClassName="video-frame"
					videoId="abc123"
					title="Allowed video"
				/>
			</Provider>
		);

		await waitFor(() => {
			expect(container.querySelector('iframe')).not.toBeNull();
		});

		const iframe = container.querySelector('iframe');
		expect(iframe?.src).toContain('youtube-nocookie.com/embed/abc123');
		expect(iframe?.className).toBe('video-frame');
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
				<C15TGoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="measurement"
					placeholder={<div>Blocked measurement map</div>}
					zoom={10}
				/>
			</MockConsentProvider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(setScripts).not.toHaveBeenCalled();
		expect(removeScript).not.toHaveBeenCalled();
		expect(container.textContent).toContain('measurement');
	});

	test('keeps Google Maps script unregistered when the API key is missing', async () => {
		const setScripts = vi.fn();
		const state = createMockConsentState({ setScripts });

		const { container } = await render(
			<MockConsentProvider state={state}>
				<C15TGoogleMap
					apiKey=""
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					errorFallback={<div>Google Maps requires an API key</div>}
					zoom={10}
				/>
			</MockConsentProvider>
		);

		await new Promise((resolve) => requestAnimationFrame(resolve));

		expect(setScripts).not.toHaveBeenCalled();
		expect(container.textContent).toContain('requires an API key');
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

	test('surfaces conflicting script ids as hook errors', async () => {
		const state = createMockConsentState();

		const { container } = await render(
			<MockConsentProvider state={state}>
				<ConsentScriptProbe
					script={{
						id: 'shared-script',
						src: 'https://example.com/first.js',
						category: 'necessary',
					}}
				/>
				<ConsentScriptProbe
					script={{
						id: 'shared-script',
						src: 'https://example.com/second.js',
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
	});

	test('loads Google Maps through the shared script hook and callback readiness', async () => {
		const mapInstance = {};
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
				(window as unknown as Record<string, unknown>).google = {
					maps: {
						Map: mapConstructor,
						event: {
							clearInstanceListeners,
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
				<C15TGoogleMap
					apiKey="test-key"
					center={{ lat: 51.5, lng: -0.12 }}
					consentCategory="necessary"
					data-testid="map"
					onReady={onReady}
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
		expect(mapConstructor).toHaveBeenCalledWith(expect.any(HTMLDivElement), {
			center: { lat: 51.5, lng: -0.12 },
			zoom: 10,
			mapId: undefined,
		});
	});
});
