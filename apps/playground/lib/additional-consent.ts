/**
 * Google Additional Consent provider list, in the shape `@c15t/iab` reads
 * from `https://gvl.inth.app/additional-consent`.
 *
 * Google publishes the list as a CSV without CORS headers, so browsers
 * cannot read it directly. The playground's `app/api/additional-consent`
 * route converts it with these helpers, as the hosted endpoint does, so the
 * demo works without it.
 */

export const GOOGLE_PROVIDER_LIST =
	'https://storage.googleapis.com/tcfac/additional-consent-providers.csv';

export interface AdTechProvider {
	id: number;
	name: string;
	policyUrl: string;
}

/**
 * Splits CSV text into records, honouring quoted fields, `""` escapes and
 * line breaks inside quotes (RFC 4180).
 */
const parseCsvRecords = function parseCsvRecords(csv: string): string[][] {
	const records: string[][] = [];
	let record: string[] = [];
	let field = '';
	let quoted = false;
	for (let index = 0; index < csv.length; index += 1) {
		const character = csv[index];
		if (quoted) {
			if (character === '"' && csv[index + 1] === '"') {
				field += '"';
				index += 1;
			} else if (character === '"') {
				quoted = false;
			} else {
				field += character;
			}
		} else if (character === '"') {
			quoted = true;
		} else if (character === ',') {
			record.push(field);
			field = '';
		} else if (character === '\n' || character === '\r') {
			if (character === '\r' && csv[index + 1] === '\n') {
				index += 1;
			}
			record.push(field);
			records.push(record);
			record = [];
			field = '';
		} else {
			field += character;
		}
	}
	if (field !== '' || record.length > 0) {
		record.push(field);
		records.push(record);
	}
	return records;
};

/**
 * Reads Google's provider CSV. Columns are found by header name
 * (`provider_id`, `provider_name`, `policy_url`), and rows without a positive
 * integer ID, a name or an http(s) policy URL are skipped.
 *
 * @returns The listed providers, or null when the text is not the provider
 *   CSV, such as an error page served with a 200.
 */
export const parseProviderCsv = function parseProviderCsv(
	csv: string
): Map<number, AdTechProvider> | null {
	const [header, ...rows] = parseCsvRecords(csv.replace(/^﻿/u, ''));
	const columns = header?.map((name) => name.trim().toLowerCase()) ?? [];
	const idColumn = columns.indexOf('provider_id');
	const nameColumn = columns.indexOf('provider_name');
	const policyColumn = columns.indexOf('policy_url');
	if (idColumn === -1 || nameColumn === -1 || policyColumn === -1) {
		return null;
	}
	const providers = new Map<number, AdTechProvider>();
	for (const row of rows) {
		const rawId = row[idColumn]?.trim() ?? '';
		const id = /^\d+$/u.test(rawId) ? Number(rawId) : Number.NaN;
		const name = row[nameColumn]?.trim() ?? '';
		const policyUrl = row[policyColumn]?.trim() ?? '';
		if (
			Number.isSafeInteger(id) &&
			id > 0 &&
			name !== '' &&
			/^https?:\/\//iu.test(policyUrl)
		) {
			providers.set(id, { id, name, policyUrl });
		}
	}
	return providers;
};

/**
 * The `providerIds` filter. Null when the parameter is absent, which asks for
 * the whole list; a present parameter with no usable IDs is an empty filter,
 * so a malformed request never receives every provider.
 */
export const parseProviderIds = function parseProviderIds(
	param: string | null
): number[] | null {
	if (param === null) {
		return null;
	}
	const ids = param
		.split(',')
		.map((value) => value.trim())
		.filter((value) => /^\d+$/u.test(value))
		.map(Number)
		.filter((id) => Number.isSafeInteger(id) && id > 0);
	return [...new Set(ids)];
};

/** The requested providers Google lists, keyed by ID. */
export const selectProviders = function selectProviders(
	listed: ReadonlyMap<number, AdTechProvider>,
	ids: readonly number[] | null
): Record<string, AdTechProvider> {
	const providers: Record<string, AdTechProvider> = {};
	for (const id of ids ?? listed.keys()) {
		const provider = listed.get(id);
		if (provider) {
			providers[String(id)] = provider;
		}
	}
	return providers;
};
