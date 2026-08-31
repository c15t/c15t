import { consentClient } from '$lib/c15t-client';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const externalId = url.searchParams.get('externalId');
	const type = url.searchParams.get('type') || 'analytics';

	if (!externalId) {
		return { error: null, externalId: null, result: null, type };
	}

	const result = await consentClient.checkConsent({ externalId, type });

	if (!result.ok) {
		return {
			error: {
				code: result.error?.code,
				message: result.error?.message || 'Unknown error',
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
