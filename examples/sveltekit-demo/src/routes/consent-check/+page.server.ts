import { consentClient } from '$lib/c15t-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const externalId = url.searchParams.get('externalId');
	const type = url.searchParams.get('type') || 'analytics';

	if (!externalId) {
		return { externalId: null, type, result: null, error: null };
	}

	const result = await consentClient.checkConsent({ externalId, type });

	if (!result.ok) {
		return {
			externalId,
			type,
			result: null,
			error: {
				message: result.error?.message || 'Unknown error',
				code: result.error?.code,
			},
		};
	}

	return {
		externalId,
		type,
		result: result.data,
		error: null,
	};
};
