/**
 * Tests for the iab() factory.
 */

import { describe, expect, it, vi } from 'vitest';
import { iab } from '../factory';

describe('iab() factory', () => {
	it('enables IAB and injects the runtime module', () => {
		const config = iab({ cmpId: 28 });

		expect(config.enabled).toBe(true);
		expect(config.cmpId).toBe(28);
		expect(config._module).toBeDefined();
		expect(config._module?.createIABManager).toBeTypeOf('function');
		expect(config._module?.initializeIABMode).toBeTypeOf('function');
	});

	it('exposes fetchGVL on the module so offline/fallback modes can load the GVL', () => {
		// Offline mode resolves the GVL via `config._module.fetchGVL`
		// (core/src/client/offline/init.ts). Without it, IAB is silently
		// disabled and the IAB banner never renders in offline mode.
		const config = iab({ cmpId: 28 });

		expect(config._module?.fetchGVL).toBeTypeOf('function');
	});

	it('warns once when isServiceSpecific is false', async () => {
		vi.resetModules();
		const { iab: freshIab } = await import('../factory');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		try {
			freshIab({ cmpId: 28 });
			freshIab({ cmpId: 28, isServiceSpecific: true });
			expect(warn).not.toHaveBeenCalled();

			freshIab({ cmpId: 28, isServiceSpecific: false });
			freshIab({ cmpId: 28, isServiceSpecific: false });
			expect(warn).toHaveBeenCalledTimes(1);
		} finally {
			warn.mockRestore();
		}
	});
});
