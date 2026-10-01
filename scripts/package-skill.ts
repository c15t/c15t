/** Framework guides a package skill can point to, in selector order. */
const frameworkGuides = [
	['next', 'Next.js'],
	['tanstack-start', 'TanStack Start'],
	['react', 'React'],
	['nuxt', 'Nuxt'],
	['vue', 'Vue'],
	['astro', 'Astro'],
	['svelte', 'Svelte'],
	['sveltekit', 'SvelteKit'],
	['html', 'HTML script tag'],
	['javascript', 'JavaScript'],
] as const;

/**
 * Package skill metadata. `topic` completes "Use when ..." and names the
 * frameworks or task the package serves.
 */
export interface PackageSkill {
	topic: string;
	install: string;
	/** True when the `c15t` umbrella package re-exports this package. */
	umbrella?: boolean;
}

const link = (
	bundledFiles: ReadonlySet<string>,
	file: string,
	label: string
): string | undefined =>
	bundledFiles.has(file) ? `[${label}](./docs/${file})` : undefined;

/**
 * Renders the SKILL.md that ships next to AGENTS.md. It replaces leadtype's
 * generic pointer with the decisions an agent must get right before it reads
 * a guide. Links only point to pages present in this package's bundle.
 */
export const renderPackageSkill = function renderPackageSkill(
	packageName: string,
	skill: PackageSkill,
	bundledFiles: ReadonlySet<string>
): string {
	const slug = packageName.replace(/^@/u, '').replace(/\//gu, '-');
	const quickstarts = frameworkGuides
		.map(([dir, label]) =>
			link(bundledFiles, `frameworks/${dir}/quickstart.md`, label)
		)
		.filter(Boolean);
	const lines = [
		'---',
		`name: ${slug}`,
		`description: Set up, customize or debug c15t consent management with ${packageName}. Use when ${skill.topic}, or when a task mentions a cookie banner, consent dialog, GDPR or CCPA prompts, blocking analytics until consent, Google Consent Mode or IAB TCF.`,
		'---',
		'',
		`# c15t with ${packageName}`,
		'',
		'The Markdown under `./docs` matches the installed version. Read it before writing code: v3 renamed most v2 APIs, so remembered examples are usually wrong.',
		'',
		'## Before writing code',
		'',
		'1. Find the framework, router, rendering mode (server, static or single-page) and host in the project.',
	];
	const chooser = link(
		bundledFiles,
		'concepts/choose-your-setup.md',
		'Choose your setup'
	);
	if (chooser) {
		lines.push(`2. Pick the matching row in ${chooser}.`);
	}
	if (quickstarts.length > 0) {
		lines.push(
			`${chooser ? 3 : 2}. Follow that guide from start to finish: ${quickstarts.join(', ')}.`
		);
	}
	lines.push(
		'',
		'## Rules',
		'',
		`- Install with the \`alpha\` tag: ${skill.install}. npm \`latest\` is still v2. Keep every c15t package on the same release.${skill.umbrella ? ' New apps install `c15t` and import its framework subpath. An app that already depends on this scoped package can keep importing from it, but should not install both.' : ''}`,
		"- The backend URL comes from the user's Inth project or self-hosted backend. It is public configuration. Never invent one; ask for it or read it from the environment.",
		'- Register analytics, pixels and embeds through c15t and remove the vendor\'s own loader or plugin. With a bundler, use `@c15t/integrations` helpers and `ConsentGate`. On a plain HTML page, change the vendor\'s `<script>` to `type="text/plain"` with `data-c15t-category`. A banner does not block code loaded elsewhere.',
		'- Gate features on the current permission. Never save a consent choice on page load or from code; only a visitor action records one.',
		'- Offline mode keeps policies in code and choices in the browser, with no consent records. Not recommended for production environments.',
		'- Keep one consent provider or root for the whole app, mounted outside route-level components.',
		'',
		'## Customize with the smallest change',
		'',
		'Copy and languages use i18n configuration. Position and layout use component props. Colors, type, radius and spacing use theme tokens. One part of a component uses slots. Different markup uses compound or headless components.'
	);
	const customize =
		link(bundledFiles, 'customization/overview.md', 'Customization overview') ??
		frameworkGuides
			.map(([dir, label]) =>
				link(
					bundledFiles,
					`frameworks/${dir}/customize.md`,
					`${label} customization`
				)
			)
			.find(Boolean);
	if (customize) {
		lines.push(`Start at ${customize}.`);
	}
	const verify = link(
		bundledFiles,
		'guides/verify-consent.md',
		'Verify consent before shipping'
	);
	const troubleshoot = link(
		bundledFiles,
		'guides/troubleshooting.md',
		'Troubleshooting'
	);
	lines.push(
		'',
		'## Finish with a check',
		'',
		`A visible banner proves nothing. In a production build, confirm vendor requests are absent before consent, a rejection survives a reload, and preferences reopen.${verify ? ` Follow ${verify}.` : ''}${troubleshoot ? ` If something fails, start with ${troubleshoot}.` : ''}`,
		'',
		'`./AGENTS.md` lists every bundled page.',
		''
	);
	return lines.join('\n');
};
