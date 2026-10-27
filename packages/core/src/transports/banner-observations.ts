import { readPolicyResolutionWire } from '@c15t/schema/types';

import { observationPolicyFingerprint } from '../libs/observation-policy';
import type { InitContext, KernelTransport } from '../types';

// Lazy hosted chunks are self-contained. Share this document's in-memory ID
// across their module copies without adding any persistent browser storage.
const pageIdKey: unique symbol = Symbol.for(
	'c15t.banner-observation.page-id.v1'
);

interface ObservationDocument extends Document {
	readonly [pageIdKey]?: string;
}

/** One ephemeral identifier per browser document; never persisted. @internal */
export const observationPageId = function observationPageId():
	| string
	| undefined {
	if (typeof document === 'undefined' || !globalThis.crypto?.randomUUID) {
		return;
	}
	try {
		const existing = (document as ObservationDocument)[pageIdKey];
		if (typeof existing === 'string') {
			return existing;
		}
		const id = crypto.randomUUID();
		Object.defineProperty(document, pageIdKey, { value: id });
		return id;
	} catch {
		// A non-extensible document cannot provide optional observation identity.
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object';

const readPayload = (value: unknown) => {
	if (
		!isRecord(value) ||
		typeof value.observationReceipt !== 'string' ||
		!value.observationReceipt ||
		value.observationReceipt.length > 8192 ||
		typeof value.observationEndpoint !== 'string'
	) {
		return;
	}
	const language =
		isRecord(value.translations) &&
		typeof value.translations.language === 'string'
			? value.translations.language
			: undefined;
	const policyFingerprint = observationPolicyFingerprint(
		readPolicyResolutionWire(value.policyResolution)
	);
	if (!policyFingerprint) {
		return;
	}
	return {
		endpoint: value.observationEndpoint,
		language,
		policyFingerprint,
		receipt: value.observationReceipt,
	};
};

const acceptsEndpoint = (value: string, backendURL: string): boolean => {
	if (typeof window === 'undefined') {
		return false;
	}
	try {
		const endpoint = new URL(value);
		const backend = new URL(backendURL, window.location.href);
		return (
			endpoint.protocol === 'https:' &&
			endpoint.origin === backend.origin &&
			!endpoint.username &&
			!endpoint.password &&
			!endpoint.hash &&
			!endpoint.search
		);
	} catch {
		return false;
	}
};

/** Optional observations, activated only by a backend's short-lived receipt. @internal */
export const createBannerObservationReporter =
	function createBannerObservationReporter(options: {
		backendURL: string;
		fetch: typeof fetch;
	}) {
		let active:
			| {
					endpoint: string;
					journey: NonNullable<InitContext['journey']>;
					language?: string;
					pageId: string;
					policyFingerprint: string;
					receipt: string;
					receivedAt: number;
			  }
			| undefined;
		let rendered:
			| {
					language?: string;
					policyFingerprint: string;
					isVisible?: () => boolean;
					receiptAtRender?: string;
			  }
			| undefined;
		let listening = false;
		const delivered = new Set<string>();
		const pending = new Set<string>();
		const controllers = new Set<AbortController>();
		const attempts = new Map<string, number>();
		const observedAt = new Map<string, string>();

		const send = (event: 'page_seen' | 'banner_shown') => {
			const observation = active;
			if (
				!observation ||
				document.visibilityState !== 'visible' ||
				Date.now() - observation.receivedAt >= 15 * 60_000
			) {
				return;
			}
			if (
				event === 'banner_shown' &&
				(!rendered ||
					rendered.policyFingerprint !== observation.policyFingerprint ||
					(observation.language && rendered.language !== observation.language))
			) {
				return;
			}
			if (
				event === 'banner_shown' &&
				!(rendered?.isVisible
					? rendered.isVisible()
					: rendered?.receiptAtRender === observation.receipt)
			) {
				return;
			}
			const key = `${observation.pageId}:${event}`;
			if (
				delivered.has(key) ||
				pending.has(key) ||
				(attempts.get(key) ?? 0) >= 3
			) {
				return;
			}
			attempts.set(key, (attempts.get(key) ?? 0) + 1);
			pending.add(key);
			const timestamp = observedAt.get(key) ?? new Date().toISOString();
			observedAt.set(key, timestamp);
			// Tenant, policy, geography and languages come from the opaque receipt.
			const body = JSON.stringify({
				event,
				journeyId: observation.journey.id,
				journeyScope: observation.journey.scope,
				observedAt: timestamp,
				pageId: observation.pageId,
				receipt: observation.receipt,
				visible: true,
			});
			const controller = new AbortController();
			controllers.add(controller);
			const timeout = setTimeout(() => controller.abort(), 5_000);
			void (async () => {
				try {
					const response = await options.fetch(observation.endpoint, {
						body,
						credentials: 'omit',
						headers: { 'content-type': 'application/json' },
						keepalive: true,
						method: 'POST',
						signal: controller.signal,
					});
					if (response.ok) {
						delivered.add(key);
					}
				} catch {
					// Observability never blocks consent or reports a consent failure.
				} finally {
					clearTimeout(timeout);
					controllers.delete(controller);
					pending.delete(key);
				}
			})();
		};
		const flush = () => {
			send('page_seen');
			send('banner_shown');
		};
		return {
			acceptsEndpoint: (value: string) =>
				acceptsEndpoint(value, options.backendURL),
			dispose() {
				if (listening) {
					document.removeEventListener('visibilitychange', flush);
					window.removeEventListener('online', flush);
				}
				for (const controller of controllers) {
					controller.abort();
				}
				controllers.clear();
				listening = false;
				active = undefined;
				rendered = undefined;
			},
			observe(input: Parameters<NonNullable<KernelTransport['observe']>>[0]) {
				rendered = { ...input, receiptAtRender: active?.receipt };
				flush();
			},
			setReceipt(value: unknown, journey: InitContext['journey']) {
				active = undefined;
				if (typeof document === 'undefined' || !journey) {
					return;
				}
				const payload = readPayload(value);
				const pageId = observationPageId();
				if (
					!payload ||
					!pageId ||
					!acceptsEndpoint(payload.endpoint, options.backendURL)
				) {
					return;
				}
				active = { ...payload, journey, pageId, receivedAt: Date.now() };
				if (!listening) {
					document.addEventListener('visibilitychange', flush);
					window.addEventListener('online', flush);
					listening = true;
				}
				flush();
			},
		};
	};
