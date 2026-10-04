/**
 * Which script loader the page runtime mounts: the one the boot script
 * registered (statically for a site with `scripts`), and none without one.
 *
 * Its own file, because the registration is page-wide.
 */
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { scriptLoaderOnDemand } from '@c15t/core/runtime/provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { boot, registerRuntimeModules } from '../client';
import type { AstroConsentClient } from '../client';
import { resolveOptions } from '../integration';
import { offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';
import { testResolution, testRule } from './policy-fixture';

const OPTIONS: C15tAstroOptions = {
	consentCategories: ['necessary', 'measurement'],
	mode: offlineMode({ policyRules: [testRule] }),
	scripts: [
		{
			category: 'necessary',
			id: 'always',
			src: 'https://example.com/always.js',
		},
	],
};

let client: AstroConsentClient | null = null;

const start = function start(): AstroConsentClient {
	(window as unknown as Record<string, unknown>).__c15tAstroConfig = {
		initialPolicyResolution: testResolution(),
		initialTranslations: { language: 'en', translations: {} },
	};
	client = boot(resolveOptions(OPTIONS));
	return client;
};

const injected = (): Element | null =>
	document.querySelector('script[src="https://example.com/always.js"]');

beforeEach(() => {
	localStorage.clear();
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	(window as unknown as Record<string, unknown>).__c15tAstro = undefined;
});

afterEach(() => {
	client?.dispose();
	client = null;
});

describe('page runtime modules', () => {
	// First, before anything is registered: registration is page-wide.
	it('fails loudly when scripts are configured but nothing registered a loader', () => {
		expect(start).toThrow(/`scripts` needs the module/u);
		expect(injected()).toBeNull();
	});

	it('mounts a registered on-demand script loader once it loads', async () => {
		registerRuntimeModules({ createScriptLoader: scriptLoaderOnDemand });
		start();
		expect(injected()).toBeNull();
		await vi.dynamicImportSettled();
		expect(injected()).not.toBeNull();
	});

	it('mounts a registered script loader with the page', () => {
		const create = vi.fn(createScriptLoader);
		registerRuntimeModules({ createScriptLoader: create });
		start();
		expect(create).toHaveBeenCalledOnce();
		expect(injected()).not.toBeNull();
	});
});
