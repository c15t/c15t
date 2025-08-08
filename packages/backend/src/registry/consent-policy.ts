import { DoubleTieError, ERROR_CODES } from '~/pkgs/results';
import type { PolicyType } from '../schema';
import type { Registry } from './types';

export function policyRegistry({ db, ctx: { logger } }: Registry) {
	async function generatePolicyPlaceholder(name: string, date: Date) {
		const content = `[PLACEHOLDER] This is an automatically generated version of the ${name} policy.\n\nThis placeholder content should be replaced with actual policy terms before being presented to users.\n\nGenerated on: ${date.toISOString()}`;

		let contentHash: string;
		try {
			// Use Web Crypto API which is available in both browsers and edge environments
			const encoder = new TextEncoder();
			const data = encoder.encode(content);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			contentHash = Array.from(new Uint8Array(hashBuffer))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');
		} catch (error) {
			throw new DoubleTieError('Failed to generate policy content hash', {
				code: ERROR_CODES.INTERNAL_SERVER_ERROR,
				status: 500,
				cause: error instanceof Error ? error : new Error(String(error)),
			});
		}

		return { content, contentHash };
	}

	return {
		findConsentPolicyById: async (policyId: string) => {
			const policy = await db.findFirst('consentPolicy', {
				where: (b) => b('id', '=', policyId),
			});

			return policy;
		},
		findOrCreatePolicy: async (type: PolicyType) => {
			// Gets most recent active policy for a given type
			const existingPolicy = await db.findFirst('consentPolicy', {
				where: (b) => b.and(b('isActive', '=', true), b('type', '=', type)),
				orderBy: ['effectiveDate', 'desc'],
			});

			if (existingPolicy) {
				logger.debug('Found existing policy', {
					type,
					policyId: existingPolicy.id,
				});
				return existingPolicy;
			}

			const { content, contentHash } = await generatePolicyPlaceholder(
				type,
				new Date()
			);

			const policy = await db.create('consentPolicy', {
				version: '1.0.0',
				type,
				name: type,
				effectiveDate: new Date(),
				content,
				contentHash,
				isActive: true,
				expirationDate: null,
			});

			return policy;
		},
	};
}
