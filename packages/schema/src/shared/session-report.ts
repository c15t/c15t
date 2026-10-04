/**
 * Builds a session report from an init resolution.
 *
 * Shared between the backend, whose `/init` emits one, and the host
 * adapters, which post one after resolving locally, so both describe a
 * resolution the same way and a consumer never has to reconcile two shapes.
 */

import type { InitOutput } from '../api/init';
import type {
	ConsentSessionReport,
	ConsentSessionSource,
} from '../api/session';
import type { ConsentManifest } from './consent-manifest';

/**
 * Request header a host puts the visitor's IP on when it reports a session.
 *
 * A dedicated header rather than `x-forwarded-for`: a platform in front of
 * the backend rewrites the standard chain to the connecting server, and the
 * backend's proxy-header precedence was written for a visitor's own
 * request, not a server-to-server one. The backend applies its `ipAddress`
 * masking and tracking settings to this value exactly as it would to a
 * connection-derived one.
 */
export const CONSENT_SESSION_CLIENT_IP_HEADER = 'x-c15t-client-ip';

/**
 * Request header that carries the banner-experiment arm a visitor runs, as
 * `<id>=<arm>` with both parts URI-encoded. A client sends it on `/init`
 * only while the visitor has no stored choice, so a session that carries it
 * is one where the banner was owed under that arm.
 */
export const CONSENT_EXPERIMENT_HEADER = 'x-c15t-experiment';

/** Longest experiment id or arm name a session report carries. */
const EXPERIMENT_TEXT_MAX = 128;

/** The experiment arm a session ran. */
export interface SessionExperiment {
	id: string;
	arm: string;
}

/**
 * The {@link CONSENT_EXPERIMENT_HEADER} value for an arm.
 *
 * @param experiment - The experiment id and arm.
 * @returns The header value.
 */
export const formatExperimentHeader = function formatExperimentHeader(
	experiment: SessionExperiment
): string {
	return `${encodeURIComponent(experiment.id)}=${encodeURIComponent(experiment.arm)}`;
};

/**
 * Read a {@link CONSENT_EXPERIMENT_HEADER} value. Anything malformed or
 * longer than 128 characters per part reads as no experiment: the header is
 * analytics and never fails a request.
 *
 * @param value - The raw header value, if any.
 * @returns The experiment and arm, or `null`.
 */
export const parseExperimentHeader = function parseExperimentHeader(
	value: string | null | undefined
): SessionExperiment | null {
	if (!value) {
		return null;
	}
	const separator = value.indexOf('=');
	if (separator <= 0 || separator === value.length - 1) {
		return null;
	}
	try {
		const id = decodeURIComponent(value.slice(0, separator));
		const arm = decodeURIComponent(value.slice(separator + 1));
		return id.length <= EXPERIMENT_TEXT_MAX && arm.length <= EXPERIMENT_TEXT_MAX
			? { arm, id }
			: null;
	} catch {
		return null;
	}
};

/** The resolver inputs a report records alongside the decision. */
export interface SessionReportInputs {
	country?: string | null;
	region?: string | null;
	gpc?: boolean;
}

export interface BuildConsentSessionReportOptions {
	/** The resolved init payload. */
	init: InitOutput;
	/** The manifest it was resolved from. Only its identity is read. */
	manifest: Pick<ConsentManifest, 'revision' | 'tenantId'>;
	/** The geo and GPC inputs the resolution ran with. */
	inputs?: SessionReportInputs;
	source: ConsentSessionSource;
	/** Package that resolved init, for example `@c15t/nextjs`. */
	adapter?: string;
	/**
	 * The banner-experiment arm the visitor runs, when they have no stored
	 * choice yet. See {@link CONSENT_EXPERIMENT_HEADER}.
	 */
	experiment?: SessionExperiment | null;
}

/**
 * Builds the `POST /sessions` body for one resolution.
 *
 * @param options - The resolved payload, its manifest, and the inputs.
 * @returns The report body.
 */
export const buildConsentSessionReport = function buildConsentSessionReport(
	options: BuildConsentSessionReportOptions
): ConsentSessionReport {
	const resolution = options.init.policyResolution;
	const report: ConsentSessionReport = {
		country: options.inputs?.country ?? null,
		gpc: options.inputs?.gpc === true,
		language: options.init.translations.language,
		policy:
			resolution?.status === 'matched'
				? {
						fingerprint: resolution.fingerprints.policy,
						id: resolution.policyId,
						matchedBy: resolution.matchedBy,
						model: resolution.policy.model,
					}
				: null,
		region: options.inputs?.region ?? null,
		resolution: resolution?.status ?? 'failed',
		revision: options.manifest.revision,
		source: options.source,
	};
	if (options.adapter) {
		report.adapter = options.adapter;
	}
	if (options.experiment) {
		report.experiment = {
			arm: options.experiment.arm,
			id: options.experiment.id,
		};
	}
	if (options.manifest.tenantId !== undefined) {
		report.tenantId = options.manifest.tenantId;
	}
	return report;
};

/**
 * Whether a request is speculative: a browser, CDN, or router prefetching
 * or prerendering a page the visitor may never open. Such a request still
 * resolves consent so the response is right, but it is not a session;
 * reporting it would count visits that never happened.
 *
 * @param headers - The incoming request's headers.
 * @returns `true` for a prefetch or prerender request.
 */
export const isSpeculativeRequest = function isSpeculativeRequest(
	headers: Headers
): boolean {
	const purpose = (
		headers.get('sec-purpose') ??
		headers.get('purpose') ??
		headers.get('x-purpose') ??
		headers.get('x-moz') ??
		''
	).toLowerCase();
	if (purpose.includes('prefetch') || purpose.includes('prerender')) {
		return true;
	}
	return headers.get('next-router-prefetch') === '1';
};
