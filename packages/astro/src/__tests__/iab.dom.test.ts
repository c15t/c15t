import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ClientModule from '../client';
import type { AstroConsentClient, PageIAB } from '../client';
import type * as IntegrationModule from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import { createTestPageIAB } from './page-iab';
import { testResolution, testRule } from './policy-fixture';

const OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'measurement', 'marketing'],
	mode: offlineMode({ policyRules: [testRule] }),
};

let client: AstroConsentClient | null = null;

/**
 * A fresh copy of the client, so each test starts with nothing registered,
 * the way a page does before its boot script runs.
 */
const loadClient = async function loadClient(): Promise<{
	boot: (options: C15tAstroOptions) => AstroConsentClient;
	registerIAB: typeof ClientModule.registerIAB;
}> {
	vi.resetModules();
	const clientModule: typeof ClientModule = await import('../client');
	const { resolveOptions }: typeof IntegrationModule =
		await import('../integration');
	return {
		boot: (options) => {
			client = clientModule.boot(resolveOptions(options));
			return client;
		},
		registerIAB: clientModule.registerIAB,
	};
};

/** A registered IAB wiring whose calls the test can count. */
const spyPageIAB = function spyPageIAB(): PageIAB & {
	create: ReturnType<typeof vi.fn>;
	mount: ReturnType<typeof vi.fn>;
} {
	const real = createTestPageIAB();
	return {
		create: vi.fn(real.create),
		mount: vi.fn(real.mount),
		whenReady: real.whenReady,
	};
};

beforeEach(() => {
	localStorage.clear();
	document.body.innerHTML = '';
	const globals = window as unknown as Record<string, unknown>;
	globals.__c15tAstro = undefined;
	globals.__c15tAstroConfig = {
		initialPolicyResolution: testResolution(),
		initialTranslations: { language: 'en', translations: {} },
	};
	globals.__tcfapi = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
});

describe('IAB is opt-in', () => {
	it('boots a site without `iab` with no IAB wiring registered', async () => {
		const { boot } = await loadClient();

		const booted = boot(OPTIONS);

		expect(booted.runtime.iab).toBeNull();
		expect('__tcfapi' in window && window.__tcfapi).toBeFalsy();
	});

	it.each([
		['no `iab` option', {}],
		['`iab: false`', { iab: false }],
		['`iab.enabled: false`', { iab: { cmpId: 28, enabled: false } }],
	] as const)(
		'never mounts the CMP with %s, even when wiring is registered',
		async (_label, iabOptions) => {
			const { boot, registerIAB } = await loadClient();
			const pageIAB = spyPageIAB();
			registerIAB(pageIAB);

			const booted = boot({ ...OPTIONS, ...iabOptions });

			expect(pageIAB.mount).not.toHaveBeenCalled();
			expect(pageIAB.create).not.toHaveBeenCalled();
			expect(booted.runtime.iab).toBeNull();
		}
	);

	it('fails loudly when `iab` is set but the boot script registered nothing', async () => {
		const { boot } = await loadClient();

		expect(() => boot({ ...OPTIONS, iab: { cmpId: 28 } })).toThrow(
			/`iab` needs the module/u
		);
	});

	it('mounts the CMP through the registered wiring when `iab` is set', async () => {
		const { boot, registerIAB } = await loadClient();
		const pageIAB = spyPageIAB();
		registerIAB(pageIAB);

		const booted = boot({ ...OPTIONS, iab: { cmpId: 28 } });

		expect(pageIAB.mount).toHaveBeenCalledTimes(1);
		expect(pageIAB.create).toHaveBeenCalledTimes(1);
		expect(booted.runtime.iab).not.toBeNull();
		await pageIAB.whenReady();
	});
});

/**
 * The TCF preference centre is the larger half of the dialog island, and
 * only an IAB site opens it, so it has to stay behind a dynamic import.
 * The package's own test run has no Svelte compiler, so this asserts the
 * seam at the source level.
 */
describe('the dialog island', () => {
	it('reaches the IAB surface only through a dynamic import', () => {
		const source = readFileSync(
			join(process.cwd(), 'src/components/islands/panel-surface.svelte'),
			'utf8'
		);

		expect(source).toContain("import('./iab-dialog-surface.svelte')");
		expect(source).not.toMatch(
			/^\s*import\s+[^;]*'\.\/iab-dialog-surface\.svelte'/mu
		);
	});
});
