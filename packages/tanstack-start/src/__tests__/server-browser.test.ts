/**
 * The browser build of `@c15t/tanstack-start/server`. Route files import
 * `consentLoaderOptions` from the server entry and route definitions ship
 * to the browser, so whatever this build imports joins the client module
 * graph, and Rolldown splits chunks by that graph.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import packageJson from '../../package.json';
import * as server from '../server';
import * as browser from '../server-browser';

const source = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Value imports and re-exports of a source file, by specifier. */
const valueImports = function valueImports(file: string): string[] {
	const text = readFileSync(join(source, file), 'utf8');
	return [
		...text.matchAll(
			/^(?:import|export)\s+(?!type\b)[^;]*?from\s+'(?<specifier>[^']+)';/gmu
		),
	].map((match) => match.groups?.specifier as string);
};

describe('the browser build of the server entry', () => {
	test('browsers resolve the server entry to it', () => {
		expect(packageJson.exports['./server']).toMatchObject({
			browser: './dist/server-browser.js',
			import: './dist/server.js',
		});
	});

	test('imports nothing but the loader options, which import nothing', () => {
		expect(valueImports('server-browser.ts')).toEqual([
			'./libs/loader-options',
		]);
		expect(valueImports('libs/loader-options.ts')).toEqual([]);
	});

	test('exports the same values as the server entry', () => {
		expect(Object.keys(browser).sort()).toEqual(Object.keys(server).sort());
		expect(browser.consentLoaderOptions).toBe(server.consentLoaderOptions);
	});

	test('the request helpers refuse to run in the browser', async () => {
		await expect(browser.resolveConsent()).rejects.toThrow(/server only/u);
		await expect(browser.createConsentStateHandler()()).rejects.toThrow(
			/server only/u
		);
		expect(() =>
			browser.mergeInitIntoConsentState(
				{} as Parameters<typeof browser.mergeInitIntoConsentState>[0],
				{} as Parameters<typeof browser.mergeInitIntoConsentState>[1]
			)
		).toThrow(/server only/u);
	});
});
