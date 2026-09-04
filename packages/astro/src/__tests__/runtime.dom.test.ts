import { afterEach, describe, expect, it, vi } from 'vitest';

import { offlineMode, resolveTransportFactory } from '../mode';
import { createConsentRuntime, normalizeKernelUser } from '../runtime';
import type { ConsentRuntime, ConsentRuntimeIABHandle } from '../runtime';

const TRANSLATIONS = { language: 'en', translations: {} as never };

let runtime: ConsentRuntime | null = null;

const create = function create(
	overrides: Partial<Parameters<typeof createConsentRuntime>[0]> = {}
): ConsentRuntime {
	runtime = createConsentRuntime({
		consentCategories: ['necessary', 'measurement'],
		mode: resolveTransportFactory(offlineMode()),
		translations: TRANSLATIONS,
		...overrides,
	});
	return runtime;
};

afterEach(() => {
	runtime?.dispose();
	runtime = null;
	localStorage.clear();
});

describe('createConsentRuntime', () => {
	it('builds a readable kernel without starting anything', () => {
		const created = create();
		expect(created.started).toBe(false);
		expect(created.kernel.getSnapshot().consents.necessary).toBeDefined();
	});

	it('is idempotent on start', () => {
		const created = create();
		created.start();
		created.start();
		expect(created.started).toBe(true);
	});

	it('does not restart after dispose', () => {
		const created = create();
		created.dispose();
		created.start();
		expect(created.started).toBe(false);
		runtime = null;
	});

	it('grants everything when disabled', () => {
		const created = create({ enabled: false });
		const snapshot = created.kernel.getSnapshot();
		expect(snapshot.consents.marketing).toBe(true);
		expect(snapshot.hasConsented).toBe(true);
		expect(snapshot.activeUI).toBe('none');
	});

	it('layers request overrides on top of the prefetched ones', () => {
		const created = create({
			overrides: { country: 'FR' },
			prefetch: { initialOverrides: { country: 'DE', region: 'BY' } },
		});
		const { overrides } = created.kernel.getSnapshot();
		expect(overrides.country).toBe('FR');
		expect(overrides.region).toBe('BY');
	});

	it('replaces overrides through setOverrides', () => {
		const created = create();
		created.setOverrides({ country: 'US' });
		expect(created.kernel.getSnapshot().overrides.country).toBe('US');
	});

	it('tracks the configured categories', () => {
		const created = create();
		expect(created.consentCategories).toEqual(['necessary', 'measurement']);
		created.setConsentCategories(['necessary']);
		expect(created.consentCategories).toEqual(['necessary']);
	});

	it('never rejects from identify', async () => {
		const created = create();
		await expect(created.identify(undefined)).resolves.toBeUndefined();
		await expect(
			created.identify({ externalId: 'user-1' })
		).resolves.toBeUndefined();
	});
});

describe('IAB injection', () => {
	it('stays unmounted without a factory', () => {
		const created = create({ iab: { cmpId: 42 } });
		created.start();
		expect(created.iab).toBeNull();
	});

	it('mounts through the injected factory and reports the handle', () => {
		const dispose = vi.fn();
		const handle: ConsentRuntimeIABHandle = { dispose };
		const createIAB = vi.fn(() => handle);
		const listener = vi.fn();

		const created = create({ createIAB, iab: { cmpId: 42 } });
		created.onIABChange(listener);
		created.start();

		expect(createIAB).toHaveBeenCalledOnce();
		const [factoryOptions] = createIAB.mock.calls[0] as [{ cmpId: number }];
		expect(factoryOptions.cmpId).toBe(42);
		expect(created.iab).toBe(handle);
		expect(listener).toHaveBeenCalledWith(handle);

		created.dispose();
		expect(dispose).toHaveBeenCalledOnce();
		runtime = null;
	});

	it('stays unmounted with no cmpId anywhere', () => {
		const createIAB = vi.fn(() => ({ dispose: vi.fn() }));
		const created = create({ createIAB, iab: {} });
		created.start();
		expect(createIAB).not.toHaveBeenCalled();
	});

	it('respects iab: false', () => {
		const createIAB = vi.fn(() => ({ dispose: vi.fn() }));
		const created = create({ createIAB, iab: false });
		created.start();
		expect(createIAB).not.toHaveBeenCalled();
	});
});

describe('normalizeKernelUser', () => {
	it('maps a v2 user onto the kernel shape', () => {
		expect(
			normalizeKernelUser({ id: 'abc', identityProvider: 'auth0' } as never)
		).toEqual({ externalId: 'abc', identityProvider: 'auth0' });
	});

	it('passes a kernel user straight through', () => {
		const user = { externalId: 'abc' };
		expect(normalizeKernelUser(user)).toBe(user);
	});

	it('maps nothing to undefined', () => {
		expect(normalizeKernelUser(undefined)).toBeUndefined();
	});
});
