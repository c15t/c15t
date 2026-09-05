// Loads every conditional umbrella subpath and its scoped counterpart with
// plain-Node semantics — real `import()`, outside Vitest's Vite pipeline, so
// module resolution behaves exactly as it does for a consumer — and prints a
// JSON report to stdout. Spawned by `facade-parity.test.ts`; not a test file
// itself.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(
	readFileSync(join(packageDir, 'package.json'), 'utf8')
);

/**
 * Umbrella prefix → scoped package, mirroring `UMBRELLA_SOURCES` in
 * `scripts/generate-umbrella-exports.ts`. Subpaths outside every prefix
 * belong to the root-mounted `@c15t/core`.
 */
const PREFIXES = [
	{ packageName: '@c15t/react', prefix: 'react' },
	{ packageName: '@c15t/nextjs', prefix: 'next' },
	{ packageName: '@c15t/tanstack-start', prefix: 'tanstack-start' },
	{ packageName: '@c15t/vue', prefix: 'vue' },
];

const toScopedSpecifier = function toScopedSpecifier(subpath) {
	const segment = subpath === '.' ? '' : subpath.slice(2);
	for (const { packageName, prefix } of PREFIXES) {
		if (segment === prefix) {
			return packageName;
		}
		if (segment.startsWith(`${prefix}/`)) {
			return `${packageName}/${segment.slice(prefix.length + 1)}`;
		}
	}
	return segment ? `@c15t/core/${segment}` : '@c15t/core';
};

const listShimModules = function listShimModules(directory, prefix = '') {
	const names = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			names.push(...listShimModules(join(directory, entry.name), relative));
		} else if (entry.name.endsWith('.js')) {
			names.push(relative.slice(0, -'.js'.length));
		}
	}
	return names.sort();
};

const toFailure = function toFailure(error) {
	return {
		code: typeof error?.code === 'string' ? error.code : null,
		message: String(error?.message ?? error).split('\n')[0],
		name: error?.name ?? null,
		ok: false,
	};
};

const probeImport = async function probeImport(specifier) {
	try {
		const namespace = await import(specifier);
		return {
			hasDefault: 'default' in namespace,
			keys: Object.keys(namespace).sort(),
			ok: true,
		};
	} catch (error) {
		return toFailure(error);
	}
};

const rows = [];
for (const [subpath, value] of Object.entries(manifest.exports)) {
	if (typeof value === 'string') {
		// CSS copies and raw string wildcards are files, not loadable modules;
		// facade-parity.test.ts checks those against the scoped packages on
		// disk instead.
		continue;
	}

	let concretes = [subpath];
	if (subpath.includes('*')) {
		const shimDir = join(
			packageDir,
			value.import.slice(2).replace('/*.js', '')
		);
		concretes = listShimModules(shimDir).map((name) =>
			subpath.replace('*', name)
		);
	}

	// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
	await Array.from(concretes).reduce(async (previousIteration, concrete) => {
		await previousIteration;
		const umbrella = concrete === '.' ? 'c15t' : `c15t/${concrete.slice(2)}`;
		const scoped = toScopedSpecifier(concrete);
		const row = { scoped, subpath: concrete, umbrella };
		if (value.import || value.svelte || value.default) {
			row.esm = {
				scoped: await probeImport(scoped),
				umbrella: await probeImport(umbrella),
			};
		}
		rows.push(row);
	}, Promise.resolve());
}

process.stdout.write(JSON.stringify(rows));
