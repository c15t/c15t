import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	initializeEmbedDevTools,
	mountEmbedDevTools,
	unmountEmbedDevTools,
} from '../devtools-runtime';

const { createDevToolsMock, destroyMock } = vi.hoisted(() => {
	const destroy = vi.fn();

	return {
		createDevToolsMock: vi.fn(() => ({
			open: vi.fn(),
			close: vi.fn(),
			toggle: vi.fn(),
			getState: vi.fn(),
			destroy,
		})),
		destroyMock: destroy,
	};
});

vi.mock('@c15t/dev-tools', () => ({
	createDevTools: createDevToolsMock,
}));

describe('embed devtools runtime', () => {
	beforeEach(() => {
		createDevToolsMock.mockClear();
		destroyMock.mockClear();
		document.body.innerHTML = '';

		window.c15tEmbedDevTools = undefined;
		window.__c15tEmbedDevToolsInitialized = false;

		unmountEmbedDevTools();
	});

	it('mounts with c15tStore namespace by default', () => {
		mountEmbedDevTools();

		expect(createDevToolsMock).toHaveBeenCalledWith({
			namespace: 'c15tStore',
			position: undefined,
			defaultOpen: undefined,
		});
	});

	it('reads options from script data attributes', () => {
		const script = document.createElement('script');
		script.src = '/c15t-embed.devtools.iife.js';
		script.dataset.c15tNamespace = 'customNamespace';
		script.dataset.c15tPosition = 'top-left';
		script.dataset.c15tDefaultOpen = 'true';

		Object.defineProperty(document, 'currentScript', {
			configurable: true,
			get: () => script,
		});

		initializeEmbedDevTools();

		expect(createDevToolsMock).toHaveBeenCalledWith({
			namespace: 'customNamespace',
			position: 'top-left',
			defaultOpen: true,
		});
	});

	it('initializes a global runtime object', () => {
		const runtime = initializeEmbedDevTools();

		expect(runtime).toBeDefined();
		expect(window.c15tEmbedDevTools).toBeDefined();
		expect(window.__c15tEmbedDevToolsInitialized).toBe(true);
	});
});
