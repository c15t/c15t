import { expect, test, vi } from 'vitest';

import { createEventDispatcher, getEventDispatcher } from '../events';
import { createConsentKernel } from '../kernel';
import type { Script } from '../libs/script-loader/types';
import {
	createConsentProviderRuntime,
	defaultRuntimeModules,
} from '../runtime';
import type { ConsentProviderRuntimeOptions } from '../runtime/types';
import { custom } from '../transports/mode';

test('delivers only configured and consented events, isolates failures, and stops immediately on revocation', () => {
	const kernel = createConsentKernel({ initialExternalPermissions: {} });
	const capture = vi.fn();
	const track = vi.fn(() => {
		throw new Error('broken SDK');
	});
	const unconfigured = vi.fn();
	const dispatcher = createEventDispatcher({
		getSnapshot: kernel.getSnapshot,
		globals: {
			amplitude: { track: unconfigured },
			mixpanel: { track },
			posthog: { capture },
		},
		scripts: [
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'mixpanel',
				vendor: 'mixpanel',
			},
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'posthog',
				vendor: 'posthog',
			},
		],
	});
	dispatcher.track('search', { length: 4 });
	expect(capture).not.toHaveBeenCalled();
	kernel.set.externalPermissions({ measurement: true });
	dispatcher.track('search', { length: 4 });
	expect(capture).toHaveBeenCalledExactlyOnceWith('search', { length: 4 });
	expect(unconfigured).not.toHaveBeenCalled();
	kernel.set.externalPermissions({});
	dispatcher.track('search', { length: 8 });
	expect(capture).toHaveBeenCalledTimes(1);
	kernel.dispose();
});

test('navigation is deduplicated and denied pageviews are not replayed', () => {
	const kernel = createConsentKernel({
		initialExternalPermissions: { measurement: true },
	});
	const page = vi.fn();
	const dispatcher = createEventDispatcher({
		getSnapshot: kernel.getSnapshot,
		globals: { analytics: { page } },
		pageviews: ['segment'],
		scripts: [
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'segment',
				vendor: 'segment',
			},
		],
	});
	dispatcher.pageview('/first');
	dispatcher.pageview('/second');
	dispatcher.pageview('/second#heading');
	expect(page).toHaveBeenCalledTimes(1);
	kernel.set.externalPermissions({});
	dispatcher.pageview('/third');
	kernel.set.externalPermissions({ measurement: true });
	dispatcher.pageview('/third');
	expect(page).toHaveBeenCalledTimes(1);
	kernel.dispose();
});

test('a runtime dispatcher follows the provider: its scripts, live consent, and one pageview history', async () => {
	const posthog: Script = {
		callbackOnly: true,
		category: 'measurement',
		id: 'posthog',
		vendor: 'posthog',
	};
	const options: ConsentProviderRuntimeOptions = {
		consentCategories: ['measurement'],
		mode: custom({
			init: vi.fn().mockResolvedValue({}),
			save: vi.fn().mockResolvedValue({ ok: true }),
		}),
		scripts: [posthog],
	};
	const runtime = createConsentProviderRuntime(options, defaultRuntimeModules);
	const globals = {
		analytics: { track: vi.fn() },
		mixpanel: { track: vi.fn() },
		posthog: { capture: vi.fn() },
	};
	// A host recreates the dispatcher on every render.
	const render = () =>
		getEventDispatcher(runtime, { globals, pageviews: ['posthog'] });

	render().pageview('/');
	await runtime.kernel.commands.save({ measurement: true });
	render().pageview('/pricing');
	expect(globals.posthog.capture).toHaveBeenCalledWith('$pageview');

	// A handler that revokes, then tracks, before the host re-renders.
	const events = render();
	await runtime.kernel.commands.save({ measurement: false });
	events.track('add_to_cart');
	expect(globals.posthog.capture).toHaveBeenCalledTimes(1);

	// Turning c15t off swaps the kernel; the same dispatcher follows it.
	await runtime.update({ ...options, enabled: false });
	events.track('add_to_cart');
	expect(globals.posthog.capture).toHaveBeenLastCalledWith('add_to_cart', {});
	render().pageview('/pricing');
	expect(globals.posthog.capture).toHaveBeenCalledTimes(2);

	// Scripts from a later update, and scripts the caller adds.
	const mixpanel: Script = { ...posthog, id: 'mixpanel', vendor: 'mixpanel' };
	await runtime.update({ ...options, enabled: false, scripts: [mixpanel] });
	const segment: Script = { ...posthog, id: 'segment', vendor: 'segment' };
	getEventDispatcher(runtime, { globals, scripts: [segment] }).track('search');
	expect(globals.mixpanel.track).toHaveBeenCalledWith('search', {});
	expect(globals.analytics.track).toHaveBeenCalledWith('search', {});
	expect(globals.posthog.capture).toHaveBeenCalledTimes(2);
	runtime.dispose();
});
