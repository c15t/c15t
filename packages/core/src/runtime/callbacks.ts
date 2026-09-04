/**
 * Kernel-event → provider-callback bridge for `@c15t/core/runtime`.
 *
 * Translates the kernel's low-level event stream into the user-facing
 * `Callbacks` contract (`onBannerFetched`, `onConsentSet`,
 * `onConsentChanged`, `onError`) and owns the
 * revoke-consent-then-reload behaviour that used to live in each
 * framework provider.
 */
import type { AllConsentNames } from '../consent/consent-types';
import type { Callbacks } from '../options/callbacks';
import type {
	ConsentKernel,
	ConsentSnapshot,
	KernelEvent,
	KernelTranslations,
	Unsubscribe,
} from '../types';

/** Options for {@link wireRuntimeCallbacks}. */
export interface WireRuntimeCallbacksOptions {
	/** Kernel whose events drive the callbacks. */
	kernel: ConsentKernel;
	/** The user-supplied callbacks. Omitted callbacks are skipped. */
	callbacks?: Callbacks;
	/** Translations reported to `onBannerFetched` when init returns none. */
	fallbackTranslations: KernelTranslations;
	/**
	 * Reload the page when a previously granted category is revoked.
	 * Defaults to `true`.
	 */
	reloadOnConsentRevoked?: boolean;
}

/** Renders any thrown value as a message for `onError`. */
export const stringifyRuntimeError = function stringifyRuntimeError(
	error: unknown
): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
};

const categoriesWithValue = function categoriesWithValue(
	next: ConsentSnapshot,
	value: boolean
): AllConsentNames[] {
	return Object.entries(next.consents)
		.filter(([, enabled]) => enabled === value)
		.map(([category]) => category as AllConsentNames);
};

const snapshotConsentsChanged = function snapshotConsentsChanged(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	return Object.keys(next.consents).some(
		(key) =>
			next.consents[key as AllConsentNames] !==
			previous.consents[key as AllConsentNames]
	);
};

const hasRevokedConsent = function hasRevokedConsent(
	previous: ConsentSnapshot,
	next: ConsentSnapshot
): boolean {
	if (!previous.hasConsented) {
		return false;
	}
	return Object.keys(previous.consents).some((key) => {
		const category = key as AllConsentNames;
		return (
			category !== 'necessary' &&
			previous.consents[category] &&
			!next.consents[category]
		);
	});
};

/**
 * Subscribes the supplied callbacks to the kernel's event stream.
 *
 * @param options - Kernel, callbacks and reload behaviour.
 * @returns A disposer that removes every subscription.
 *
 * @example
 * ```ts
 * const dispose = wireRuntimeCallbacks({
 *   callbacks: { onConsentSet: ({ preferences }) => track(preferences) },
 *   fallbackTranslations,
 *   kernel,
 * });
 * ```
 */
export const wireRuntimeCallbacks = function wireRuntimeCallbacks(
	options: WireRuntimeCallbacksOptions
): Unsubscribe {
	const { callbacks, fallbackTranslations, kernel } = options;
	const reloadOnConsentRevoked = options.reloadOnConsentRevoked !== false;
	let saveStartedSnapshot: ConsentSnapshot | null = null;

	const subscriptions = [
		kernel.events.on('init:applied', ({ snapshot: next }) => {
			const decision = next.policyDecision as {
				jurisdiction?: unknown;
			} | null;
			callbacks?.onBannerFetched?.({
				jurisdiction:
					typeof decision?.jurisdiction === 'string'
						? (decision.jurisdiction as never)
						: ('NONE' as never),
				location: {
					countryCode: next.location?.countryCode ?? null,
					regionCode: next.location?.regionCode ?? null,
				},
				translations: next.translations ?? { ...fallbackTranslations },
			});
		}),
		kernel.events.on('command:save:started', () => {
			saveStartedSnapshot = kernel.getSnapshot();
		}),
		kernel.events.on('command:save:completed', ({ result }) => {
			if (!result.ok) {
				return;
			}
			const previous = saveStartedSnapshot;
			const next = kernel.getSnapshot();
			callbacks?.onConsentSet?.({
				preferences: next.consents as never,
			});
			if (!(previous && snapshotConsentsChanged(previous, next))) {
				return;
			}
			callbacks?.onConsentChanged?.({
				allowedCategories: categoriesWithValue(next, true),
				deniedCategories: categoriesWithValue(next, false),
				preferences: next.consents as never,
				previousAllowedCategories: categoriesWithValue(previous, true),
				previousDeniedCategories: categoriesWithValue(previous, false),
				previousPreferences: previous.consents as never,
			});
			if (reloadOnConsentRevoked && hasRevokedConsent(previous, next)) {
				callbacks?.onBeforeConsentRevocationReload?.({
					preferences: next.consents as never,
				});
				if (typeof window !== 'undefined') {
					window.location.reload();
				}
			}
		}),
		kernel.events.on(
			'command:error',
			(event: Extract<KernelEvent, { type: 'command:error' }>) => {
				callbacks?.onError?.({
					error: stringifyRuntimeError(event.error),
				});
			}
		),
	];

	return function disposeRuntimeCallbacks() {
		for (const dispose of subscriptions) {
			dispose();
		}
	};
};
