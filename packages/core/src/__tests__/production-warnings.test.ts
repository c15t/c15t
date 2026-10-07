/// <reference types="node" />
/**
 * Development warnings stay out of production builds.
 *
 * A bundler replaces `process.env.NODE_ENV` with a literal and leaves every
 * other read of `process` alone. The browser has no `process`, so a warning
 * gated on anything but that literal prints in a production build. These
 * tests bundle the runtime for the browser the way an app build does and run
 * it where `process` does not exist.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

import { build } from 'esbuild';
import { describe, expect, test } from 'vitest';

const SOURCE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

// A script names a vendor that nothing declares, which warns in development.
const ENTRY = `
import { offline } from './index';
import { createConsentRuntime } from './runtime/index';

createConsentRuntime({
	mode: offline(),
	scripts: [
		{
			category: 'functionality',
			id: 'chat',
			src: 'https://chat.example.test/loader.js',
			vendor: 'chat-widget',
		},
	],
});
`;

/** Bundles the entry for the browser with `NODE_ENV` set to `nodeEnv`. */
const bundle = async function bundle(nodeEnv: string): Promise<string> {
	const result = await build({
		bundle: true,
		define: { 'process.env.NODE_ENV': JSON.stringify(nodeEnv) },
		format: 'iife',
		logLevel: 'silent',
		platform: 'browser',
		stdin: { contents: ENTRY, loader: 'ts', resolveDir: SOURCE_DIR },
		write: false,
	});
	return result.outputFiles[0]?.text ?? '';
};

/** Runs a bundle without `process` and returns what it warned. */
const warningsFrom = function warningsFrom(code: string): string[] {
	const warnings: string[] = [];
	const quiet = () => undefined;
	runInNewContext(code, {
		AbortController,
		TextDecoder,
		TextEncoder,
		URL,
		URLSearchParams,
		clearTimeout,
		console: {
			debug: quiet,
			error: quiet,
			info: quiet,
			log: quiet,
			warn: (...args: unknown[]) => {
				warnings.push(args.map(String).join(' '));
			},
		},
		crypto,
		queueMicrotask,
		setTimeout,
		structuredClone,
	});
	return warnings;
};

describe('a browser bundle of the runtime', () => {
	test('warns about an undeclared vendor in a development build', async () => {
		const warnings = warningsFrom(await bundle('development'));
		expect(warnings.some((message) => message.includes('chat-widget'))).toBe(
			true
		);
	});

	test('prints no development warning in a production build', async () => {
		const warnings = warningsFrom(await bundle('production'));
		expect(warnings).toEqual([]);
	});
});
