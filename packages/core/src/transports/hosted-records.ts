/**
 * The hosted transport's record half: saves, identity links, subject reads
 * and privacy directives, without `init`.
 *
 * `createHostedTransport` builds on it and adds `init`. An adapter whose
 * server already resolved the visitor's state can use this half on its own
 * and load the init path only when the browser has to resolve init itself,
 * so the init request code, the prefetch reader and the init-response
 * mapper stay out of its first-load bundle.
 *
 * Reading a subject record back is rare (a user switch or an explicit
 * reload), so its reviver loads on first use.
 */
import type { PrivacyOptOut } from '../consent-record/types';
import type { KernelTransport, KernelUser, SaveResult } from '../types';
import { buildDecisionAssertion } from './decision-inputs';
import type { RememberedDecisionInputs } from './decision-inputs';
import { buildSubjectPostBody } from './subject-body';
import type { SubjectSavePayload } from './subject-body';
import type { TransportHydrationRecords } from './subject-record';
import { c15tProtocolHeaders } from './version-header';

/** Options for {@link createHostedRecordTransport}. */
export interface HostedRecordTransportOptions {
	/**
	 * Backend URL. Can be relative (`/api/c15t`) or absolute.
	 * Trailing slashes are stripped.
	 */
	backendURL: string;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
	/**
	 * Fetch credentials mode. Defaults to `'include'` so the backend can set
	 * and read consent cookies.
	 */
	credentials?: RequestCredentials;
	/**
	 * Domain sent to `POST /subjects`. Defaults to the browser hostname, or
	 * the backend URL hostname for absolute URLs in server runtimes.
	 */
	domain?: string;
	/** Clock used to validate records read from the backend. */
	now?: () => number;
}

/**
 * Where a save finds the decision it asserts when the payload carries
 * neither a `policySnapshotToken` nor decision inputs of its own.
 *
 * @internal
 */
export interface HostedDecisionSource {
	/** Refuse to save until an init resolved a decision. */
	required: boolean;
	/** The init in flight, if any. A save waits for it before asserting. */
	pending: () => Promise<unknown> | undefined;
	/** Decision inputs the latest init remembered. */
	inputs: () => RememberedDecisionInputs | undefined;
}

/** The record methods of a hosted transport. */
export interface HostedRecordTransport extends KernelTransport {
	save: (payload: SubjectSavePayload) => Promise<SaveResult>;
	identify: (user: KernelUser, subjectId: string | null) => Promise<void>;
	/**
	 * Reads the backend's merged receipts and standing privacy directives for
	 * a subject. `null` when the backend has no such subject.
	 */
	loadSubjectRecord: (
		subjectId: string
	) => Promise<TransportHydrationRecords | null>;
	/**
	 * Records a standing privacy directive against the subject's own server
	 * record. Resolves without a request when there is no server subject yet.
	 */
	recordPrivacyOptOut: (
		directive: PrivacyOptOut,
		subjectId: string | null
	) => Promise<void>;
}

/** Strip a single trailing slash so `${base}/subjects` doesn't double up. */
export const trimSlash = function trimSlash(url: string): string {
	return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * Resolve the `domain` field sent on `POST /subjects`: the explicit option,
 * the browser hostname, the backend URL hostname, then `'localhost'`.
 */
const resolveDomain = function resolveDomain(
	backendURL: string,
	explicit: string | undefined
): string {
	if (explicit) {
		return explicit;
	}
	if (typeof window !== 'undefined' && window.location?.hostname) {
		return window.location.hostname;
	}
	try {
		return new URL(backendURL).hostname;
	} catch {
		return 'localhost';
	}
};

/**
 * A `SaveResult` from the backend's answer.
 *
 * The backend's 2.x response shape has no `ok`; success is the HTTP status.
 * Reading the body as a `SaveResult` made every successful save look failed
 * and queued it for replay forever.
 */
const toSaveResult = function toSaveResult(data: unknown): SaveResult {
	const subjectId =
		typeof data === 'object' &&
		data !== null &&
		typeof (data as { subjectId?: unknown }).subjectId === 'string'
			? (data as { subjectId: string }).subjectId
			: undefined;
	return subjectId === undefined ? { ok: true } : { ok: true, subjectId };
};

/** Resolve the fetch implementation or throw when the runtime has none. */
export const resolveFetch = function resolveFetch(
	fetchImpl: typeof globalThis.fetch | undefined
): typeof globalThis.fetch {
	const resolved = fetchImpl ?? globalThis.fetch?.bind(globalThis);
	if (!resolved) {
		throw new Error(
			'createHostedTransport: no fetch available. Pass `fetch` in options.'
		);
	}
	return resolved;
};

/**
 * Build the record half of a hosted transport. Plain object, no listeners,
 * no caches. Safe to create per request.
 *
 * @param options - Backend connection options.
 * @param decision - Where saves find a remembered decision. Omit it when
 *   every save carries its own decision inputs.
 * @returns Save, identify, subject-read and privacy-directive methods.
 * @example
 * ```ts
 * import { createHostedRecordTransport } from '@c15t/core';
 *
 * const records = createHostedRecordTransport({ backendURL: '/api/c15t' });
 * await records.save(payload);
 * ```
 */
export const createHostedRecordTransport = function createHostedRecordTransport(
	options: HostedRecordTransportOptions,
	decision?: HostedDecisionSource
): HostedRecordTransport {
	const base = trimSlash(options.backendURL);
	const fetchImpl = resolveFetch(options.fetch);
	const credentials = options.credentials ?? 'include';
	const domain = resolveDomain(base, options.domain);
	const now = options.now ?? Date.now;

	const jsonHeaders = {
		accept: 'application/json',
		'content-type': 'application/json',
		...c15tProtocolHeaders,
	};

	const subjectURL = (subjectId: string): string =>
		`${base}/subjects/${encodeURIComponent(subjectId)}`;

	const failed = function failed(route: string, response: Response): Error {
		return new Error(
			`c15t hosted transport: ${route} responded ${response.status} ${response.statusText}`
		);
	};

	return {
		async identify(user, subjectId): Promise<void> {
			if (!subjectId) {
				// No server subject to link. The identity stays in the kernel and
				// travels with the next save; nothing is owed to the network.
				return;
			}
			const response = await fetchImpl(subjectURL(subjectId), {
				body: JSON.stringify({
					externalId: user.externalId,
					identityProvider: user.identityProvider,
				}),
				credentials,
				headers: jsonHeaders,
				method: 'PATCH',
			});
			if (!response.ok) {
				throw failed('/subjects/:id', response);
			}
		},

		async loadSubjectRecord(
			subjectId
		): Promise<TransportHydrationRecords | null> {
			const response = await fetchImpl(subjectURL(subjectId), {
				credentials,
				headers: { accept: 'application/json', ...c15tProtocolHeaders },
				method: 'GET',
			});
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				throw failed('/subjects/:id', response);
			}
			const [
				body,
				{ mapSubjectRecordToHydrationRecords, reviveSubjectRecord },
			] = await Promise.all([response.json(), import('./subject-record')]);
			const record = reviveSubjectRecord(body);
			if (!record) {
				throw new Error(
					'c15t hosted transport: /subjects/:id returned an unreadable record'
				);
			}
			return mapSubjectRecordToHydrationRecords(record, { now: now() });
		},

		async recordPrivacyOptOut(directive, subjectId): Promise<void> {
			if (!subjectId) {
				// No server record exists for this device yet. The kernel keeps the
				// directive locally; it is never sent through the consent route.
				return;
			}
			const response = await fetchImpl(
				`${subjectURL(subjectId)}/privacy-directives`,
				{
					body: JSON.stringify({
						categories: [...directive.categories],
						recordedAt: directive.recordedAt,
						source: directive.source,
					}),
					credentials,
					headers: jsonHeaders,
					method: 'POST',
				}
			);
			if (!response.ok) {
				throw failed('/subjects/:id/privacy-directives', response);
			}
		},

		async save(payload): Promise<SaveResult> {
			if (
				decision?.required &&
				!payload.policySnapshotToken &&
				!payload.decisionInputs
			) {
				// A server-rendered banner is interactive before the client init
				// resolves, and the provider re-initialises when its overrides
				// change. Wait out every init in flight (a newer one may start
				// while waiting) so the assertion reflects the latest decision;
				// if none resolves, refuse rather than record an unbound consent.
				let awaited = decision.pending();
				while (awaited) {
					// oxlint-disable-next-line no-await-in-loop -- Each iteration waits for the init that superseded the last.
					await awaited.catch(() => undefined);
					awaited = decision.pending();
				}
				if (!buildDecisionAssertion(payload, decision.inputs())) {
					throw new Error(
						'c15t hosted transport: cannot save before init resolved a policy decision (assertDecisionInputs is set).'
					);
				}
			}

			const response = await fetchImpl(`${base}/subjects`, {
				body: JSON.stringify({
					...buildSubjectPostBody(payload, { domain }),
					...buildDecisionAssertion(payload, decision?.inputs()),
				}),
				credentials,
				headers: jsonHeaders,
				method: 'POST',
			});

			if (!response.ok) {
				throw failed('/subjects', response);
			}

			return toSaveResult(await response.json());
		},
	};
};
