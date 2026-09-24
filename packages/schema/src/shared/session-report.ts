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
		jurisdiction: options.init.jurisdiction,
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
	if (options.manifest.tenantId !== undefined) {
		report.tenantId = options.manifest.tenantId;
	}
	return report;
};
