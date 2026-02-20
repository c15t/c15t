import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function run(command: string, args: string[]): void {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: false,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const runtimeOut = 'examples/demo/public/c15t-embed.runtime.iife.js';
const runtimeFullOut = 'examples/demo/public/c15t-embed.runtime-full.iife.js';
const runtimeIabOut = 'examples/demo/public/c15t-embed.runtime-iab.iife.js';
const devtoolsOut = 'examples/demo/public/c15t-embed.devtools.iife.js';

mkdirSync(dirname(runtimeOut), { recursive: true });

console.log('[embed-iife] Building runtime (Preact compat aliases)...');
run('bun', [
	'x',
	'esbuild',
	'packages/embed/src/runtime.tsx',
	'--bundle',
	'--platform=browser',
	'--format=iife',
	'--target=es2020',
	'--global-name=c15tEmbedBundle',
	'--alias:c15t=./packages/core/src',
	'--alias:react=preact/compat',
	'--alias:react-dom=preact/compat',
	'--alias:react-dom/client=preact/compat/client',
	'--alias:react/jsx-runtime=preact/jsx-runtime',
	'--alias:react/jsx-dev-runtime=preact/jsx-dev-runtime',
	'--define:process.env.NODE_ENV="production"',
	'--minify',
	`--outfile=${runtimeOut}`,
	'--log-level=info',
]);

console.log(
	'[embed-iife] Building runtime IAB addon (Preact compat aliases)...'
);
run('bun', [
	'x',
	'esbuild',
	'packages/embed/src/runtime-iab.tsx',
	'--bundle',
	'--platform=browser',
	'--format=iife',
	'--target=es2020',
	'--global-name=c15tEmbedIabBundle',
	'--alias:c15t=./packages/core/src',
	'--alias:react=preact/compat',
	'--alias:react-dom=preact/compat',
	'--alias:react-dom/client=preact/compat/client',
	'--alias:react/jsx-runtime=preact/jsx-runtime',
	'--alias:react/jsx-dev-runtime=preact/jsx-dev-runtime',
	'--define:process.env.NODE_ENV="production"',
	'--minify',
	`--outfile=${runtimeIabOut}`,
	'--log-level=info',
]);

console.log('[embed-iife] Building runtime full (Preact compat aliases)...');
run('bun', [
	'x',
	'esbuild',
	'packages/embed/src/runtime-full.ts',
	'--bundle',
	'--platform=browser',
	'--format=iife',
	'--target=es2020',
	'--global-name=c15tEmbedBundle',
	'--alias:c15t=./packages/core/src',
	'--alias:react=preact/compat',
	'--alias:react-dom=preact/compat',
	'--alias:react-dom/client=preact/compat/client',
	'--alias:react/jsx-runtime=preact/jsx-runtime',
	'--alias:react/jsx-dev-runtime=preact/jsx-dev-runtime',
	'--define:process.env.NODE_ENV="production"',
	'--minify',
	`--outfile=${runtimeFullOut}`,
	'--log-level=info',
]);

console.log('[embed-iife] Building devtools bundle...');
run('bun', [
	'x',
	'esbuild',
	'packages/embed/src/devtools.ts',
	'--bundle',
	'--platform=browser',
	'--format=iife',
	'--target=es2020',
	'--global-name=c15tEmbedDevToolsBundle',
	'--alias:c15t=./packages/core/src',
	'--define:process.env.NODE_ENV="production"',
	'--minify',
	`--outfile=${devtoolsOut}`,
	'--log-level=info',
]);

console.log('[embed-iife] Done');
