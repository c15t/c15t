import { describe, expect, it, vi } from 'vitest';

import { resolveOptions } from '../integration';
import { createConsentMiddleware } from '../middleware-handler';
import { hostedMode, offlineMode } from '../mode';
import { resolveConsentContext } from '../server';
import type { C15tAstroOptions, C15tLocals } from '../types';
import { testRule } from './policy-fixture';

const OFFLINE: C15tAstroOptions = {
	mode: offlineMode({ policyRules: [testRule] }),
};

/**
 * Run the middleware the way `astro build` does for a prerendered page.
 * The request's headers throw when read: Astro warns on any access to them
 * during a prerender, and they describe the build machine, not a visitor.
 */
const runPrerendered = async function runPrerendered(
	options: C15tAstroOptions,
	fetchImpl?: typeof globalThis.fetch
): Promise<C15tLocals> {
	const middleware = createConsentMiddleware(resolveOptions(options), {
		fetch: fetchImpl,
	});
	const locals = {} as { c15t: C15tLocals };
	const request = {
		get headers(): Headers {
			throw new Error('read a prerendered request’s headers');
		},
		url: 'https://example.com/',
	};
	await middleware(
		{ isPrerendered: true, locals, request } as never,
		vi.fn(() => new Response('ok')) as never
	);
	return locals.c15t;
};

describe('prerendered routes', () => {
	it('never reads the request headers', async () => {
		const c15t = await runPrerendered(OFFLINE);
		expect(c15t.prerendered).toBe(true);
	});

	it('leaves visitor state out of the inlined config', async () => {
		// A consent cookie on the build request must not become everyone's.
		const c15t = await resolveConsentContext({
			headers: new Headers({
				cookie: 'c15t=v=3&sid=sub_build',
				'sec-gpc': '1',
			}),
			options: resolveOptions(OFFLINE),
			prerendered: true,
		});
		// Any `initialRecords` at all stop the browser reading its own cookie.
		expect(c15t.config).not.toHaveProperty('initialRecords');
		expect(c15t.config).not.toHaveProperty('now');
		expect(c15t.config).not.toHaveProperty('initialPrivacySignals');
	});

	it('leaves a hosted policy for the browser to resolve', async () => {
		const fetchImpl = vi.fn();
		const c15t = await runPrerendered(
			{ mode: hostedMode({ url: 'https://consent.example.com' }) },
			fetchImpl as never
		);
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(c15t.hasPolicy).toBe(false);
	});
});
