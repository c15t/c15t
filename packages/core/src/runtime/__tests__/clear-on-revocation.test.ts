/** @vitest-environment jsdom */
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test } from 'vitest';

import {
	matchedResolution,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { custom } from '../../transports/mode';
import type { InitResponse } from '../../types';
import { createConsentRuntime } from '../index';
import type { ConsentRuntime, ConsentRuntimeOptions } from '../types';

const runtimes: ConsentRuntime[] = [];
const config = {
	measurement: {
		cookies: ['_analytics'],
		localStorage: ['analytics:*'],
		sessionStorage: ['analytics:*'],
	},
};
const resolution = matchedResolution(optInRule());

const seed = () => {
	document.cookie = '_analytics=visitor; path=/';
	localStorage.setItem('analytics:visitor', 'visitor');
	sessionStorage.setItem('analytics:session', 'session');
};

const createRuntime = (options: Partial<ConsentRuntimeOptions> = {}) => {
	const runtime = createConsentRuntime({
		clearOnRevocation: config,
		mode: custom({
			init: () =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(resolution),
				}),
			save: () => Promise.resolve({ ok: true }),
		}),
		prefetch: { initialPolicyResolution: resolution },
		...options,
	});
	runtimes.push(runtime);
	return runtime;
};

beforeEach(() => {
	localStorage.clear();
	sessionStorage.clear();
	for (const pair of document.cookie.split(';')) {
		const name = pair.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; Max-Age=0; Path=/`;
		}
	}
});

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
});

test('construction is inert; startup clears denied storage after hydration', () => {
	seed();
	const runtime = createRuntime();
	expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
	runtime.start();
	expect(document.cookie).not.toContain('_analytics=');
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
	expect(sessionStorage.getItem('analytics:session')).toBeNull();
});

test.each([false, undefined])(
	'disabled or omitted cleanup stays inert (%s)',
	(enabled) => {
		seed();
		const runtime = createRuntime(
			enabled === false ? { enabled: false } : { clearOnRevocation: undefined }
		);
		runtime.start();
		expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
	}
);

test('preserves a persisted grant on reload, then clears before public callbacks', async () => {
	const first = createRuntime();
	first.start();
	await first.kernel.commands.save('all');
	first.dispose();
	seed();
	let valueAtCallback: string | null | undefined;
	const reloaded = createRuntime({
		callbacks: {
			onPermissionsChanged: ({ snapshot }) => {
				if (!snapshot.effectivePermissions.measurement) {
					valueAtCallback = localStorage.getItem('analytics:visitor');
				}
			},
		},
	});
	reloaded.start();
	expect(reloaded.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		true
	);
	expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
	await reloaded.kernel.commands.save('none');
	expect(valueAtCallback).toBeNull();
	expect(document.cookie).not.toContain('_analytics=');
	expect(sessionStorage.getItem('analytics:session')).toBeNull();
});

test('waits for hosted policy resolution instead of sweeping the provisional fallback', async () => {
	seed();
	const pending = Promise.withResolvers<InitResponse>();
	const runtime = createRuntime({
		mode: custom({ init: () => pending.promise }),
		prefetch: undefined,
	});
	const applied = Promise.withResolvers<undefined>();
	runtime.kernel.events.on('command:init:completed', () =>
		applied.resolve(undefined)
	);
	runtime.start();
	expect(runtime.kernel.getSnapshot().policyPending).toBe(true);
	expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
	pending.resolve({
		policyResolution: writePolicyResolutionWire(
			matchedResolution(optOutRule())
		),
	});
	await applied.promise;
	expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		true
	);
	expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
	await runtime.kernel.commands.save('none');
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
});

test('preserves custom persistence keys matched by cleanup patterns', async () => {
	const runtime = createRuntime({
		clearOnRevocation: {
			measurement: { cookies: ['analytics*'], localStorage: ['analytics*'] },
		},
		persistence: { storageConfig: { storageKey: 'analytics-consent' } },
	});
	runtime.start();
	await runtime.kernel.commands.save('all');
	seed();
	await runtime.kernel.commands.save('none');
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
	expect(localStorage.getItem('analytics-consent')).not.toBeNull();
	expect(document.cookie).toContain('analytics-consent=');
});

test('script revocation callbacks run before storage cleanup', async () => {
	const runtime = createRuntime({
		scripts: [
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'analytics',
				onConsentChange: ({ hasConsent }) => {
					if (!hasConsent) {
						localStorage.setItem('analytics:visitor', 'last-write');
					}
				},
			},
		],
	});
	runtime.start();
	await runtime.kernel.commands.save('all');
	await runtime.kernel.commands.save('none');
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
});

test('disposal disconnects cleanup and does not delete data', async () => {
	const runtime = createRuntime();
	runtime.start();
	await runtime.kernel.commands.save('all');
	seed();
	runtime.dispose();
	expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
	runtime.kernel.hydrate({ choice: null });
	expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
});
