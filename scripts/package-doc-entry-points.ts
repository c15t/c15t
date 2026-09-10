const frameworkEntryPoints = [
	['frameworks/next/quickstart.md', 'Next.js quickstart'],
	['frameworks/next/app-router.md', 'App Router setup'],
	['frameworks/next/pages-router.md', 'Pages Router setup'],
	['frameworks/next/static-export.md', 'Static export setup'],
	['frameworks/tanstack-start/quickstart.md', 'TanStack Start quickstart'],
	['frameworks/react/quickstart.md', 'React quickstart'],
	['frameworks/nuxt/quickstart.md', 'Nuxt quickstart'],
	['frameworks/vue/quickstart.md', 'Vue quickstart'],
	['frameworks/astro/quickstart.md', 'Astro quickstart'],
	['frameworks/svelte/quickstart.md', 'Svelte quickstart'],
	['frameworks/sveltekit/quickstart.md', 'SvelteKit quickstart'],
	['frameworks/javascript/quickstart.md', 'JavaScript quickstart'],
] as const;

/** Add setup links that survive each package's filtered documentation bundle. */
export const withPackageSetupLinks = function withPackageSetupLinks(
	content: string,
	bundledFiles: ReadonlySet<string>
): string {
	const candidates = bundledFiles.has('frameworks/index.md')
		? [['frameworks/index.md', 'Choose your framework']]
		: frameworkEntryPoints;
	const setup = [
		...candidates,
		['self-host/quickstart.md', 'Backend quickstart'],
		['cli/quickstart.md', 'CLI quickstart'],
	].filter(([file]) => file && bundledFiles.has(file));
	if (setup.length === 0 && bundledFiles.has('integrations/overview.md')) {
		setup.push(['integrations/overview.md', 'Connect your integrations']);
	}
	const heading = '## Start here\n\n';
	const startHere = content.split(heading)[1]?.split('\n## ')[0] ?? '';
	const links = setup
		.filter(([file]) => !startHere.includes(`(./docs/${file})`))
		.map(([file, label]) => `- [${label}](./docs/${file})`)
		.join('\n');
	if (!links) {
		return content;
	}
	if (!content.includes(heading)) {
		throw new Error('Package documentation is missing its Start here section');
	}
	return content.replace(heading, `${heading}${links}\n`);
};
