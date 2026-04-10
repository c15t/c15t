/**
 * Shared consent enrichment utilities.
 *
 * Extracts duplicated consent-building logic from get/list/check handlers
 * and batch-loads policies + purposes to eliminate N+1 queries.
 *
 * @packageDocumentation
 */

import type { PolicyType } from '~/db/schema';
import type { C15TContext } from '~/types';

type EnrichmentContext = Pick<C15TContext, 'db' | 'registry'>;

export interface EnrichedConsentItem {
	id: string;
	type: string;
	policyId: string | undefined;
	policyVersion: string | undefined;
	policyHash: string | undefined;
	policyEffectiveDate: Date | undefined;
	isLatestPolicy: boolean;
	preferences: Record<string, boolean> | undefined;
	givenAt: Date;
}

export interface ConsentPolicyInfo {
	consentId: string;
	policyType: string;
	policyId: string | undefined;
	isLatestPolicy: boolean;
}

/**
 * Parse purposeIds from DB — handles both `{ json: string[] }` wrapper
 * (some adapters) and raw `string[]` format.
 */
export function parsePurposeIds(purposeIds: unknown): string[] {
	if (purposeIds == null) return [];

	const ids =
		typeof purposeIds === 'object' && 'json' in (purposeIds as object)
			? (purposeIds as { json: unknown }).json
			: purposeIds;

	return Array.isArray(ids) ? ids : [];
}

/**
 * Batch-fetch all referenced policies and resolve the latest policy per type.
 *
 * 1 query for findMany('consentPolicy', { where: id IN ... })
 * ≤7 calls for latest-policy lookup (one per unique PolicyType)
 */
async function batchLoadPolicies(
	policyIds: Set<string>,
	ctx: EnrichmentContext
) {
	const { db, registry } = ctx;

	// Fetch all referenced policies in one query
	const policyMap = new Map<
		string,
		{
			id: string;
			type: string;
			version: string;
			hash?: string | null;
			effectiveDate: Date;
			[key: string]: unknown;
		}
	>();

	if (policyIds.size > 0) {
		const policies = await db.findMany('consentPolicy', {
			where: (b) => b('id', 'in', [...policyIds]),
		});
		for (const p of policies) {
			policyMap.set(p.id, p);
		}
	}

	// Resolve the latest policy for each unique type
	const uniqueTypes = new Set<string>();
	for (const p of policyMap.values()) {
		uniqueTypes.add(p.type);
	}

	const latestPolicyByType = new Map<string, string>();
	for (const type of uniqueTypes) {
		const latest = await registry.findLatestPolicyByType(type as PolicyType);
		if (latest) {
			latestPolicyByType.set(type, latest.id);
		}
	}

	return { policyMap, latestPolicyByType };
}

/**
 * Full consent enrichment for get/list handlers.
 *
 * Resolves policy types, isLatestPolicy, and purpose preferences
 * using batch queries instead of per-consent lookups.
 */
export async function enrichConsents(
	consents: Array<{
		id: string;
		policyId: string | null;
		purposeIds: unknown;
		givenAt: Date;
	}>,
	ctx: EnrichmentContext
): Promise<EnrichedConsentItem[]> {
	if (consents.length === 0) return [];

	// Collect all policy IDs
	const policyIds = new Set<string>();
	for (const c of consents) {
		if (c.policyId) policyIds.add(c.policyId);
	}

	const { policyMap, latestPolicyByType } = await batchLoadPolicies(
		policyIds,
		ctx
	);

	// Collect all purpose IDs across all consents
	const allPurposeIds = new Set<string>();
	for (const c of consents) {
		for (const id of parsePurposeIds(c.purposeIds)) {
			allPurposeIds.add(id);
		}
	}

	// Batch-fetch all purposes in one query
	const purposeMap = new Map<string, string>(); // id → code
	if (allPurposeIds.size > 0) {
		const purposes = await ctx.db.findMany('consentPurpose', {
			where: (b) => b('id', 'in', [...allPurposeIds]),
		});
		for (const p of purposes) {
			purposeMap.set(p.id, p.code);
		}
	}

	// Map consents synchronously — zero additional queries
	return consents.map((consent) => {
		let policyType = 'unknown';
		let policyVersion: string | undefined;
		let policyHash: string | undefined;
		let policyEffectiveDate: Date | undefined;
		let isLatestPolicy = false;

		if (consent.policyId) {
			const policy = policyMap.get(consent.policyId);
			if (policy) {
				policyType = policy.type;
				policyVersion = policy.version;
				policyHash = policy.hash ?? undefined;
				policyEffectiveDate = policy.effectiveDate;
				isLatestPolicy =
					latestPolicyByType.get(policyType) === consent.policyId;
			}
		}

		let preferences: Record<string, boolean> | undefined;
		const ids = parsePurposeIds(consent.purposeIds);
		if (ids.length > 0) {
			preferences = {};
			for (const purposeId of ids) {
				const code = purposeMap.get(purposeId);
				if (code) {
					preferences[code] = true;
				}
			}
		}

		return {
			id: consent.id,
			type: policyType,
			policyId: consent.policyId ?? undefined,
			policyVersion,
			policyHash,
			policyEffectiveDate,
			isLatestPolicy,
			preferences,
			givenAt: consent.givenAt,
		};
	});
}

/**
 * Policy-only enrichment for check handler.
 *
 * Resolves policy type and isLatestPolicy without loading purposes.
 */
export async function resolveConsentPolicies(
	consents: Array<{
		id: string;
		policyId: string | null;
	}>,
	ctx: EnrichmentContext
): Promise<ConsentPolicyInfo[]> {
	if (consents.length === 0) return [];

	const policyIds = new Set<string>();
	for (const c of consents) {
		if (c.policyId) policyIds.add(c.policyId);
	}

	const { policyMap, latestPolicyByType } = await batchLoadPolicies(
		policyIds,
		ctx
	);

	return consents.map((consent) => {
		let policyType = 'unknown';
		let isLatestPolicy = false;

		if (consent.policyId) {
			const policy = policyMap.get(consent.policyId);
			if (policy) {
				policyType = policy.type;
				isLatestPolicy =
					latestPolicyByType.get(policyType) === consent.policyId;
			}
		}

		return {
			consentId: consent.id,
			policyType,
			policyId: consent.policyId ?? undefined,
			isLatestPolicy,
		};
	});
}
