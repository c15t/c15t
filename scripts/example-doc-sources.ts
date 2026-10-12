import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, resolve, sep } from 'node:path';

import { formatDocsCode } from './docs-code-format';

/**
 * Directories whose apps are built and tested in CI. Documentation code that
 * wires c15t into an application comes from marked regions in these files.
 * `internals/fixtures` holds the apps the acceptance suite runs against, and
 * `internals/doc-snippets` holds type-checked code for docs pages that no app
 * runs. Both publish under the same names as an `examples` app would, so a
 * region name must be unique across `examples/<name>`,
 * `internals/fixtures/<name>` and `internals/doc-snippets/<name>`. `apps` is
 * scanned for its Storybook apps, whose design recipes CI runs
 * through `test-storybook`. `benchmarks/tailwind-matrix` holds one fixture per
 * framework and Tailwind version, which `scripts/verify-tailwind-matrix.ts`
 * builds and checks in Chromium.
 */
export const exampleRoots = [
	'examples',
	'internals/fixtures',
	'internals/doc-snippets',
	'internals/next-compat',
	'apps',
	'benchmarks/tailwind-matrix',
] as const;

/** Where generated snippets are written, relative to the repository root. */
export const generatedExamplesDir = 'docs/shared/examples';

/**
 * A marked region of a runnable file that is published in the docs.
 *
 * Mark a region with `#region docs:<name>` and `#endregion docs:<name>` inside
 * any comment syntax the file supports. Add `title="<path>"` to the opening
 * marker when the reader's path differs from the path inside the example app.
 *
 * Demo-only code inside a region stays out of the snippet: end a line with a
 * `docs:hide` comment (`// docs:hide`, `<!-- docs:hide -->`,
 * `{/* docs:hide *\/}` or `/* docs:hide *\/`), or wrap several lines in
 * `#hide docs` and `#endhide docs` markers.
 */
export interface ExampleRegion {
	/** Region name, unique within its example app. */
	name: string;
	/** Example app directory, relative to the repository root. */
	app: string;
	/** Source file, relative to the repository root. */
	source: string;
	/** File path shown to the reader. */
	title: string;
	/** Generated MDX file, relative to the repository root. */
	destination: string;
}

// Markers count only at the start of a line comment, block comment, JSX
// comment, HTML comment or shell comment, so code or prose that mentions a
// marker is published as written.
const markerPrefix = String.raw`^\s*(?:\/\/|\{?\/\*|<!--|#)\s*`;
const openPattern = new RegExp(
	`${markerPrefix}#region docs:(?<name>[a-z0-9][a-z0-9-]*)(?:\\s+title="(?<title>[^"]+)")?`,
	'u'
);
const closePattern = new RegExp(
	`${markerPrefix}#endregion docs:(?<name>[a-z0-9][a-z0-9-]*)`,
	'u'
);
const anyMarker = new RegExp(`${markerPrefix}#(?:end)?region docs:`, 'u');
const hideOpen = /#hide docs\b/u;
const hideClose = /#endhide docs\b/u;
/** A trailing `docs:hide` comment in any of the supported comment syntaxes. */
const hiddenLine =
	/(?:\/\/\s*docs:hide|<!--\s*docs:hide\s*-->|\{\/\*\s*docs:hide\s*\*\/\}|\/\*\s*docs:hide\s*\*\/)\s*$/u;

/**
 * Drops the demo-only lines of a region body: lines ending in a `docs:hide`
 * comment, and everything between `#hide docs` and `#endhide docs`. The hide
 * markers themselves never publish.
 */
const withoutHiddenLines = (
	lines: string[],
	name: string,
	source: string
): string[] => {
	const kept: string[] = [];
	let depth = 0;
	for (const line of lines) {
		if (hideOpen.test(line)) {
			depth += 1;
			continue;
		}
		if (hideClose.test(line)) {
			if (depth === 0) {
				throw new Error(
					`${source} region docs:${name} closes a hide block it never opened.`
				);
			}
			depth -= 1;
			continue;
		}
		if (depth === 0 && !hiddenLine.test(line)) {
			kept.push(line);
		}
	}
	if (depth > 0) {
		throw new Error(
			`${source} region docs:${name} does not close a hide block.`
		);
	}
	return kept;
};

const languages: Record<string, string> = {
	'.astro': 'astro',
	'.css': 'css',
	'.html': 'html',
	'.js': 'js',
	'.json': 'json',
	'.jsx': 'jsx',
	'.mjs': 'js',
	'.sh': 'sh',
	'.svelte': 'svelte',
	'.ts': 'ts',
	'.tsx': 'tsx',
	'.vue': 'vue',
};

/** Returns the fence language for a source file. */
export const languageFor = (source: string): string => {
	if (basename(source).startsWith('.env')) {
		return 'dotenv';
	}
	const language = languages[extname(source)];
	if (!language) {
		throw new Error(`No docs language is configured for ${source}.`);
	}
	return language;
};

/** Returns the example app directory that owns a source file. */
export const appFor = (source: string): string => {
	const [root, name] = source.split('/');
	if (root === 'examples' && name) {
		return `examples/${name}`;
	}
	const internal = source.match(
		/^internals\/(?<root>fixtures|doc-snippets)\/(?<name>[^/]+)\//u
	);
	if (internal?.groups?.root && internal.groups.name) {
		return `internals/${internal.groups.root}/${internal.groups.name}`;
	}
	const compat = source.match(/^internals\/next-compat\/(?<name>[^/]+)\//u);
	if (compat?.groups?.name) {
		return `internals/next-compat/${compat.groups.name}`;
	}
	const storybook = source.match(/^apps\/(?<name>storybook-[^/]+)\//u);
	if (storybook?.groups?.name) {
		return `apps/${storybook.groups.name}`;
	}
	const tailwind = source.match(
		/^benchmarks\/tailwind-matrix\/(?<version>v[34])\/(?<name>[^/]+)\//u
	);
	if (tailwind?.groups?.version && tailwind.groups.name) {
		return `benchmarks/tailwind-matrix/${tailwind.groups.version}/${tailwind.groups.name}`;
	}
	throw new Error(`${source} is not inside an example app.`);
};

const destinationFor = (app: string, name: string): string => {
	let prefix = `next-compat/${app.slice('internals/next-compat/'.length)}`;
	if (app.startsWith('examples/')) {
		prefix = app.slice('examples/'.length);
	} else if (app.startsWith('internals/fixtures/')) {
		prefix = app.slice('internals/fixtures/'.length);
	} else if (app.startsWith('internals/doc-snippets/')) {
		prefix = app.slice('internals/doc-snippets/'.length);
	} else if (app.startsWith('apps/')) {
		prefix = app.slice('apps/'.length);
	} else if (app.startsWith('benchmarks/tailwind-matrix/')) {
		const [version, framework] = app
			.slice('benchmarks/tailwind-matrix/'.length)
			.split('/');
		prefix = `tailwind-${version}/${framework}`;
	}
	return `${generatedExamplesDir}/${prefix}/${name}.mdx`;
};

/**
 * Converts a path that uses `separator` to forward slashes, the form
 * `ExampleRegion.destination` uses on every platform.
 */
export const toPosixPath = (path: string, separator: string = sep): string =>
	path.split(separator).join('/');

/**
 * Lists the generated snippet files on disk, relative to the repository root
 * and with forward slashes, so they compare equal to region destinations.
 */
export const listGeneratedExamples = (root: string): string[] => {
	let entries: string[];
	try {
		entries = readdirSync(resolve(root, generatedExamplesDir), {
			encoding: 'utf8',
			recursive: true,
		});
	} catch {
		return [];
	}
	return entries
		.filter((entry) => entry.endsWith('.mdx'))
		.map((entry) => `${generatedExamplesDir}/${toPosixPath(entry)}`);
};

/** Finds every marked region in one file's contents. */
export const findRegions = (
	source: string,
	content: string
): ExampleRegion[] => {
	const app = appFor(source);
	const regions: ExampleRegion[] = [];
	for (const line of content.split('\n')) {
		const match = line.match(openPattern);
		if (!match?.groups?.name) {
			continue;
		}
		const { name } = match.groups;
		regions.push({
			app,
			destination: destinationFor(app, name),
			name,
			source,
			title: match.groups.title ?? source.slice(app.length + 1),
		});
	}
	return regions;
};

const dedent = (lines: string[]): string[] => {
	const indents = lines
		.filter((line) => line.trim() !== '')
		.map((line) => line.match(/^[\t ]*/u)?.[0].length ?? 0);
	const shared = indents.length > 0 ? Math.min(...indents) : 0;
	return lines.map((line) => line.slice(shared));
};

/**
 * Extracts a region's lines. Markers of this and any nested region are
 * removed, so a file can publish overlapping snippets. Hidden lines are
 * dropped: a region nested inside a hide block still publishes on its own.
 */
export const extractRegion = (
	content: string,
	name: string,
	source: string
): string => {
	const lines = content.split('\n');
	const start = lines.findIndex(
		(line) => line.match(openPattern)?.groups?.name === name
	);
	const end = lines.findIndex(
		(line, index) =>
			index > start && line.match(closePattern)?.groups?.name === name
	);
	if (start === -1) {
		throw new Error(`${source} has no region docs:${name}.`);
	}
	if (end === -1) {
		throw new Error(`${source} does not close region docs:${name}.`);
	}
	const body = withoutHiddenLines(
		lines.slice(start + 1, end),
		name,
		source
	).filter((line) => !anyMarker.test(line));
	while (body[0]?.trim() === '') {
		body.shift();
	}
	while (body.at(-1)?.trim() === '') {
		body.pop();
	}
	if (body.length === 0) {
		throw new Error(`${source} region docs:${name} is empty.`);
	}
	return dedent(body).join('\n');
};

/**
 * Renders a region as an MDX partial containing one titled code fence. The
 * code is reformatted for the docs (see `formatDocsCode`); a region that does
 * not parse on its own is published as written.
 */
export const renderExampleRegion = async (
	root: string,
	region: ExampleRegion
): Promise<string> => {
	const content = readFileSync(resolve(root, region.source), 'utf8');
	const extracted = extractRegion(content, region.name, region.source);
	const language = languageFor(region.source);
	const code = (await formatDocsCode(language, extracted)) ?? extracted;
	const fence = code.includes('```') ? '````' : '```';
	return [
		`{/* Generated from ${region.source} (docs:${region.name}) by scripts/sync-example-docs.ts. Edit the source file. */}`,
		'',
		`${fence}${language} title="${region.title}"`,
		code,
		fence,
		'',
	].join('\n');
};

const trackedFiles = (root: string): string[] =>
	execFileSync('git', ['ls-files', '-z', '--', ...exampleRoots], {
		cwd: root,
		encoding: 'utf8',
	})
		.split('\0')
		.filter(Boolean);

/**
 * Collects every marked region in tracked example files.
 *
 * @throws {Error} When two regions in one app share a name.
 */
export const collectExampleRegions = (root: string): ExampleRegion[] => {
	const regions: ExampleRegion[] = [];
	for (const source of trackedFiles(root)) {
		let content: string;
		try {
			content = readFileSync(resolve(root, source), 'utf8');
		} catch {
			continue;
		}
		// Markdown such as a README documents the markers rather than using them.
		if (source.endsWith('.md') || !content.includes('#region docs:')) {
			continue;
		}
		regions.push(...findRegions(source, content));
	}
	const seen = new Map<string, string>();
	for (const region of regions) {
		const previous = seen.get(region.destination);
		if (previous) {
			throw new Error(
				`Region docs:${region.name} is defined in both ${previous} and ${region.source}.`
			);
		}
		seen.set(region.destination, region.source);
	}
	return regions.sort((a, b) => a.destination.localeCompare(b.destination));
};
