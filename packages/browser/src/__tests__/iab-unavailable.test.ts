/**
 * A backend policy that uses the `iab` model, on a page that cannot show
 * it: the default build, or the IAB build with IAB turned off.
 *
 * The stock banner and dialog stand aside for an `iab` policy, so the
 * visitor would get no banner at all. The client reports an
 * `IABUnavailableError` as an `error` event and throws it as an uncaught
 * error.
 */
import { deferInitGvl, IAB_UNAVAILABLE_ERROR_CODE } from '@c15t/core';
import type { InitResponse } from '@c15t/core';
import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { custom } from '../index';
import { offline } from '../transports/offline';
import type { ConsentClient, ScriptTagClientOptions } from '../types';
import { init, initIAB } from './fixtures/factory-init';

const policy = (model: PolicyRule['model']) =>
	writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['marketing'],
					id: `browser-${model}`,
					match: { fallback: true },
					model,
					prompt: 'choice',
					scopeMode: 'permissive',
				},
			],
		})
	);

const initResponse = (
	gvl: 'inline' | 'reference' | 'null',
	model: PolicyRule['model'] = 'iab'
): InitResponse => {
	const body = {
		cmpId: 28,
		gvl: gvl === 'null' ? null : completeGVL,
		policyResolution: policy(model),
	};
	return (
		gvl === 'reference'
			? deferInitGvl(body as never, 'https://consent.example.com/gvl')
			: body
	) as InitResponse;
};

const clients: ConsentClient[] = [];

const start = async function start(
	entry: typeof init,
	response: InitResponse,
	options: ScriptTagClientOptions = {}
): Promise<{ client: ConsentClient; errors: Error[]; thrown: unknown[] }> {
	const errors: Error[] = [];
	const thrown: unknown[] = [];
	// The client throws from a microtask, outside the kernel's listener loop;
	// run it here to catch what would reach the console.
	vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((task) => {
		try {
			task();
		} catch (error) {
			thrown.push(error);
		}
	});
	const client = entry({
		consentCategories: ['necessary', 'marketing'],
		mode: custom({
			init: () => Promise.resolve(response),
			save: () => Promise.resolve({ ok: true }),
		}),
		...options,
	});
	client.on('error', (error) => errors.push(error));
	clients.push(client);
	await client.ready();
	return { client, errors, thrown };
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	vi.restoreAllMocks();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]?.trim()}=; Max-Age=0; path=/`;
	}
	document.body.replaceChildren();
	(window as { __tcfapi?: unknown }).__tcfapi = undefined;
});

describe.each([
	['the default build', init, {}, 'loads the build without IAB'],
	[
		'the IAB build with `iab: false`',
		initIAB,
		{ iab: false },
		'IAB is turned off',
	],
] as const)('an `iab` policy on %s', (_label, entry, options, problem) => {
	it.each(['inline', 'reference'] as const)(
		'throws once /init sends the vendor list by %s',
		async (gvl) => {
			const { errors, thrown } = await start(entry, initResponse(gvl), options);

			await vi.waitFor(() => {
				expect(thrown).toHaveLength(1);
			});
			expect(thrown[0]).toMatchObject({ code: IAB_UNAVAILABLE_ERROR_CODE });
			expect((thrown[0] as Error).message).toContain(problem);
			expect(errors).toEqual([thrown[0]]);
		}
	);

	it('throws even when the backend turns IAB off with `gvl: null`', async () => {
		// The stock UI stands aside for every `iab` policy, so this page shows
		// no banner either way.
		const { thrown } = await start(entry, initResponse('null'), options);

		await vi.waitFor(() => {
			expect(thrown).toHaveLength(1);
		});
		expect(thrown[0]).toMatchObject({ code: IAB_UNAVAILABLE_ERROR_CODE });
	});

	it('shows the banner for a policy that is not IAB', async () => {
		const { client, thrown } = await start(
			entry,
			initResponse('inline', 'opt-in'),
			options
		);

		await vi.waitFor(() => {
			expect(
				client.ui?.root.querySelector('[data-testid="consent-banner-root"]')
			).not.toBeNull();
		});
		expect(thrown).toEqual([]);
	});
});

describe('offline mode without IAB', () => {
	it.each([
		['the recommended pack', undefined],
		[
			'an `iab` rule',
			[
				{
					categories: ['marketing'],
					id: 'offline-iab',
					match: { fallback: true },
					model: 'iab',
					prompt: 'choice',
					scopeMode: 'permissive',
				} satisfies PolicyRule,
			],
		],
	] as const)('throws nothing with %s', async (_label, policyRules) => {
		const thrown: unknown[] = [];
		vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((task) => {
			try {
				task();
			} catch (error) {
				thrown.push(error);
			}
		});
		const client = init({
			mode: offline({ policyRules: policyRules && [...policyRules] }),
		});
		clients.push(client);
		await client.ready();

		expect(thrown).toEqual([]);
	});
});

describe('an `iab` policy on the IAB build with IAB on', () => {
	it('throws nothing', async () => {
		const { errors, thrown } = await start(initIAB, initResponse('inline'), {
			iab: { cmpId: 28 },
		});

		expect(thrown).toEqual([]);
		expect(
			errors.filter(
				(error) =>
					(error as { code?: string }).code === IAB_UNAVAILABLE_ERROR_CODE
			)
		).toEqual([]);
	});
});
