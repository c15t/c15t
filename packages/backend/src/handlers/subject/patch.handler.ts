/**
 * PATCH /subjects/:id handler - Link external ID to subject.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';
import { getMetrics } from '~/utils/metrics';
import { resolveWriteIntegrityOptions } from '~/write-integrity/configuration';
import { linkSubjectIdentity } from '~/write-integrity/identity-linking';

/**
 * Handles linking an external ID to a subject.
 *
 * Unlike the legacy identify endpoint, this does NOT merge subjects.
 * Each device maintains its own independent consent history.
 * The externalId allows querying all subjects via GET /subjects.
 */
export const patchSubjectHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling PATCH /subjects/:id request');

	// Get input from validated params and body
	const subjectId = c.req.param('id');
	const body = await c.req.json<{
		externalId: string;
		identityProvider?: string;
		domain?: string;
		subjectCapability?: string;
		identityAssertion?: string;
	}>();
	const {
		externalId,
		identityProvider = 'external',
		domain,
		subjectCapability,
		identityAssertion,
	} = body;

	if (!subjectId) {
		throw new HTTPException(400, {
			message: 'Subject ID is required',
			cause: { code: 'SUBJECT_ID_REQUIRED' },
		});
	}

	logger.debug('Request parameters', {
		subjectId,
		externalId,
		identityProvider,
	});

	try {
		const request = c.req.raw ?? new Request('https://c15t.local/subjects');
		const writeIntegrity = resolveWriteIntegrityOptions(
			ctx.writeIntegrity
		).config;
		const result = await linkSubjectIdentity({
			ctx,
			writeIntegrity,
			input: {
				subjectId,
				externalId,
				identityProvider,
				domain,
				subjectCapability,
				identityAssertion,
				request,
			},
		});

		logger.info('Subject linked to external ID', {
			subjectId,
			externalId,
			identityProvider,
			status: result.status,
		});

		getMetrics()?.recordSubjectLinked(identityProvider);

		return c.json({
			success: true,
			subject: {
				id: subjectId,
				externalId,
			},
		});
	} catch (error) {
		logger.error('Error in PATCH /subjects/:id handler', {
			error: extractErrorMessage(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: 'Internal server error',
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
