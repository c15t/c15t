import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	collectExampleRegions,
	listGeneratedExamples,
	renderExampleRegion,
} from './example-doc-sources';
import {
	countHandWrittenExamples,
	handWrittenBaselinePath,
	lowerBaseline,
} from './hand-written-examples';
import {
	renderThemeTokens,
	themeTokenDestination,
} from './theme-token-reference';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');

const regions = collectExampleRegions(root);
const expected = new Set(regions.map((region) => region.destination));
const problems: string[] = [];

const rendered = await Promise.all(
	regions.map((region) => renderExampleRegion(root, region))
);

for (const [index, region] of regions.entries()) {
	const destination = resolve(root, region.destination);
	const content = rendered[index] ?? '';
	if (check) {
		let current = '';
		try {
			current = readFileSync(destination, 'utf8');
		} catch {
			// Reported below as stale.
		}
		if (current !== content) {
			problems.push(`${region.destination} is stale.`);
		}
	} else {
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, content);
	}
}

{
	const destination = resolve(root, themeTokenDestination);
	const content = renderThemeTokens(root);
	if (check) {
		let current = '';
		try {
			current = readFileSync(destination, 'utf8');
		} catch {
			// Reported below as stale.
		}
		if (current !== content) {
			problems.push(`${themeTokenDestination} is stale.`);
		}
	} else {
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, content);
	}
}

for (const file of listGeneratedExamples(root)) {
	if (expected.has(file)) {
		continue;
	}
	if (check) {
		problems.push(`${file} no longer has a source region.`);
	} else {
		rmSync(resolve(root, file));
	}
}

if (!check) {
	const baselineFile = resolve(root, handWrittenBaselinePath);
	const baseline = JSON.parse(readFileSync(baselineFile, 'utf8')) as Record<
		string,
		number
	>;
	const lowered = lowerBaseline(baseline, countHandWrittenExamples(root));
	writeFileSync(baselineFile, `${JSON.stringify(lowered, null, '\t')}\n`);
}

if (problems.length > 0) {
	throw new Error(
		`${problems.join('\n')}\nRun bun scripts/sync-example-docs.ts.`
	);
}
