/**
 * @vitest-environment jsdom
 *
 * The runtime's `gpp` option: when it loads and mounts `createGPP`, and
 * when it leaves GPP off.
 */
import { describe, expect, test, vi } from 'vitest';

import { custom } from '../../transports/mode';
import type { KernelTransport } from '../../types';
import { createConsentRuntime } from '../index';
import type { ConsentRuntimeGPPFactory, ConsentRuntimeOptions } from '../types';

const transport: KernelTransport = {
	init: vi.fn().mockResolvedValue({}),
	save: vi.fn().mockResolvedValue({ ok: true }),
};

const setup = function setup(options: Partial<ConsentRuntimeOptions> = {}) {
	const dispose = vi.fn();
	const createGPP = vi.fn<ConsentRuntimeGPPFactory>(() => ({ dispose }));
	const loadGPP = vi.fn(() => Promise.resolve({ createGPP }));
	const onError = vi.fn();
	const runtime = createConsentRuntime({
		callbacks: { onError },
		gpp: true,
		loadGPP,
		mode: custom(transport),
		...options,
	});
	return { createGPP, dispose, loadGPP, onError, runtime };
};

describe('runtime gpp option', () => {
	test('loads and mounts GPP on start with the options and the kernel', async () => {
		const { createGPP, dispose, loadGPP, runtime } = setup({
			gpp: { mspaMode: 'opt-out-option', usFallback: 'none' },
		});
		expect(loadGPP).not.toHaveBeenCalled();

		runtime.start();
		await vi.waitFor(() => expect(createGPP).toHaveBeenCalledOnce());
		expect(createGPP).toHaveBeenCalledWith({
			kernel: runtime.kernel,
			mspaMode: 'opt-out-option',
			usFallback: 'none',
		});

		runtime.dispose();
		expect(dispose).toHaveBeenCalledOnce();
	});

	test('`gpp: true` mounts with the defaults', async () => {
		const { createGPP, runtime } = setup();
		runtime.start();
		await vi.waitFor(() =>
			expect(createGPP).toHaveBeenCalledWith({ kernel: runtime.kernel })
		);
		runtime.dispose();
	});

	test.each([
		['gpp is omitted', { gpp: undefined }],
		['gpp is false', { gpp: false }],
		['the runtime is disabled', { enabled: false }],
		[
			'an external consent source decides',
			{
				consentSource: {
					getPermissions: () => null,
					openPreferences: () => undefined,
					subscribe: () => () => undefined,
				},
			},
		],
	] as const)('stays off when %s', async (_case, options) => {
		const { loadGPP, runtime } = setup(options);
		runtime.start();
		await Promise.resolve();
		expect(loadGPP).not.toHaveBeenCalled();
		runtime.dispose();
	});

	test('never mounts when the runtime is disposed before the module loads', async () => {
		const { createGPP, runtime } = setup();
		runtime.start();
		runtime.dispose();
		await Promise.resolve();
		await Promise.resolve();
		expect(createGPP).not.toHaveBeenCalled();
	});

	test('reports a failed load or mount to onError and keeps running', async () => {
		const failingLoad = setup({
			loadGPP: () => Promise.reject(new Error('chunk failed')),
		});
		failingLoad.runtime.start();
		await vi.waitFor(() =>
			expect(failingLoad.onError).toHaveBeenCalledWith({
				error: 'chunk failed',
			})
		);
		expect(failingLoad.runtime.started).toBe(true);
		failingLoad.runtime.dispose();

		const foreignCmp = setup({
			loadGPP: () =>
				Promise.resolve({
					createGPP: () => {
						throw new Error('another CMP already provides window.__gpp');
					},
				}),
		});
		foreignCmp.runtime.start();
		await vi.waitFor(() =>
			expect(foreignCmp.onError).toHaveBeenCalledWith({
				error: 'another CMP already provides window.__gpp',
			})
		);
		foreignCmp.runtime.dispose();
	});
});
