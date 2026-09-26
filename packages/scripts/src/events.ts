import { evaluateConsent, getEffectiveGateState } from '@c15t/core';
import type { ConsentSnapshot, Script } from '@c15t/core';

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

/** Deliver only to configured, currently permitted integrations. Never queues denied events. */
export const createEventDispatcher = (options: EventDispatcherOptions) => {
	let previousPath: string | undefined;
	const globals =
		options.globals ?? (typeof window === 'undefined' ? {} : window);
	const call = (path: string, args: unknown[]) => {
		let owner: unknown = globals;
		const keys = path.split('.');
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
		return options.scripts.filter((script) =>
			evaluateConsent(script, snapshot)
		);
	};
	return {
		/** Seed with the initial path, then call after navigation. Hash-only changes are ignored. */
		pageview(path: string) {
			const [next] = path.split('#');
			const changed = previousPath !== undefined && previousPath !== next;
			previousPath = next;
			if (!changed) {
				return;
			}
			const sent = new Set<string>();
			for (const script of permitted()) {
				const vendor = script.vendor ?? script.id;
				if (
					!vendor ||
					sent.has(vendor) ||
					!options.pageviews?.includes(vendor)
				) {
					continue;
				}
				sent.add(vendor);
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
								`${script.attributes?.['data-c15t-layer'] ?? 'dataLayer'}.push`,
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
							call('umami.track', [event, props]);
							break;
						case 'rybbit':
							call('rybbit.event', [event, props]);
							break;
						case 'rudderstack':
							call('rudderanalytics.track', [event, props]);
							break;
						case 'matomo':
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
