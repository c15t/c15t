import type { ConsentPolicyType } from '@c15t/node-sdk';

import { c15tAdmin } from '#lib/c15t-client.js';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const externalId = url.searchParams.get('externalId');
	const type = url.searchParams.get('type') || 'analytics';

	if (!externalId) {
		return { error: null, externalId: null, result: null, type };
	}

	// The query string carries `a,b`; the client takes one entry per type.
	// Unknown types are reported as not consented rather than rejected.
	const types = type
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean) as [ConsentPolicyType, ...ConsentPolicyType[]];

	if (!c15tAdmin) {
		return {
			error: {
				code: 'MISSING_API_KEY',
				message: 'Set C15T_API_KEY: consents.check needs an API key.',
			},
			externalId,
			result: null,
			type,
		};
	}

	const result = await c15tAdmin.consents.check({ externalId, types });

	if (!result.ok) {
		return {
			error: {
				code: result.error.code,
				message: result.error.message,
			},
			externalId,
			result: null,
			type,
		};
	}

	return {
		error: null,
		externalId,
		result: result.data,
		type,
	};
};
