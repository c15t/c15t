/// <reference types="node" />
/**
 * The hosted record transport ships to every Next.js page that renders
 * `ConsentRoot`, because saves go through it. Init never runs on those pages
 * when the server resolved the visitor's state, and a subject record is only
 * read back after a user switch. A static import of the init path or the
 * subject-record reviver would put their bytes back into every first load.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test, vi } from 'vitest';

import { createHostedRecordTransport } from '../transports/hosted-records';

const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const STATIC_VALUE_IMPORT =
	/^(?:import|export)\s+(?!type\b)(?:\{(?<names>[^}]*)\}|[^;]*?)\s*from\s+'(?<specifier>[^']+)';/gmu;

const resolveRelative = function resolveRelative(
	from: string,
	specifier: string
): string {
	const base = normalize(join(dirname(from), specifier));
	for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {
			// Try the next candidate.
		}
	}
	throw new Error(`Cannot resolve ${specifier} from ${from}`);
};

/** Source files and bare-specifier imports reachable through value imports. */
const staticGraph = function staticGraph(entry: string): {
	files: string[];
	packageImports: string[];
} {
	const files = new Set<string>();
	const packageImports = new Set<string>();
	const pending = [join(SOURCE_DIR, entry)];
	while (pending.length > 0) {
		const file = pending.pop() as string;
		if (files.has(file)) {
			continue;
		}
		files.add(file);
		for (const match of readFileSync(file, 'utf8').matchAll(
			STATIC_VALUE_IMPORT
		)) {
			const specifier = match.groups?.specifier as string;
			if (specifier.startsWith('.')) {
				pending.push(resolveRelative(file, specifier));
				continue;
			}
			for (const name of (match.groups?.names ?? '').split(',')) {
				const imported = name.trim().split(/\s+as\s+/u)[0];
				if (imported && !imported.startsWith('type ')) {
					packageImports.add(`${specifier}#${imported}`);
				}
			}
		}
	}
	return {
		files: [...files].map((file) => file.slice(SOURCE_DIR.length + 1)),
		packageImports: [...packageImports],
	};
};

describe('hosted record transport graph', () => {
	test('reaches no init-path or subject-record module', () => {
		const { files, packageImports } = staticGraph(
			'transports/hosted-records.ts'
		);

		expect(files).not.toContain('transports/hosted.ts');
		expect(files).not.toContain('transports/init-output.ts');
		expect(files).not.toContain('transports/subject-record.ts');
		expect(files).not.toContain('libs/request-context.ts');
		expect(files).not.toContain('libs/prefetch/prefetch.ts');
		expect(packageImports).not.toContain(
			'@c15t/schema/types#extractConsentRequestInputs'
		);
	});

	test('custom() does not reach the hosted transport', () => {
		expect(staticGraph('transports/custom.ts').files).not.toContain(
			'transports/hosted.ts'
		);
	});

	test('the full hosted transport loads the subject-record reviver on demand', () => {
		expect(staticGraph('transports/hosted.ts').files).not.toContain(
			'transports/subject-record.ts'
		);
	});
});

describe('createHostedRecordTransport', () => {
	const savePayload = {
		choice: { categories: {}, version: 3 },
		confirmed: { actionAt: 1_700_000_000_000, categories: {} },
		consentAction: 'all',
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: true,
		},
		model: 'opt-in',
		overrides: {},
		policySnapshotToken: null,
		subject: { subjectId: 'sub_1' },
		subjectId: 'sub_1',
		uiSource: 'banner',
		user: null,
	} as const;

	const jsonResponse = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), {
			headers: { 'content-type': 'application/json' },
			status,
		});

	test('saves without a decision source post the payload decision inputs', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(jsonResponse({ subjectId: 'sub_1' }))
		);
		const records = createHostedRecordTransport({
			backendURL: 'https://consent.example.com/',
			domain: 'example.com',
			fetch,
		});

		const result = await records.save({
			...savePayload,
			decisionInputs: {
				country: 'DE',
				fingerprint: 'fp',
				language: 'en',
				policyId: 'gdpr',
				region: null,
			},
		});

		expect(result).toEqual({ ok: true, subjectId: 'sub_1' });
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://consent.example.com/subjects');
		expect(JSON.parse(String(init.body))).toMatchObject({
			country: 'DE',
			domain: 'example.com',
			fingerprint: 'fp',
			policyId: 'gdpr',
		});
	});

	test('a required decision refuses a save that carries none', async () => {
		const fetch = vi.fn();
		const records = createHostedRecordTransport(
			{ backendURL: '/api/c15t', fetch },
			{ inputs: () => undefined, pending: () => undefined, required: true }
		);

		await expect(records.save(savePayload)).rejects.toThrow(
			'cannot save before init resolved a policy decision'
		);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('reads a subject record back through the lazily loaded reviver', async () => {
		const fetch = vi.fn(() => Promise.resolve(jsonResponse({}, 404)));
		const records = createHostedRecordTransport({
			backendURL: '/api/c15t',
			fetch,
		});

		await expect(records.loadSubjectRecord('sub_1')).resolves.toBeNull();
		expect(fetch.mock.calls[0]?.[0]).toBe('/api/c15t/subjects/sub_1');
	});
});
