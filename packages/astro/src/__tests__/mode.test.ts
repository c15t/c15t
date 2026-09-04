import type { ProviderTransportContext } from '@c15t/core';
import { describe, expect, it, vi } from 'vitest';

import {
	hostedMode,
	manifestMode,
	offlineMode,
	resolveTransportFactory,
} from '../mode';

const context: ProviderTransportContext = {
	consentCategories: ['necessary', 'measurement'],
	prefetch: {},
	translations: { language: 'en', translations: {} as never },
};

describe('mode descriptors', () => {
	it('are plain serializable objects', () => {
		expect(
			JSON.parse(JSON.stringify(hostedMode({ url: '/api/c15t' })))
		).toEqual({ type: 'hosted', url: '/api/c15t' });
		expect(offlineMode()).toEqual({ type: 'offline' });
		expect(manifestMode({ backendURL: 'https://c.example.com' })).toEqual({
			backendURL: 'https://c.example.com',
			type: 'manifest',
		});
	});
});

describe('resolveTransportFactory', () => {
	it('reports the transport kind for window.c15t', () => {
		expect(resolveTransportFactory(hostedMode({ url: '/x' })).kind).toBe(
			'hosted'
		);
		expect(resolveTransportFactory(offlineMode()).kind).toBe('offline');
		expect(resolveTransportFactory(manifestMode()).kind).toBe('hosted');
	});

	it('resolves an offline policy with no network at all', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const transport = resolveTransportFactory(offlineMode())(context);
		const response = await transport.init?.({ overrides: {}, user: null });
		expect(response?.policy?.ui?.mode).toBe('banner');
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});

	it('points manifest mode at the injected init route', async () => {
		const fetchImpl = vi.fn(() => Response.json({}));
		const transport = resolveTransportFactory(manifestMode(), {
			backendURL: 'https://consent.example.com',
			initPath: '/api/c15t/init',
		})(context);
		await transport
			.init?.({ overrides: {}, user: null })
			.catch(() => undefined);
		expect(fetchImpl).not.toHaveBeenCalled();
	});

	it('names the fix for an unknown mode', () => {
		expect(() =>
			resolveTransportFactory({ type: 'nope' } as never)
		).toThrowError(/hosted\(\), offline\(\) or manifest\(\)/u);
	});
});
