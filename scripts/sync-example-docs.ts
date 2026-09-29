import {
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	collectExampleRegions,
	generatedExamplesDir,
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

const listGenerated = (dir: string): string[] => {
	let entries: string[];
	try {
		entries = readdirSync(dir, { encoding: 'utf8', recursive: true });
	} catch {
		return [];
	}
	return entries
		.filter((entry) => entry.endsWith('.mdx'))
		.map((entry) => relative(root, resolve(dir, entry)));
};

const regions = collectExampleRegions(root);
const expected = new Set(regions.map((region) => region.destination));
const problems: string[] = [];

for (const region of regions) {
	const destination = resolve(root, region.destination);
	const content = renderExampleRegion(root, region);
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

for (const file of listGenerated(resolve(root, generatedExamplesDir))) {
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
