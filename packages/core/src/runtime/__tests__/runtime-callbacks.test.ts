/**
 * @vitest-environment jsdom
 *
 * `wireRuntimeCallbacks` — kernel events mapped onto provider callbacks.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import type { ConsentKernel, KernelTranslations } from '../../types';
import { stringifyRuntimeError, wireRuntimeCallbacks } from '../callbacks';

const fallbackTranslations: KernelTranslations = {
	language: 'en',
	translations: {} as never,
};

const createKernel = function createKernel(): ConsentKernel {
	return createConsentKernel({
		transport: {
			init: vi.fn().mockResolvedValue({}),
			save: vi.fn().mockResolvedValue({ ok: true }),
		},
	});
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('stringifyRuntimeError', () => {
	test('renders errors, strings and structures', () => {
		expect(stringifyRuntimeError(new Error('boom'))).toBe('boom');
		expect(stringifyRuntimeError('boom')).toBe('boom');
		expect(stringifyRuntimeError({ code: 1 })).toBe('{"code":1}');
	});
});

describe('wireRuntimeCallbacks', () => {
	test('reports consent changes and previous state on save', async () => {
		const kernel = createKernel();
		const onConsentSet = vi.fn();
		const onConsentChanged = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onConsentChanged, onConsentSet },
			fallbackTranslations,
			kernel,
		});

		await kernel.commands.save({ marketing: true });

		expect(onConsentSet).toHaveBeenCalledTimes(1);
		expect(onConsentChanged).toHaveBeenCalledTimes(1);
		expect(onConsentChanged.mock.calls[0]?.[0]).toMatchObject({
			allowedCategories: expect.arrayContaining(['marketing']),
		});

		dispose();
		kernel.dispose();
	});

	test('reloads once a granted category is revoked', async () => {
		const kernel = createKernel();
		const reload = vi.fn();
		vi.spyOn(window, 'location', 'get').mockReturnValue({
			reload,
		} as unknown as Location);
		const onBeforeConsentRevocationReload = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onBeforeConsentRevocationReload },
			fallbackTranslations,
			kernel,
		});

		await kernel.commands.save({ marketing: true });
		expect(reload).not.toHaveBeenCalled();

		await kernel.commands.save({ marketing: false });
		expect(onBeforeConsentRevocationReload).toHaveBeenCalledTimes(1);
		expect(reload).toHaveBeenCalledTimes(1);

		dispose();
		kernel.dispose();
	});

	test('honours `reloadOnConsentRevoked: false`', async () => {
		const kernel = createKernel();
		const reload = vi.fn();
		vi.spyOn(window, 'location', 'get').mockReturnValue({
			reload,
		} as unknown as Location);
		const dispose = wireRuntimeCallbacks({
			fallbackTranslations,
			kernel,
			reloadOnConsentRevoked: false,
		});

		await kernel.commands.save({ marketing: true });
		await kernel.commands.save({ marketing: false });
		expect(reload).not.toHaveBeenCalled();

		dispose();
		kernel.dispose();
	});

	test('stops firing after dispose', async () => {
		const kernel = createKernel();
		const onConsentSet = vi.fn();
		const dispose = wireRuntimeCallbacks({
			callbacks: { onConsentSet },
			fallbackTranslations,
			kernel,
		});

		dispose();
		await kernel.commands.save({ marketing: true });
		expect(onConsentSet).not.toHaveBeenCalled();

		kernel.dispose();
	});
});
