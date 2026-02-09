/**
 * GET /consents/check handler - Pre-banner cross-device consent check.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { C15TContext } from '~/types';
import { getMetrics } from '~/utils/metrics';
import { resolveConsentPolicies } from '../utils/consent-enrichment';

/**
 * Handles checking if an externalId has consented to specific policies.
 *
 * Use this endpoint BEFORE showing consent banners to check if the user
 * has already consented on another device.
 *
 * Returns minimal data (just booleans) for privacy - no subject IDs,
 * no consent details, no PII.
 */
export const checkConsentHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling GET /consents/check request');

	const { db, registry } = ctx;

	const externalId = c.req.query('externalId');
	const type = c.req.query('type');

	if (!externalId) {
		throw new HTTPException(422, {
			message: 'externalId query parameter is required',
			cause: { code: 'EXTERNAL_ID_REQUIRED' },
		});
	}

	if (!type) {
		throw new HTTPException(422, {
			message: 'type query parameter is required',
			cause: { code: 'TYPE_REQUIRED' },
		});
	}

	const types = type.split(',').map((t) => t.trim());

	logger.debug('Request parameters', { externalId, types });

	try {
		// Find all subjects with this externalId
		const subjects = await db.findMany('subject', {
			where: (b) => b('externalId', '=', externalId),
		});

		const subjectIds = subjects.map((s) => s.id);

		// Initialize results
		const results: Record<
			string,
			{ hasConsent: boolean; isLatestPolicy: boolean }
		> = {};
		for (const t of types) {
			results[t] = { hasConsent: false, isLatestPolicy: false };
		}

		// If no subjects found, return all false
		if (subjectIds.length === 0) {
			logger.debug('No subjects found for externalId', { externalId });
			return c.json({ results });
		}

		// Get all consents for these subjects
		const allConsents = await Promise.all(
			subjectIds.map((subjectId) =>
				db.findMany('consent', {
					where: (b) => b('subjectId', '=', subjectId),
				})
			)
		);

		const consents = allConsents.flat();

		const policyInfos = await resolveConsentPolicies(consents, {
			db,
			registry,
		});
		for (const info of policyInfos) {
			if (!types.includes(info.policyType)) continue;
			const entry = results[info.policyType];
			if (entry) {
				entry.hasConsent = true;
				if (info.isLatestPolicy) {
					entry.isLatestPolicy = true;
				}
			}
		}

		logger.debug('Consent check results', { externalId, results });

		// Record consent check metrics
		const metrics = getMetrics();
		if (metrics) {
			for (const [type, result] of Object.entries(results)) {
				metrics.recordConsentCheck(type, result.hasConsent);
			}
		}

		return c.json({ results });
	} catch (error) {
		logger.error('Error in GET /consents/check handler', {
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: error instanceof Error ? error.message : String(error),
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
