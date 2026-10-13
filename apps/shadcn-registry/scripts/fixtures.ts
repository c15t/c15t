/**
 * Installs every item into fresh shadcn projects and type-checks them, one
 * project per framework and base. This is the closest check to what a user
 * gets from `shadcn add`: real templates, real aliases, the project's own
 * tsconfig.
 *
 * The registry is served from memory on a local port, so nothing needs
 * deploying first. Projects live in the system temp folder, outside the
 * monorepo, so its node_modules can't hide a missing dependency. After the
 * install, the project's c15t is swapped for a symlink to the workspace
 * package, which must be built.
 *
 *   bun scripts/fixtures.ts
 *   bun scripts/fixtures.ts --framework next --base aria
 *   bun scripts/fixtures.ts --c15t ../../../other-checkout/packages/c15t
 *
 * Pass --fresh to scaffold the projects again instead of reusing them.
 */
import { spawn } from 'node:child_process';
import {
	createWriteStream,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { RegistryOutput } from '../src/build-registry';
import { buildRegistry } from '../src/build-registry';
import type { Base, Framework } from '../src/items';
import { bases, frameworks, itemName, setupItems, uiItems } from '../src/items';

const appDir = path.resolve(import.meta.dirname, '..');
const shadcn = path.join(appDir, 'node_modules/.bin/shadcn');
const fixturesDir = path.join(tmpdir(), 'c15t-shadcn-fixtures');

// shadcn picks a package manager from the user agent when the folder has
// no lockfile yet, and npm isn't always installed.
const env = { ...process.env, npm_config_user_agent: 'bun/1.3.11' };

const templates: Record<Framework, string> = {
	next: 'next',
	react: 'vite',
	'tanstack-start': 'start',
};

// Type-checks the item props a user is most likely to pass.
const usageImports = `import { ConsentBanner } from "@/components/c15t/consent-banner"
import { ConsentDialog } from "@/components/c15t/consent-dialog"
import { ConsentDialogTrigger } from "@/components/c15t/consent-dialog-trigger"
import { ConsentGate } from "@/components/c15t/consent-gate"
import { ConsentSheet } from "@/components/c15t/consent-sheet"
import { ConsentWidget } from "@/components/c15t/consent-widget"`;

const usageItems = `      <ConsentBanner className="sm:max-w-md" />
      <ConsentDialog className="sm:max-w-lg" />
      <ConsentDialogTrigger className="bottom-8" />
      <ConsentWidget className="max-w-xl" />
      <ConsentSheet side="left" />
      <ConsentGate category="marketing" className="aspect-video">
        <iframe title="Video" src="https://example.com/embed" />
      </ConsentGate>`;

const usage = (framework: Framework): string =>
	framework === 'tanstack-start'
		? `${usageImports}

export function C15tFixture() {
  return (
    <>
${usageItems}
    </>
  )
}
`
		: `${usageImports}
import { ConsentManager } from "@/components/c15t/consent-manager"

export function C15tFixture() {
  return (
    <ConsentManager>
${usageItems}
    </ConsentManager>
  )
}
`;

// TanStack Start's consent manager takes the root loader's state. This is
// the template's root route with the changes the install notes describe.
// It has to be the real root route: Route.useLoaderData() reads its types
// from the registered route tree.
const startRootRoute = `import type { ReactNode } from "react"
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { consentLoaderOptions } from "c15t/tanstack-start/server"

import { C15tFixture } from "@/components/c15t-fixture"
import {
  ConsentManager,
  getConsentState,
} from "@/components/c15t/consent-manager"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  ...consentLoaderOptions,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  loader: async () => ({ consent: await getConsentState() }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const { consent } = Route.useLoaderData()
  return (
    <ConsentManager state={consent}>
      <Outlet />
      <C15tFixture />
    </ConsentManager>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
`;

const pick = <Value extends string>(
	all: readonly Value[],
	chosen: string[] | undefined,
	flag: string
): Value[] => {
	if (!chosen) {
		return [...all];
	}
	const unknown = chosen.find((value) => !all.includes(value as Value));
	if (unknown) {
		throw new Error(`${flag} ${unknown} isn't one of ${all.join(', ')}.`);
	}
	return chosen as Value[];
};

const run = (
	command: string,
	commandArgs: string[],
	cwd: string,
	log: string
): Promise<boolean> =>
	new Promise((resolve) => {
		const out = createWriteStream(log, { flags: 'a' });
		out.write(`\n$ ${command} ${commandArgs.join(' ')}\n`);
		const child = spawn(command, commandArgs, {
			cwd,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		child.stdout.pipe(out, { end: false });
		child.stderr.pipe(out, { end: false });
		child.on('error', (error) => {
			out.end(`${error.message}\n`);
			resolve(false);
		});
		child.on('close', (code) => {
			out.end();
			resolve(code === 0);
		});
	});

// Next.js keeps components at the project root. Vite and TanStack Start
// keep them in src.
const findFile = (dir: string, relative: string): string | undefined => {
	if (existsSync(path.join(dir, relative))) {
		return path.join(dir, relative);
	}
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory() && entry.name !== 'node_modules') {
			const found = findFile(path.join(dir, entry.name), relative);
			if (found) {
				return found;
			}
		}
	}
	return undefined;
};

/** Returns why the fixture failed, or undefined when it passed. */
const checkFixture = async (
	framework: Framework,
	base: Base,
	options: { c15tDir: string; fresh: boolean; registryUrl: string }
): Promise<string | undefined> => {
	const name = `${framework}-${base}`;
	const dir = path.join(fixturesDir, name);
	const log = path.join(fixturesDir, `${name}.log`);
	rmSync(log, { force: true });

	if (options.fresh || !existsSync(path.join(dir, 'components.json'))) {
		rmSync(dir, { force: true, recursive: true });
		const initArgs = [
			'init',
			...['--template', templates[framework], '--base', base],
			...['--preset', 'nova', '--name', name, '--yes', '--no-monorepo'],
		];
		if (!(await run(shadcn, initArgs, fixturesDir, log))) {
			return 'shadcn init failed';
		}
	}

	const { style } = JSON.parse(
		readFileSync(path.join(dir, 'components.json'), 'utf8')
	) as { style: string };
	const names = [
		...uiItems.map((item) => item.name),
		...setupItems
			.filter((item) => item.framework === framework)
			.map((item) => item.name),
	];
	const urls = names.map(
		(item) =>
			`${options.registryUrl}/${style}/${itemName(framework, item)}.json`
	);
	if (
		!(await run(shadcn, ['add', ...urls, '--yes', '--overwrite'], dir, log))
	) {
		return 'shadcn add failed';
	}

	const banner = findFile(dir, 'components/c15t/consent-banner.tsx');
	if (!banner) {
		return 'components/c15t/consent-banner.tsx was not installed';
	}
	if (framework === 'next' && !existsSync(path.join(dir, 'c15t.config.ts'))) {
		return 'c15t.config.ts was not installed at the project root';
	}
	writeFileSync(
		path.join(path.dirname(path.dirname(banner)), 'c15t-fixture.tsx'),
		usage(framework)
	);
	if (framework === 'tanstack-start') {
		writeFileSync(path.join(dir, 'src/routes/__root.tsx'), startRootRoute);
	}

	const installed = path.join(dir, 'node_modules/c15t');
	rmSync(installed, { force: true, recursive: true });
	symlinkSync(options.c15tDir, installed, 'dir');

	const tsc = path.join(dir, 'node_modules/.bin/tsc');
	const checkArgs = framework === 'react' ? ['-b'] : ['--noEmit'];
	if (!(await run(tsc, checkArgs, dir, log))) {
		return 'type-check failed';
	}
	return undefined;
};

const { values: args } = parseArgs({
	options: {
		base: { multiple: true, type: 'string' },
		c15t: { type: 'string' },
		framework: { multiple: true, type: 'string' },
		fresh: { default: false, type: 'boolean' },
	},
});

const c15tDir = path.resolve(
	args.c15t ?? path.join(appDir, '../../packages/c15t')
);
if (!existsSync(path.join(c15tDir, 'dist'))) {
	throw new Error(
		`${c15tDir} has no dist folder. Build it first: bun turbo run build --filter=c15t`
	);
}
const fixtures = pick(frameworks, args.framework, '--framework').flatMap(
	(framework) =>
		pick(bases, args.base, '--base').map((base) => ({ base, framework }))
);

let registry: RegistryOutput = new Map();
const server = createServer((request, response) => {
	const file = request.url?.replace(/^\/r\//u, '') ?? '';
	const json = registry.get(file);
	response.writeHead(json ? 200 : 404, { 'content-type': 'application/json' });
	response.end(JSON.stringify(json ?? { error: `No ${file}` }));
});
await new Promise<void>((resolve) => {
	server.listen(0, '127.0.0.1', resolve);
});
const { port } = server.address() as AddressInfo;
const registryUrl = `http://127.0.0.1:${port}/r`;

const failures: string[] = [];
try {
	// The published items pin a c15t range that may not be on npm yet. The
	// symlink replaces whatever this installs.
	registry = buildRegistry({
		appDir,
		baseUrl: registryUrl,
		c15tDependency: 'c15t',
	});
	mkdirSync(fixturesDir, { recursive: true });
	console.log(`Registry at ${registryUrl}, projects in ${fixturesDir}`);

	for (const { base, framework } of fixtures) {
		const name = `${framework}-${base}`;
		// oxlint-disable-next-line no-await-in-loop -- Parallel installs fight over Bun's cache and make the logs hard to read.
		const failure = await checkFixture(framework, base, {
			c15tDir,
			fresh: args.fresh,
			registryUrl,
		});
		console.log(failure ? `fail  ${name}: ${failure}` : `pass  ${name}`);
		if (failure) {
			const log = path.join(fixturesDir, `${name}.log`);
			failures.push(`${name}: ${failure}. Log: ${log}`);
		}
	}
} finally {
	server.close();
}

if (failures.length > 0) {
	console.error(`\n${failures.join('\n')}`);
	process.exitCode = 1;
}
