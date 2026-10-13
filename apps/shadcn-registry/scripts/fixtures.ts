/**
 * Installs every item into fresh shadcn projects and type-checks them, one
 * project per framework and base. This is the closest check to what a user
 * gets from `shadcn add`: real templates, real aliases, the project's own
 * tsconfig.
 *
 * The registry is served from memory on a local port, so nothing needs
 * deploying first. Projects live in the system temp folder, outside the
 * monorepo, so its node_modules can't hide a missing dependency. c15t comes
 * from the workspace: the script packs it and the @c15t packages it
 * depends on, which must be built, and the project installs the tarballs
 * the way it would install a release.
 *
 * After `shadcn add`, the script makes the changes the install notes ask
 * for and renders the trigger, widget and gate on the home page.
 *
 *   bun scripts/fixtures.ts
 *   bun scripts/fixtures.ts --framework next --base aria
 *   bun scripts/fixtures.ts --c15t ../../../other-checkout/packages/c15t
 *
 * Pass --browser to also build each project for production and click
 * through it in Chromium. See fixture-browser.ts. Pass --fresh to scaffold
 * the projects again instead of reusing them.
 */
import { createHash } from 'node:crypto';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { Browser } from 'playwright';
import { chromium } from 'playwright';

import type { RegistryOutput } from '../src/build-registry';
import { buildRegistry } from '../src/build-registry';
import type { Base, Framework } from '../src/items';
import { bases, frameworks, itemName, setupItems, uiItems } from '../src/items';
import { checkInBrowser } from './fixture-browser';
import { run } from './fixture-process';

const appDir = path.resolve(import.meta.dirname, '..');
const shadcn = path.join(appDir, 'node_modules/.bin/shadcn');
const fixturesDir = path.join(tmpdir(), 'c15t-shadcn-fixtures');
const packsDir = path.join(fixturesDir, 'packs');

const templates: Record<Framework, string> = {
	next: 'next',
	react: 'vite',
	'tanstack-start': 'start',
};

// Type-checks the item props a user is most likely to pass. Not rendered.
const propsCheck = `import { ConsentBanner } from "@/components/c15t/consent-banner"
import { ConsentDialog } from "@/components/c15t/consent-dialog"
import { ConsentDialogTrigger } from "@/components/c15t/consent-dialog-trigger"
import { ConsentGate } from "@/components/c15t/consent-gate"
import { ConsentSheet } from "@/components/c15t/consent-sheet"
import { ConsentWidget } from "@/components/c15t/consent-widget"

export function C15tProps() {
  return (
    <>
      <ConsentBanner className="sm:max-w-md" />
      <ConsentDialog className="sm:max-w-lg" />
      <ConsentDialogTrigger className="bottom-8" />
      <ConsentWidget className="max-w-xl" />
      <ConsentSheet side="left" />
      <ConsentGate category="marketing" className="aspect-video">
        <iframe title="Video" src="https://example.com/embed" />
      </ConsentGate>
    </>
  )
}
`;

// The home page. fixture-browser.ts looks for this copy.
const page = `import { ConsentDialogTrigger } from "@/components/c15t/consent-dialog-trigger"
import { ConsentGate } from "@/components/c15t/consent-gate"
import { ConsentWidget } from "@/components/c15t/consent-widget"

export function C15tPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-lg font-medium">c15t fixture</h1>
      <ConsentGate category="marketing" className="aspect-video">
        <p>Marketing embed</p>
      </ConsentGate>
      <ConsentWidget />
      <ConsentDialogTrigger />
    </main>
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

const startIndexRoute = `import { createFileRoute } from "@tanstack/react-router"

import { C15tPage } from "@/components/c15t-page"

export const Route = createFileRoute("/")({ component: C15tPage })
`;

const reactApp = `import { C15tPage } from "@/components/c15t-page"
import { ConsentManager } from "@/components/c15t/consent-manager"

export function App() {
  return (
    <ConsentManager>
      <C15tPage />
    </ConsentManager>
  )
}

export default App
`;

const nextPage = `import { C15tPage } from "@/components/c15t-page"

export default function Page() {
  return <C15tPage />
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

/** Replaces `from` in a template file, and fails if the template changed. */
const edit = (file: string, from: string, to: string) => {
	const content = readFileSync(file, 'utf8');
	if (!content.includes(from)) {
		throw new Error(
			`${file} has no ${JSON.stringify(from)}. The template changed, so update scripts/fixtures.ts.`
		);
	}
	writeFileSync(file, content.replace(from, to));
};

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

interface WorkspacePackage {
	dependencies: Record<string, string>;
	dir: string;
}

const readWorkspace = (packagesDir: string) => {
	const packages = new Map<string, WorkspacePackage>();
	for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
		const manifest = path.join(packagesDir, entry.name, 'package.json');
		if (entry.isDirectory() && existsSync(manifest)) {
			const { dependencies = {}, name } = JSON.parse(
				readFileSync(manifest, 'utf8')
			) as { dependencies?: Record<string, string>; name: string };
			packages.set(name, {
				dependencies,
				dir: path.join(packagesDir, entry.name),
			});
		}
	}
	return packages;
};

/**
 * Packs c15t and every workspace package it depends on, directly or not.
 *
 * @returns The tarball for each package name. File names include a content hash, so Bun never installs a stale copy.
 * @throws {Error} When a package isn't built or doesn't pack.
 */
const packWorkspace = async (
	c15tDir: string,
	log: string
): Promise<Map<string, string>> => {
	const workspace = readWorkspace(path.dirname(c15tDir));
	const names = new Set<string>();
	const visit = (name: string) => {
		const workspacePackage = workspace.get(name);
		if (!workspacePackage || names.has(name)) {
			return;
		}
		names.add(name);
		for (const [dependency, range] of Object.entries(
			workspacePackage.dependencies
		)) {
			if (range.startsWith('workspace:')) {
				visit(dependency);
			}
		}
	};
	visit('c15t');
	if (!names.has('c15t')) {
		throw new Error(`${path.dirname(c15tDir)} has no c15t package.`);
	}

	rmSync(packsDir, { force: true, recursive: true });
	mkdirSync(packsDir, { recursive: true });
	const packed = await Promise.all(
		[...names].map(async (name): Promise<[string, string]> => {
			const dir = workspace.get(name)?.dir ?? '';
			if (!existsSync(path.join(dir, 'dist'))) {
				throw new Error(
					`${name} has no dist folder. Build it first: bun turbo run build --filter=c15t`
				);
			}
			const slug = name.replace('@', '').replace('/', '-');
			const tarball = path.join(packsDir, `${slug}.tgz`);
			// --ignore-scripts skips prepack, which regenerates the package's
			// docs in the working tree.
			const packArgs = ['pm', 'pack', '--ignore-scripts', '--quiet'];
			if (
				!(await run(
					process.execPath,
					[...packArgs, '--filename', tarball],
					dir,
					log
				))
			) {
				throw new Error(`${name} didn't pack. Log: ${log}`);
			}
			const hash = createHash('sha256')
				.update(readFileSync(tarball))
				.digest('hex')
				.slice(0, 12);
			const hashed = path.join(packsDir, `${slug}-${hash}.tgz`);
			renameSync(tarball, hashed);
			return [name, hashed];
		})
	);
	return new Map(packed);
};

/** Points the project's @c15t packages at the tarballs, before `shadcn add` installs c15t. */
const installFromTarballs = (dir: string, tarballs: Map<string, string>) => {
	const manifestFile = path.join(dir, 'package.json');
	const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Record<
		string,
		unknown
	>;
	manifest.overrides = Object.fromEntries(
		[...tarballs]
			.filter(([name]) => name !== 'c15t')
			.map(([name, tarball]) => [name, `file:${tarball}`])
	);
	writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
	rmSync(path.join(dir, 'node_modules/c15t'), { force: true, recursive: true });
	rmSync(path.join(dir, 'node_modules/@c15t'), {
		force: true,
		recursive: true,
	});
};

/** Makes the changes each consent manager's install notes ask for. */
const wire = (framework: Framework, dir: string) => {
	if (framework === 'next') {
		const config = path.join(dir, 'next.config.ts');
		edit(
			config,
			'import type { NextConfig } from "next"',
			'import type { NextConfig } from "next"\nimport { withConsentManifest } from "c15t/next/build"'
		);
		edit(
			config,
			'export default nextConfig',
			'export default withConsentManifest(nextConfig)'
		);
		const layout = path.join(dir, 'app/layout.tsx');
		edit(
			layout,
			'import { ThemeProvider } from "@/components/theme-provider"',
			'import { ThemeProvider } from "@/components/theme-provider"\nimport { ConsentManager } from "@/components/c15t/consent-manager"'
		);
		edit(
			layout,
			'<ThemeProvider>{children}</ThemeProvider>',
			'<ThemeProvider>\n          <ConsentManager>{children}</ConsentManager>\n        </ThemeProvider>'
		);
		writeFileSync(path.join(dir, 'app/page.tsx'), nextPage);
		return;
	}

	const config = path.join(dir, 'vite.config.ts');
	if (framework === 'react') {
		edit(
			config,
			'import { defineConfig } from "vite"',
			'import { consentManifest } from "c15t/build"\nimport { defineConfig } from "vite"'
		);
		edit(
			config,
			'plugins: [react(), tailwindcss()]',
			'plugins: [react(), tailwindcss(), consentManifest()]'
		);
		writeFileSync(path.join(dir, 'src/App.tsx'), reactApp);
		return;
	}

	edit(
		config,
		'import { defineConfig } from "vite"',
		'import { defineConfig } from "vite"\nimport { consentManifest } from "c15t/tanstack-start/build"'
	);
	edit(
		config,
		'tanstackStart(), viteReact()',
		'consentManifest(), tanstackStart(), viteReact()'
	);
	writeFileSync(path.join(dir, 'src/routes/__root.tsx'), startRootRoute);
	writeFileSync(path.join(dir, 'src/routes/index.tsx'), startIndexRoute);
};

interface FixtureOptions {
	browser?: Browser;
	fresh: boolean;
	registryUrl: string;
	tarballs: Map<string, string>;
}

/** Returns why the fixture failed. Empty when it passed. */
const checkFixture = async (
	framework: Framework,
	base: Base,
	options: FixtureOptions
): Promise<string[]> => {
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
			return ['shadcn init failed'];
		}
	} else if (existsSync(path.join(dir, '.git'))) {
		// Back to the template as scaffolded, so the edits below apply.
		const reset = await run('git', ['reset', '--hard', '--quiet'], dir, log);
		if (!(reset && (await run('git', ['clean', '-fdq'], dir, log)))) {
			return ['resetting the project failed'];
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
	installFromTarballs(dir, options.tarballs);
	if (
		!(await run(shadcn, ['add', ...urls, '--yes', '--overwrite'], dir, log))
	) {
		return ['shadcn add failed'];
	}

	const banner = findFile(dir, 'components/c15t/consent-banner.tsx');
	if (!banner) {
		return ['components/c15t/consent-banner.tsx was not installed'];
	}
	if (framework === 'next' && !existsSync(path.join(dir, 'c15t.config.ts'))) {
		return ['c15t.config.ts was not installed at the project root'];
	}
	const componentsDir = path.dirname(path.dirname(banner));
	writeFileSync(path.join(componentsDir, 'c15t-props.tsx'), propsCheck);
	writeFileSync(path.join(componentsDir, 'c15t-page.tsx'), page);
	wire(framework, dir);

	const tsc = path.join(dir, 'node_modules/.bin/tsc');
	const checkArgs = framework === 'react' ? ['-b'] : ['--noEmit'];
	if (!(await run(tsc, checkArgs, dir, log))) {
		return ['type-check failed'];
	}

	if (!options.browser) {
		return [];
	}
	return checkInBrowser(
		{
			dir,
			framework,
			log,
			manager: path.join(componentsDir, 'c15t/consent-manager.tsx'),
			screenshots: path.join(fixturesDir, name),
		},
		options.browser
	);
};

const { values: args } = parseArgs({
	options: {
		base: { multiple: true, type: 'string' },
		browser: { default: false, type: 'boolean' },
		c15t: { type: 'string' },
		framework: { multiple: true, type: 'string' },
		fresh: { default: false, type: 'boolean' },
	},
});

const c15tDir = path.resolve(
	args.c15t ?? path.join(appDir, '../../packages/c15t')
);
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
let browser: Browser | undefined;
try {
	mkdirSync(fixturesDir, { recursive: true });
	const tarballs = await packWorkspace(
		c15tDir,
		path.join(fixturesDir, 'pack.log')
	);
	// The published items pin a c15t range that may not be on npm yet, so
	// the fixtures install the packed workspace copy instead.
	registry = buildRegistry({
		appDir,
		baseUrl: registryUrl,
		c15tDependency: `c15t@file:${tarballs.get('c15t')}`,
	});
	if (args.browser) {
		browser = await chromium.launch();
	}
	console.log(`Registry at ${registryUrl}, projects in ${fixturesDir}`);

	for (const { base, framework } of fixtures) {
		const name = `${framework}-${base}`;
		// oxlint-disable-next-line no-await-in-loop -- Parallel installs fight over Bun's cache and make the logs hard to read.
		const problems = await checkFixture(framework, base, {
			browser,
			fresh: args.fresh,
			registryUrl,
			tarballs,
		});
		console.log(
			problems.length > 0
				? `fail  ${name}\n  ${problems.join('\n  ')}`
				: `pass  ${name}`
		);
		if (problems.length > 0) {
			const log = path.join(fixturesDir, `${name}.log`);
			failures.push(`${name}: ${problems.length} failed. Log: ${log}`);
		}
	}
} finally {
	await browser?.close();
	server.close();
}

if (failures.length > 0) {
	console.error(`\n${failures.join('\n')}`);
	process.exitCode = 1;
}
