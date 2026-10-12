/**
 * Google Additional Consent provider list, in the shape `@c15t/iab` reads
 * from `https://gvl.inth.app/additional-consent`.
 *
 * Google publishes the list as a CSV without CORS headers, so browsers
 * cannot read it directly. This route converts it to JSON and filters it by
 * `?providerIds=1,2,3`, as the hosted endpoint does, so the demo works
 * without it.
 */

const GOOGLE_PROVIDER_LIST =
	'https://storage.googleapis.com/tcfac/additional-consent-providers.csv';

interface AdTechProvider {
	id: number;
	name: string;
	policyUrl: string;
}

/** Splits one CSV record into fields, honouring quotes and `""` escapes. */
const parseRecord = function parseRecord(line: string): string[] {
	const fields: string[] = [];
	let field = '';
	let quoted = false;
	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];
		if (quoted && character === '"' && line[index + 1] === '"') {
			field += '"';
			index += 1;
		} else if (character === '"') {
			quoted = !quoted;
		} else if (character === ',' && !quoted) {
			fields.push(field);
			field = '';
		} else {
			field += character;
		}
	}
	fields.push(field);
	return fields;
};

const parseProviders = function parseProviders(
	csv: string
): Map<number, AdTechProvider> {
	const providers = new Map<number, AdTechProvider>();
	// The first record is the header: provider_id, provider_name, policy_url, domains.
	for (const line of csv.split(/\r?\n/u).slice(1)) {
		const [id, name, policyUrl] = parseRecord(line);
		const providerId = Number(id);
		if (
			Number.isSafeInteger(providerId) &&
			providerId > 0 &&
			name &&
			policyUrl
		) {
			providers.set(providerId, { id: providerId, name, policyUrl });
		}
	}
	return providers;
};

export const GET = async function GET(request: Request): Promise<Response> {
	const requested = new URL(request.url).searchParams
		.get('providerIds')
		?.split(',')
		.map(Number)
		.filter((id) => Number.isSafeInteger(id) && id > 0);
	const response = await fetch(GOOGLE_PROVIDER_LIST, {
		next: { revalidate: 3600 },
	});
	if (!response.ok) {
		return Response.json(
			{ error: 'Google provider list unavailable' },
			{ status: 502 }
		);
	}
	const listed = parseProviders(await response.text());
	const ids = requested?.length ? requested : [...listed.keys()];
	const providers: Record<string, AdTechProvider> = {};
	for (const id of ids) {
		const provider = listed.get(id);
		if (provider) {
			providers[String(id)] = provider;
		}
	}
	return Response.json(
		{ providers },
		{
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'public, max-age=3600',
			},
		}
	);
};
