import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import type { ConsentSnapshot } from '@c15t/core';

/** Render in Node so the compiler and its typed arrays share a realm. */
export const renderSsr = async (
	props: Record<string, unknown>,
	fixture: string
): Promise<{
	html: string;
	prompt: ConsentSnapshot['promptRequirement'];
	now: number;
}> => {
	const { stdout } = await promisify(execFile)(
		process.execPath,
		[
			resolve('src/__tests__/server-render-worker.mjs'),
			JSON.stringify({ fixture, props }),
		],
		{ maxBuffer: 10 * 1024 * 1024 }
	);
	return JSON.parse(stdout);
};
