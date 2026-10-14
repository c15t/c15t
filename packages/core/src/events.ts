import type { Script } from './libs/script-loader/types';
import { evaluateConsent, getEffectiveGateState } from './modules/has';
import type { ConsentRuntime } from './runtime/types';
import type { ConsentSnapshot } from './types';

/** Flat event metadata accepted by the shared dispatcher. */
export type EventProperties = Record<string, string | number | boolean>;
/** Runtime inputs: the host owns event names, c15t owns delivery eligibility. */
export interface EventDispatcherOptions {
	scripts: readonly Script[];
	getSnapshot: () => ConsentSnapshot;
	/** SDKs needing explicit SPA pageviews. Omit SDKs that track history themselves. */
	pageviews?: readonly string[];
	/** Injectable browser globals for testing or embedded runtimes. */
	globals?: object;
}

/** Path state one or more dispatchers share for pageview de-duplication. */
interface PageviewState {
	/** The first path seen. The vendor's own SDK records that page view. */
	initialPath?: string;
	/** The last path each `pageviews` vendor saw, sent or denied. */
	vendorPaths: Map<string, string>;
}

/** {@link EventDispatcherOptions} with scripts read at call time. */
interface DispatcherInputs extends Omit<EventDispatcherOptions, 'scripts'> {
	getScripts: () => readonly Script[];
	pageviewState: PageviewState;
}

const dispatcher = (options: DispatcherInputs) => {
	const globals =
		options.globals ?? (typeof window === 'undefined' ? {} : window);
	const call = (path: string | readonly string[], args: unknown[]) => {
		let owner: unknown = globals;
		const keys = typeof path === 'string' ? path.split('.') : [...path];
		const method = keys.pop();
		for (const key of keys) {
			if (
				!owner ||
				(typeof owner !== 'object' && typeof owner !== 'function')
			) {
				return;
			}
			// oxlint-disable-next-line anti-slop/no-reflect-get -- Vendor SDK paths are resolved dynamically and every receiver/method is checked.
			owner = Reflect.get(owner, key);
		}
		if (
			!owner ||
			!method ||
			(typeof owner !== 'object' && typeof owner !== 'function')
		) {
			return;
		}
		// oxlint-disable-next-line anti-slop/no-reflect-get -- The method is checked before calling it with its original SDK receiver.
		const fn: unknown = Reflect.get(owner, method);
		if (typeof fn === 'function') {
			// oxlint-disable-next-line anti-slop/no-reflect-apply -- Preserve the original vendor SDK receiver after checking the function.
			Reflect.apply(fn, owner, args);
		}
	};
	const permitted = () => {
		const snapshot = options.getSnapshot();
		// These are analytics events, even if the loader is strictly necessary (GTM).
		if (!getEffectiveGateState(snapshot).effectivePermissions.measurement) {
			return [];
		}
		return options
			.getScripts()
			.filter((script) => evaluateConsent(script, snapshot));
	};
	return {
		/**
		 * Seed the initial path, then deliver permitted navigation events.
		 * @param path - Current path, including any query and hash. Hash-only changes are ignored.
		 * @returns Nothing. The first call and duplicate paths do not send events.
		 */
		pageview(path: string) {
			const [next = ''] = path.split('#');
			const { pageviewState } = options;
			if (pageviewState.initialPath === undefined) {
				pageviewState.initialPath = next;
				return;
			}
			// Dispatchers with different `pageviews` share this state, so each
			// vendor keeps its own last path.
			const changed = new Set<string>();
			for (const vendor of options.pageviews ?? []) {
				const previous =
					pageviewState.vendorPaths.get(vendor) ?? pageviewState.initialPath;
				if (previous !== next) {
					changed.add(vendor);
				}
				pageviewState.vendorPaths.set(vendor, next);
			}
			for (const script of permitted()) {
				const vendor = script.vendor ?? script.id;
				if (!vendor || !changed.delete(vendor)) {
					continue;
				}
				try {
					if (vendor === 'posthog') {
						call('posthog.capture', ['$pageview']);
					}
					if (vendor === 'segment') {
						call('analytics.page', []);
					}
					if (vendor === 'hightouch') {
						call('htevents.page', []);
					}
				} catch {
					/* Navigation must not depend on analytics availability. */
				}
			}
		},
		/**
		 * Send a named event to each configured, currently permitted integration.
		 * @param event - Application event name understood by the configured SDKs.
		 * @param properties - Flat metadata copied for each vendor delivery.
		 * @returns Nothing. Denied events are discarded and SDK errors are isolated.
		 */
		// oxlint-disable-next-line complexity -- One explicit branch for each supported vendor event API.
		track(event: string, properties: EventProperties = {}) {
			const sent = new Set<string>();
			for (const script of permitted()) {
				const vendor = script.vendor ?? script.id;
				if (!vendor || sent.has(vendor)) {
					continue;
				}
				sent.add(vendor);
				const props = { ...properties };
				try {
					switch (vendor) {
						case 'google-tag-manager':
							call(
								[script.attributes?.['data-c15t-layer'] ?? 'dataLayer', 'push'],
								[{ ...props, event }]
							);
							break;
						case 'gtag':
							call('gtag', ['event', event, props]);
							break;
						case 'posthog':
							call('posthog.capture', [event, props]);
							break;
						case 'mixpanel':
						case 'mixpanel-analytics':
							call('mixpanel.track', [event, props]);
							break;
						case 'segment':
							call('analytics.track', [event, props]);
							break;
						case 'hightouch':
							call('htevents.track', [event, props]);
							break;
						case 'heap':
							call('heap.track', [event, props]);
							break;
						case 'amplitude':
							call('amplitude.track', [event, props]);
							break;
						case 'logrocket':
							call('LogRocket.track', [event, props]);
							break;
						case 'adobe-analytics':
							call('_satellite.track', [event, props]);
							break;
						case 'databuddy':
							call('databuddy.track', [event, props]);
							break;
						case 'plausible-analytics':
							call('plausible', [event, { props }]);
							break;
						case 'fathom-analytics':
							call('fathom.trackEvent', [event]);
							break;
						case 'pirsch':
							call('pirsch', [event, { meta: props }]);
							break;
						case 'microsoft-clarity':
							call('clarity', ['event', event]);
							break;
						case 'hotjar':
							call('hj', ['event', event]);
							break;
						case 'vercel-analytics':
							call('va', ['event', { data: props, name: event }]);
							break;
						case 'one-dollar-stats':
							call('stonks.event', [
								event,
								Object.fromEntries(
									Object.entries(props).map(([key, value]) => [
										key,
										String(value),
									])
								),
							]);
							break;
						case 'umami':
						case 'umami-analytics':
							call('umami.track', [event, props]);
							break;
						case 'rybbit':
						case 'rybbit-analytics':
							call('rybbit.event', [event, props]);
							break;
						case 'rudderstack':
							call('rudderanalytics.track', [event, props]);
							break;
						case 'matomo':
						case 'matomo-analytics':
							call('_paq.push', [['trackEvent', 'custom', event]]);
							break;
						default:
							break;
					}
				} catch {
					/* One vendor failure cannot prevent other permitted deliveries. */
				}
			}
		},
	};
};

/** The dispatcher {@link createEventDispatcher} and {@link getEventDispatcher} return. */
export type EventDispatcher = ReturnType<typeof dispatcher>;

/**
 * Deliver events only to configured integrations with current analytics consent.
 * Denied events are discarded, and a vendor error does not stop other deliveries.
 *
 * Inside a framework provider, use that framework's helper (or
 * {@link getEventDispatcher}) instead: it reads the provider's scripts and
 * keeps pageview state for the provider's lifetime.
 *
 * @param options - Scripts, current consent snapshot, optional SPA integrations
 * and browser globals used to call their SDKs.
 * @returns A dispatcher with `track` for named events and `pageview` for SPA
 * navigation. The first pageview seeds the path without sending; later calls
 * ignore duplicate paths and hash-only changes. Only configured `pageviews`
 * integrations receive navigation events.
 * @example
 * ```ts
 * const events = createEventDispatcher({ scripts, getSnapshot: kernel.getSnapshot,
 *   pageviews: ['segment'] });
 * events.pageview(location.pathname);
 * events.track('search', { length: 4 });
 * events.pageview('/results');
 * ```
 */
export const createEventDispatcher = (
	options: EventDispatcherOptions
): EventDispatcher =>
	dispatcher({
		...options,
		getScripts: () => options.scripts,
		pageviewState: { vendorPaths: new Map() },
	});

/** Options for {@link getEventDispatcher}. */
export type RuntimeEventDispatcherOptions = Partial<
	Omit<EventDispatcherOptions, 'getSnapshot'>
>;

const pageviewStates = new WeakMap<ConsentRuntime, PageviewState>();

/**
 * Get an event dispatcher for a consent runtime.
 *
 * Every call reads the runtime's scripts and consent snapshot when it sends,
 * so revoking consent stops the next event and scripts passed to a later
 * `update()` receive events. Dispatchers for the same runtime share pageview
 * state, so recreating one on a re-render or a consent change does not
 * replay or drop a navigation.
 *
 * @param runtime - The runtime whose `scripts` and live consent to use.
 * @param options - Extra scripts to deliver to, SPA `pageviews` integrations
 * and injectable browser globals.
 * @returns A dispatcher with `track` and `pageview`.
 * @example
 * ```ts
 * const events = getEventDispatcher(runtime, { pageviews: ['posthog'] });
 * events.pageview(location.pathname);
 * events.track('add_to_cart', { sku: 'tee' });
 * ```
 */
export const getEventDispatcher = (
	runtime: ConsentRuntime,
	options: RuntimeEventDispatcherOptions = {}
): EventDispatcher => {
	let pageviewState = pageviewStates.get(runtime);
	if (!pageviewState) {
		pageviewState = { vendorPaths: new Map() };
		pageviewStates.set(runtime, pageviewState);
	}
	return dispatcher({
		...options,
		getScripts: () =>
			options.scripts
				? [...runtime.scripts, ...options.scripts]
				: runtime.scripts,
		// A provider runtime swaps kernels when `enabled` changes.
		getSnapshot: () => runtime.kernel.getSnapshot(),
		pageviewState,
	});
};
