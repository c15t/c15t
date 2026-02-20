import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	bootstrapEmbedRuntime,
	initializeEmbedRuntime,
	mountEmbedRuntime,
	readEmbedPayload,
	registerEmbedIABComponents,
	resetEmbedIABComponents,
	resolveBackendURL,
	unmountEmbedRuntime,
} from '../runtime';
import type { EmbedBootstrapPayload } from '../types';

const {
	renderMock,
	unmountMock,
	createRootMock,
	providerMock,
	bannerMock,
	dialogMock,
	dialogTriggerMock,
} = vi.hoisted(() => {
	const render = vi.fn();
	const unmount = vi.fn();
	const createRoot = vi.fn(() => ({
		render,
		unmount,
	}));

	return {
		renderMock: render,
		unmountMock: unmount,
		createRootMock: createRoot,
		providerMock: vi.fn(() => null),
		bannerMock: vi.fn(() => null),
		dialogMock: vi.fn(() => null),
		dialogTriggerMock: vi.fn(() => null),
	};
});

vi.mock('react-dom/client', () => ({
	createRoot: createRootMock,
}));

vi.mock('@c15t/react', () => ({
	ConsentManagerProvider: providerMock,
	ConsentBanner: bannerMock,
	ConsentDialog: dialogMock,
	ConsentDialogTrigger: dialogTriggerMock,
}));

function getTestPayload(): EmbedBootstrapPayload {
	return {
		init: {
			jurisdiction: 'GDPR',
			location: {
				countryCode: 'DE',
				regionCode: null,
			},
			translations: {
				language: 'en',
				translations: {},
			},
			branding: 'c15t',
			gvl: null,
		},
		options: {
			ui: {
				noStyle: true,
				scrollLock: true,
			},
			theme: {
				slots: {
					bannerCard: {
						className: 'site-a-banner',
					},
				},
			},
		},
		revision: 'site-a@v1',
	};
}

describe('embed runtime', () => {
	beforeEach(() => {
		renderMock.mockClear();
		unmountMock.mockClear();
		createRootMock.mockClear();
		providerMock.mockClear();
		bannerMock.mockClear();
		dialogMock.mockClear();
		dialogTriggerMock.mockClear();

		document.body.innerHTML = '';
		window.localStorage.clear();

		window.__c15tEmbedPayload = undefined;
		window.c15tEmbed = undefined;
		window.__c15tEmbedRuntimeInitialized = false;
		window.__c15tEmbedPendingIABComponents = undefined;

		unmountEmbedRuntime();
		resetEmbedIABComponents();
	});

	it('reads payload from window global', () => {
		const payload = getTestPayload();
		window.__c15tEmbedPayload = payload;

		expect(readEmbedPayload()).toEqual(payload);
	});

	it('resolves backend URL from current script src', () => {
		const script = document.createElement('script');
		script.src = 'https://consent.example.com/api/c15t/embed.js';

		Object.defineProperty(document, 'currentScript', {
			configurable: true,
			get: () => script,
		});

		expect(resolveBackendURL()).toBe('https://consent.example.com/api/c15t');
	});

	it('resolves backend URL from embed script with query params', () => {
		const script = document.createElement('script');
		script.src = 'https://consent.example.com/api/c15t/embed.js?country=GB';
		document.body.appendChild(script);

		Object.defineProperty(document, 'currentScript', {
			configurable: true,
			get: () => null,
		});

		expect(resolveBackendURL()).toBe('https://consent.example.com/api/c15t');
	});

	it('mounts provider with backend styling options', () => {
		const payload = getTestPayload();
		const mountEl = document.createElement('div');
		mountEl.id = 'mount';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount',
		});

		expect(createRootMock).toHaveBeenCalledWith(mountEl);

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		expect(tree.type).toBe(providerMock);
		expect(tree.props.options.backendURL).toBe('/api/c15t');
		expect(tree.props.options.noStyle).toBe(true);
		expect(tree.props.options.scrollLock).toBe(true);
		expect(tree.props.options.store.namespace).toBe('c15tStore');
		expect(tree.props.options.storageConfig).toBeUndefined();
		expect(tree.props.options.theme.slots.bannerCard.className).toBe(
			'site-a-banner'
		);

		const children = tree.props.children as ReactElement[];
		expect(children[0].type).toBe(bannerMock);
		expect(children[0].props.models).toEqual(['opt-in', 'opt-out']);
		expect(children.map((child) => child.type)).toEqual([
			bannerMock,
			dialogTriggerMock,
			dialogMock,
		]);
	});

	it('renders IAB components after addon registration', () => {
		const iabBannerMock = vi.fn(() => null);
		const iabDialogMock = vi.fn(() => null);
		registerEmbedIABComponents({
			Banner: iabBannerMock,
			Dialog: iabDialogMock,
		});

		const payload = getTestPayload();
		const mountEl = document.createElement('div');
		mountEl.id = 'mount-with-iab';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-with-iab',
		});

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		const children = tree.props.children as ReactElement[];
		expect(children.map((child) => child.type)).toEqual([
			bannerMock,
			iabBannerMock,
			iabDialogMock,
			dialogTriggerMock,
			dialogMock,
		]);
	});

	it('does not remount when IAB components register after initial mount', () => {
		const payload = getTestPayload();
		const mountEl = document.createElement('div');
		mountEl.id = 'mount-register-after-mount';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-register-after-mount',
		});

		expect(renderMock).toHaveBeenCalledTimes(1);

		registerEmbedIABComponents({
			Banner: vi.fn(() => null),
			Dialog: vi.fn(() => null),
		});

		expect(renderMock).toHaveBeenCalledTimes(1);
	});

	it('skips IAB components when preload hints exclude them', () => {
		const payload = getTestPayload();
		payload.options = {
			...payload.options,
			componentHints: {
				preload: ['banner', 'dialog'],
			},
		};
		const mountEl = document.createElement('div');
		mountEl.id = 'mount-no-iab';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-no-iab',
		});

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		const children = tree.props.children as ReactElement[];

		expect(children.map((child) => child.type)).toEqual([
			bannerMock,
			dialogTriggerMock,
			dialogMock,
		]);
	});

	it('allows overriding namespace and storage key', () => {
		const payload = getTestPayload();
		const mountEl = document.createElement('div');
		mountEl.id = 'mount-custom';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-custom',
			storeNamespace: 'customEmbedStore',
			storageKey: 'custom-embed-key',
		});

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		expect(tree.props.options.store.namespace).toBe('customEmbedStore');
		expect(tree.props.options.storageConfig.storageKey).toBe(
			'custom-embed-key'
		);
	});

	it('uses store options from payload when runtime overrides are absent', () => {
		const payload = getTestPayload();
		payload.options = {
			...payload.options,
			store: {
				namespace: 'embedPayloadStore',
				storageKey: 'embed-payload-key',
			},
		};

		const mountEl = document.createElement('div');
		mountEl.id = 'mount-payload-store';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-payload-store',
		});

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		expect(tree.props.options.store.namespace).toBe('embedPayloadStore');
		expect(tree.props.options.storageConfig.storageKey).toBe(
			'embed-payload-key'
		);
	});

	it('uses manual overrides from payload options when provided', () => {
		const payload = getTestPayload();
		payload.options = {
			...payload.options,
			overrides: {
				country: 'GB',
				language: 'en-GB',
			},
		};

		const mountEl = document.createElement('div');
		mountEl.id = 'mount-manual-overrides';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-manual-overrides',
		});

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		expect(tree.props.options.overrides).toEqual({
			country: 'GB',
			language: 'en-GB',
		});
	});

	it('prioritizes persisted devtools overrides over manual overrides', () => {
		window.localStorage.setItem(
			'c15t-devtools-overrides',
			JSON.stringify({
				country: 'FR',
				language: 'fr-FR',
				gpc: true,
			})
		);

		const payload = getTestPayload();
		const mountEl = document.createElement('div');
		mountEl.id = 'mount-devtools-priority';
		document.body.appendChild(mountEl);

		mountEmbedRuntime(payload, {
			backendURL: '/api/c15t',
			mountTarget: '#mount-devtools-priority',
			overrides: {
				country: 'GB',
				region: 'ENG',
				language: 'en-GB',
				gpc: false,
			},
		});

		const tree = renderMock.mock.calls[0][0] as ReactElement;
		expect(tree.props.options.overrides).toEqual({
			country: 'FR',
			region: 'ENG',
			language: 'fr-FR',
			gpc: true,
		});
	});

	it('bootstraps only when payload is present', () => {
		expect(bootstrapEmbedRuntime({ backendURL: '/api/c15t' })).toBe(false);

		window.__c15tEmbedPayload = getTestPayload();

		expect(bootstrapEmbedRuntime({ backendURL: '/api/c15t' })).toBe(true);
		expect(createRootMock).toHaveBeenCalledTimes(1);
	});

	it('initializes global runtime and triggers bootstrap', () => {
		window.__c15tEmbedPayload = getTestPayload();

		const runtime = initializeEmbedRuntime();

		expect(runtime).toBeDefined();
		expect(window.c15tEmbed).toBeDefined();
		expect(createRootMock).toHaveBeenCalledTimes(1);
	});
});
