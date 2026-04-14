import type {
	LegalDocumentCurrentInput,
	LegalDocumentCurrentParams,
} from '@c15t/schema';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { LegalDocumentPolicyConflictError } from '~/db/registry/consent-policy';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';

export const syncCurrentLegalDocumentHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling PUT /legal-documents/:type/current request');

	if (!ctx.apiKeyAuthenticated) {
		throw new HTTPException(401, {
			message: 'API key required. Use Authorization: Bearer <api_key>',
			cause: { code: 'UNAUTHORIZED' },
		});
	}

	const type = c.req.param('type') as LegalDocumentCurrentParams['type'];
	const body = await c.req.json<LegalDocumentCurrentInput>();
	const effectiveDate = new Date(body.effectiveDate);
	if (Number.isNaN(effectiveDate.getTime())) {
		throw new HTTPException(422, {
			message: 'effectiveDate must be a valid ISO-8601 string',
			cause: { code: 'INPUT_VALIDATION_FAILED' },
		});
	}

	try {
		const policy = await ctx.registry.syncCurrentLegalDocumentPolicy({
			type,
			version: body.version,
			hash: body.hash,
			effectiveDate,
		});

		return c.json({
			policy: {
				id: policy.id,
				type: policy.type,
				version: policy.version,
				hash: policy.hash!,
				effectiveDate: policy.effectiveDate,
				isActive: policy.isActive,
			},
		});
	} catch (error) {
		logger.error('Error in PUT /legal-documents/:type/current handler', {
			error: extractErrorMessage(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof LegalDocumentPolicyConflictError) {
			throw new HTTPException(409, {
				message: error.message,
				cause: { code: 'LEGAL_DOCUMENT_RELEASE_CONFLICT' },
			});
		}

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: 'Internal server error',
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
