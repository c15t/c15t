import { afterEach, describe, expect, it } from 'vitest';

import {
	cleanupProjects,
	transformFile,
	transformTwice,
} from './__tests__/helpers';
import { runNodeSdkToV3Codemod as codemod } from './node-sdk-to-v3';

const RESULT_TODO =
	'// TODO(c15t v3): @c15t/node-sdk methods now resolve to { ok: true, data } or { ok: false, error } and never throw.';

// Each run builds a TypeScript program, which is slow on a busy machine.
describe('node-sdk-to-v3 codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('moves the factory, options and methods to the v3 client', async () => {
		const { result, updated } = await transformFile(
			codemod,
			`import { c15tClient } from '@c15t/node-sdk';

// Server-side consent client.
const client = c15tClient({
	baseUrl: 'https://app.example.com',
	token: process.env.C15T_TOKEN,
	timeout: 5000,
	retryConfig: { maxRetries: 2 },
});

export async function hasMarketing(userId: string) {
	const response = await client.checkConsent({
		externalId: userId,
		type: 'privacy_policy,marketing_communications',
	});
	const subject = await client.subjects.get('sub_1', { type: 'cookie_banner' });
	await client.patchSubject('sub_1', { externalId: userId });
	await client.meta.status();
	return response.data;
}
`,
			{ fileName: 'consent.ts' }
		);

		expect(result.errors).toEqual([]);
		expect(updated).toBe(`import { createC15tClient } from '@c15t/node-sdk';

// Server-side consent client.
const client = createC15tClient({
	baseUrl: 'https://app.example.com',
	apiKey: process.env.C15T_TOKEN,
	timeoutMs: 5000,
	retry: { maxRetries: 2 },
});

export async function hasMarketing(userId: string) {
	${RESULT_TODO} Check result.ok before reading data, or wrap the call in unwrap().
	const response = await client.consents.check({
		externalId: userId,
		types: ['privacy_policy', 'marketing_communications'],
	});
	${RESULT_TODO} Check result.ok before reading data, or wrap the call in unwrap().
	const subject = await client.subjects.get('sub_1', { types: ['cookie_banner'] });
	${RESULT_TODO} Check result.ok before reading data, or wrap the call in unwrap().
	await client.subjects.identify('sub_1', { externalId: userId });
	${RESULT_TODO} Check result.ok before reading data, or wrap the call in unwrap().
	await client.status();
	return response.data;
}
`);
		expect(result.changedFiles[0]?.summaries).toEqual(
			expect.arrayContaining([
				'c15tClient -> createC15tClient',
				'token -> apiKey',
				'timeout -> timeoutMs',
				'retryConfig -> retry',
				'checkConsent -> consents.check',
				'patchSubject -> subjects.identify',
				'meta.status -> status',
				'TODO: result shape',
			])
		);
	});

	it('replaces new C15TClient and renames the type, errors and init arguments', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { C15TClient, C15TError, isC15TError } from '@c15t/node-sdk';

export class ConsentService {
	private readonly client: C15TClient = new C15TClient({ baseUrl: '/api', prefix: '/c15t', debug: true });

	async boot(options) {
		try {
			return await this.client.init(options);
		} catch (error) {
			if (isC15TError(error)) throw new C15TError('failed');
		}
	}
}
`,
			{ fileName: 'service.ts' }
		);

		expect(updated).toContain(
			"import { type C15tClient, C15tError, isC15tError, createC15tClient } from '@c15t/node-sdk';"
		);
		expect(updated).toContain(
			"private readonly client: C15tClient = createC15tClient({ baseUrl: '/api', /* TODO(c15t v3): prefix was removed."
		);
		expect(updated).toContain(
			'/* TODO(c15t v3): debug was removed. Pass onEvent'
		);
		expect(updated).toContain(
			'return await this.client.init(undefined, options);'
		);
		expect(updated).toContain('if (isC15tError(error)) throw new C15tError');
	});

	it('marks a client built from environment variables and dropped retry keys', async () => {
		const { updated } = await transformFile(
			codemod,
			`import { c15tClient as makeClient } from '@c15t/node-sdk';

const fromEnv = makeClient();
const tuned = makeClient({
	baseUrl: '/api',
	retryConfig: { maxRetries: 3, backoffFactor: 3 },
});
`,
			{ fileName: 'client.ts' }
		);

		expect(updated).toContain(
			"import { createC15tClient as makeClient } from '@c15t/node-sdk';"
		);
		expect(updated).toContain(
			'// TODO(c15t v3): createC15tClient() reads no environment variables. Pass baseUrl (was C15T_API_URL) and apiKey (was C15T_API_TOKEN) yourself.\nconst fromEnv = makeClient();'
		);
		expect(updated).toContain(
			'\t// TODO(c15t v3): retry takes only maxRetries, initialDelayMs and maxDelayMs, or false.'
		);
		expect(updated).toContain('retry: { maxRetries: 3, backoffFactor: 3 },');
	});

	it('leaves other clients and v3 code alone', async () => {
		const unrelated = await transformFile(
			codemod,
			`import { c15tClient } from './client';
const client = c15tClient({ token: 'x' });
await client.getSubject('a');
`,
			{ fileName: 'other.ts' }
		);
		expect(unrelated.result.changedFiles).toEqual([]);

		const migrated = await transformFile(
			codemod,
			`import { createC15tClient } from '@c15t/node-sdk';
const c15t = createC15tClient({ baseUrl: '/api', apiKey: 'k' });
const result = await c15t.consents.check({ externalId: 'a', types: ['marketing'] });
`,
			{ fileName: 'v3.ts' }
		);
		expect(migrated.result.changedFiles).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const source = `import { c15tClient } from '@c15t/node-sdk';
const client = c15tClient({ baseUrl: '/api', token: 't' });
export const run = () => client.listSubjects({ externalId: 'x' });
`;
		const { first, second, secondResult } = await transformTwice(
			codemod,
			source,
			'sdk.ts'
		);
		expect(first).toContain("client.subjects.list({ externalId: 'x' })");
		expect(second).toBe(first);
		expect(secondResult.changedFiles).toEqual([]);

		const dry = await transformFile(codemod, source, {
			dryRun: true,
			fileName: 'sdk.ts',
		});
		expect(dry.updated).toBe(source);
		expect(dry.result.changedFiles[0]?.after).toBe(first);
	});
});
