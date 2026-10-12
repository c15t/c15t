import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import integrations from '../integrations/package.json';

const root = import.meta.dirname;
const runtimeFiles = readdirSync(join(root, '../integrations/dist'), {
	encoding: 'utf8',
	recursive: true,
}).filter((file) => file.endsWith('.js'));

if (runtimeFiles.length === 0) {
	throw new Error('Build @c15t/integrations before its compatibility package.');
}

// Mirror wildcard paths as well as the short vendor aliases in the export map.
// Both names resolve to the same module, preserving caches and function identity.
const entries = new Map(
	runtimeFiles.map((file) => {
		const subpath = file.replaceAll('\\', '/').slice(0, -3);
		return [subpath, subpath];
	})
);
for (const subpath of Object.keys(integrations.exports)) {
	if (subpath.startsWith('./') && !subpath.includes('*')) {
		entries.set(subpath.slice(2), subpath.slice(2));
	}
}

for (const directory of ['dist', 'dist-types']) {
	rmSync(join(root, directory), { force: true, recursive: true });
}
for (const [subpath, target] of entries) {
	const source = `/** @deprecated Use @c15t/integrations/${target}. Compatibility ends in v4. */\nexport * from '@c15t/integrations/${target}';\n`;
	for (const [directory, extension] of [
		['dist', '.js'],
		['dist-types', '.d.ts'],
	] as const) {
		const output = join(root, directory, `${subpath}${extension}`);
		mkdirSync(dirname(output), { recursive: true });
		writeFileSync(output, source);
	}
}
