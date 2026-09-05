/**
 * In-process stand-in for the c15t backend.
 *
 * @remarks
 * Every fixture app mounts these handlers under `/api/c15t` so the suite can
 * assert what the backend saw (forwarded geo headers, request counts) without
 * a network dependency. Handlers use only the Web `Request`/`Response` types so
 * they work in App Router route handlers, Pages API routes, and plain Node
 * servers alike.
 */

const COUNTRY_HEADERS = [
	'x-c15t-country',
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
] as const;

export interface RecordedInitRequest {
	receivedAt: number;
	headers: Record<string, string>;
	countryCode: string;
}

const recordedInitRequests: RecordedInitRequest[] = [];
const recordedManifestRequests: RecordedInitRequest[] = [];

const resolveCountry = function resolveCountry(headers: Headers): string {
	for (const name of COUNTRY_HEADERS) {
		const value = headers.get(name);
		if (value) {
			return value.toUpperCase();
		}
	}
	return 'DE';
};

const toRecord = function toRecord(headers: Headers): Record<string, string> {
	const record: Record<string, string> = {};
	headers.forEach((value, key) => {
		record[key] = value;
	});
	return record;
};

const translations = {
	common: {
		acceptAll: 'Accept All',
		customize: 'Customize',
		rejectAll: 'Reject All',
		save: 'Save',
	},
	consentManagerDialog: {
		description: 'Compatibility fixture preferences.',
		title: 'Compat Preferences',
	},
	consentTypes: {
		marketing: { description: 'Advertising cookies.', title: 'Marketing' },
		measurement: { description: 'Analytics cookies.', title: 'Measurement' },
		necessary: { description: 'Required cookies.', title: 'Necessary' },
	},
	cookieBanner: {
		description: 'Compatibility fixture banner.',
		title: 'Compat Consent Banner',
	},
};

const policy = {
	consent: {
		categories: ['necessary', 'measurement', 'marketing'],
		model: 'opt-in',
		scopeMode: 'strict',
	},
	id: 'next-compat',
	model: 'opt-in',
	ui: {
		banner: {
			allowedActions: ['reject', 'accept', 'customize'],
			primaryActions: ['accept'],
			scrollLock: false,
		},
		dialog: {
			allowedActions: ['reject', 'accept', 'customize'],
			primaryActions: ['accept'],
			scrollLock: false,
		},
		mode: 'banner',
	},
};

/**
 * A v3 `/init` payload: resolved opt-in policy, explicit UI hints, and the
 * country echoed back so the suite can prove header forwarding.
 */
export const buildInitResponse = function buildInitResponse(
	countryCode: string
) {
	return {
		branding: 'c15t',
		jurisdiction: countryCode === 'US' ? 'CCPA' : 'GDPR',
		location: {
			countryCode,
			regionCode: null,
		},
		policy: {
			consent: policy.consent,
			id: policy.id,
			model: policy.model,
			proof: {},
			ui: policy.ui,
		},
		policyDecision: {
			country: countryCode,
			fingerprint: 'fingerprint_next_compat',
			jurisdiction: countryCode === 'US' ? 'CCPA' : 'GDPR',
			matchedBy: 'default',
			policyId: policy.id,
			region: null,
		},
		translations: {
			language: 'en',
			translations,
		},
	};
};

const NO_STORE = { 'cache-control': 'no-store' } as const;

/**
 * A v3 `/manifest` payload: one default policy pack plus translations, the
 * shape `resolveInitFromManifest` expects. Served with the backend's usual
 * `s-maxage` so the same-origin route in `@c15t/nextjs/api` can cache it.
 */
export const buildManifestResponse = function buildManifestResponse() {
	return {
		branding: 'c15t',
		policyPacks: [
			{
				fingerprint: 'fingerprint_next_compat',
				policy: { ...policy, match: { isDefault: true } },
				resolvedPolicy: {
					consent: policy.consent,
					id: policy.id,
					model: policy.model,
					proof: {},
					ui: policy.ui,
				},
			},
		],
		revision: 'next-compat-manifest',
		schemaVersion: 1,
		translations: {
			i18n: {
				defaultProfile: 'default',
				messages: {
					default: {
						fallbackLanguage: 'en',
						translations: { en: translations },
					},
				},
			},
		},
	};
};

export const handleManifest = function handleManifest(
	request: Request
): Response {
	recordedManifestRequests.push({
		countryCode: resolveCountry(request.headers),
		headers: toRecord(request.headers),
		receivedAt: Date.now(),
	});
	return Response.json(buildManifestResponse(), {
		headers: {
			'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
			etag: '"next-compat-manifest"',
		},
	});
};

export const handleInit = function handleInit(request: Request): Response {
	const countryCode = resolveCountry(request.headers);
	recordedInitRequests.push({
		countryCode,
		headers: toRecord(request.headers),
		receivedAt: Date.now(),
	});
	return Response.json(buildInitResponse(countryCode), { headers: NO_STORE });
};

export const handleSubjects = async function handleSubjects(
	request: Request
): Promise<Response> {
	const body = (await request.json().catch(() => ({}))) as {
		subjectId?: string;
	};
	return Response.json(
		{ ok: true, subjectId: body.subjectId ?? 'next-compat-subject' },
		{ headers: NO_STORE }
	);
};

/**
 * Diagnostics endpoint: `GET /api/c15t/__compat/requests` lists what `/init`
 * received, `DELETE` clears the log between tests.
 */
export const handleDiagnostics = function handleDiagnostics(
	request: Request
): Response {
	if (request.method === 'DELETE') {
		recordedInitRequests.length = 0;
		recordedManifestRequests.length = 0;
		return Response.json({ ok: true }, { headers: NO_STORE });
	}
	return Response.json(
		{
			initRequests: recordedInitRequests,
			manifestRequests: recordedManifestRequests,
		},
		{ headers: NO_STORE }
	);
};

/**
 * Routes a request by the path segments after `/api/c15t`.
 */
export const handleFixtureRequest = function handleFixtureRequest(
	request: Request,
	segments: string[]
): Promise<Response> | Response {
	const path = segments.join('/');
	if (path === 'init' && request.method === 'GET') {
		return handleInit(request);
	}
	if (path === 'manifest' && request.method === 'GET') {
		return handleManifest(request);
	}
	if (path === 'subjects' && request.method === 'POST') {
		return handleSubjects(request);
	}
	if (segments[0] === 'subjects' && request.method === 'GET') {
		return Response.json(
			{ consents: null, subjectId: segments[1] ?? null },
			{ headers: NO_STORE }
		);
	}
	if (path === '__compat/requests') {
		return handleDiagnostics(request);
	}
	return Response.json(
		{ error: `unhandled ${request.method} /${path}` },
		{
			headers: NO_STORE,
			status: 404,
		}
	);
};
