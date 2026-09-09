import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { c15tInstance, createMigrator } from '@c15t/backend';
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest';

import { c15tClient } from '../index';

let backend: ReturnType<typeof c15tInstance>;

let directory: string;
beforeAll(async () => {
	directory = await mkdtemp(join(tmpdir(), 'c15t-sdk-'));
	const database = {
		dialect: 'sqlite' as const,
		filename: join(directory, 'consent.sqlite'),
	};
	const migrator = createMigrator(database);
	try {
		await migrator.apply();
	} finally {
		await migrator.dispose();
	}
	backend = c15tInstance({
		basePath: '/',
		database,
		manifest: { appName: 'SDK integration test' },
	});
});

afterEach(() => vi.unstubAllGlobals());
afterAll(async () => {
	await backend?.dispose();
	if (directory) {
		await rm(directory, { force: true, recursive: true });
	}
});

test.each(['direct', 'namespaced'] as const)(
	'reads backend status through the %s method',
	async (method) => {
		// Exercise the real request/response handler without opening a TCP port.
		vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
			backend.handler(new Request(input, init))
		);
		const client = c15tClient({
			baseUrl: 'https://api.test',
			headers: { 'accept-language': 'en', 'user-agent': 'sdk-test' },
		});
		const onSuccess = vi.fn();
		const result = await (method === 'direct'
			? client.status({ onSuccess })
			: client.meta.status({ onSuccess }));
		expect(result.ok).toBe(true);
		expect(result.error).toBeNull();
		expect(result.response?.status).toBe(200);
		expect(result.data).toMatchObject({
			client: { acceptLanguage: 'en', userAgent: 'sdk-test' },
			timestamp: expect.any(String),
			version: expect.any(String),
		});
		expect(onSuccess).toHaveBeenCalledExactlyOnceWith(result);
	}
);
