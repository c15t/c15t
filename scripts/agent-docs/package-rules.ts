import { getAgentPackageConfig } from './config';

export type SupportedDocsPackage =
	| 'c15t'
	| '@c15t/react'
	| '@c15t/nextjs'
	| '@c15t/backend';

export type WorkflowRule = {
	id: string;
	title: string;
	appliesWhen: string[];
	prefer: string[];
	fallback?: string[];
	avoid?: string[];
	readNext: string[];
};

export type PackageDocsLanding = {
	packageName: SupportedDocsPackage;
	packageLabel: string;
	purpose: string;
	startHere: string[];
	workflowRules: WorkflowRule[];
};

type PackageDocsLandingConfig = {
	purpose: string;
	workflowRules: WorkflowRule[];
};

const PACKAGE_RULES: Record<SupportedDocsPackage, PackageDocsLandingConfig> = {
	c15t: {
		purpose:
			'Core c15t JavaScript docs for consent management, script loading, callbacks, and integrations.',
		workflowRules: [
			{
				id: 'scripts-integrations',
				title: 'Scripts & Integrations',
				appliesWhen: [
					'adding or updating analytics, advertising, or third-party scripts',
					'gating script loading behind consent categories',
					'deciding between a premade integration and a custom script',
				],
				prefer: [
					'Check for a premade integration in `@c15t/scripts/*` before writing a custom script.',
					'Read `script-loader.md` and the relevant page in `integrations/` before implementing script loading.',
					'Start from the documented Meta Pixel, GTM, Google Tag, PostHog, TikTok Pixel, or other premade integration when it matches the requirement.',
				],
				fallback: [
					'Use a custom `createScript` flow only when no premade integration exists or the documented one cannot satisfy the requirement.',
				],
				avoid: [
					'Do not reimplement consent-sync logic if the documented integration already handles it.',
				],
				readNext: [
					'quickstart.md',
					'script-loader.md',
					'integrations/google-tag-manager.md',
					'integrations/meta-pixel.md',
				],
			},
			{
				id: 'callbacks',
				title: 'Consent Runtime Hooks / Callbacks',
				appliesWhen: [
					'running app logic when consent changes',
					'integrating an unsupported third-party SDK',
					'deciding whether a callback is necessary',
				],
				prefer: [
					'Prefer built-in integrations and standard runtime configuration before reaching for callbacks.',
					'Use callbacks when consent changes need to drive app behavior or an unsupported SDK.',
				],
				avoid: [
					'Do not duplicate script-loading behavior in callbacks if a premade script integration already exists.',
				],
				readNext: ['callbacks.md', 'quickstart.md'],
			},
		],
	},
	'@c15t/react': {
		purpose:
			'React-focused c15t docs for consent UI, hooks, headless flows, and script integrations.',
		workflowRules: [
			{
				id: 'styling',
				title: 'Styling',
				appliesWhen: [
					'customizing component appearance',
					'adapting c15t components to a design system',
					'deciding how far to override the default UI',
				],
				prefer: [
					'Prefer design tokens first.',
					'If tokens are not enough, use component slots.',
					'Then use CSS variables or `className` for targeted overrides.',
				],
				fallback: [
					'Use `noStyle` or a full headless rebuild only when the design system cannot be expressed through the supported styling layers.',
				],
				avoid: [
					'Do not rebuild the consent UI from scratch if tokens, slots, or scoped overrides are sufficient.',
				],
				readNext: [
					'styling/overview.md',
					'styling/tokens.md',
					'styling/slots.md',
					'styling/css-variables.md',
				],
			},
			{
				id: 'consent-ui-customization',
				title: 'Consent UI Customization',
				appliesWhen: [
					'changing banners, dialogs, or preference centers',
					'deciding between built-in components and headless APIs',
				],
				prefer: [
					'Prefer the built-in components and their documented customization surfaces first.',
					'If the UI requirements diverge significantly, use the headless APIs.',
				],
				avoid: [
					'Do not rebuild the full consent flow if a token, slot, or component override is enough.',
				],
				readNext: [
					'quickstart.md',
					'components/consent-banner.md',
					'headless.md',
					'building-headless-components.md',
				],
			},
			{
				id: 'scripts-integrations',
				title: 'Scripts & Integrations',
				appliesWhen: [
					'adding third-party scripts in React components or providers',
					'wiring analytics or advertising behind consent',
				],
				prefer: [
					'Prefer premade scripts from `@c15t/scripts/*`.',
					'Start from the integration docs before implementing custom script wiring in React components.',
				],
				avoid: [
					'Do not duplicate consent-sync logic in React effects when the integration already handles it.',
				],
				readNext: [
					'script-loader.md',
					'integrations/google-tag-manager.md',
					'integrations/meta-pixel.md',
				],
			},
		],
	},
	'@c15t/nextjs': {
		purpose:
			'Next.js-focused c15t docs for consent UI, server-side behavior, callbacks, and integrations.',
		workflowRules: [
			{
				id: 'server-side-setup',
				title: 'Server-Side Setup',
				appliesWhen: [
					'working on App Router or SSR consent initialization',
					'connecting the provider to server-fetched consent data',
					'deciding whether client-only setup is sufficient',
				],
				prefer: [
					'Prefer the documented server helpers and provider setup.',
					'Use the server-side integration path before inventing custom cookie or init plumbing.',
				],
				avoid: [
					'Do not default to client-only initialization when the documented SSR flow already covers the use case.',
				],
				readNext: ['quickstart.md', 'server-side.md'],
			},
			{
				id: 'styling',
				title: 'Styling',
				appliesWhen: [
					'customizing component appearance in a Next.js app',
					'deciding how to override the default consent UI',
				],
				prefer: [
					'Prefer design tokens first.',
					'If tokens are not enough, use component slots.',
					'Then use CSS variables or `className` for targeted overrides.',
				],
				fallback: ['Use `noStyle` or headless only as a last resort.'],
				avoid: [
					'Do not rebuild the consent UI if the documented styling layers can express the design.',
				],
				readNext: [
					'styling/overview.md',
					'styling/tokens.md',
					'styling/slots.md',
				],
			},
			{
				id: 'scripts-integrations',
				title: 'Scripts & Integrations',
				appliesWhen: [
					'wiring scripts through Next.js routes, layouts, or providers',
					'adding analytics or advertising behind consent',
				],
				prefer: [
					'Prefer premade scripts from `@c15t/scripts/*`.',
					'Start from the integration docs before wiring scripts through Next-specific code paths.',
				],
				avoid: [
					'Do not use custom script injection when a documented integration already exists.',
				],
				readNext: [
					'script-loader.md',
					'integrations/google-tag-manager.md',
					'integrations/meta-pixel.md',
				],
			},
		],
	},
	'@c15t/backend': {
		purpose:
			'Self-hosted c15t backend docs for configuration, policy packs, APIs, and operational behavior.',
		workflowRules: [
			{
				id: 'database-initial-setup',
				title: 'Database & Initial Setup',
				appliesWhen: [
					'configuring a self-hosted backend',
					'choosing adapters or initial backend wiring',
				],
				prefer: [
					'Start with the documented database setup guide.',
					'Prefer the documented adapter and setup path before custom backend wiring.',
				],
				fallback: [
					'Use the API reference when you need exact option-level behavior.',
				],
				readNext: [
					'quickstart.md',
					'guides/database-setup.md',
					'api/configuration.md',
				],
			},
			{
				id: 'policy-packs-regional-behavior',
				title: 'Policy Packs & Regional Behavior',
				appliesWhen: [
					'configuring region-aware consent behavior',
					'deciding whether logic belongs in backend policy config or frontend code',
				],
				prefer: [
					'Prefer policy-pack and documented backend configuration over frontend-only regional logic.',
					'Keep consent behavior centralized in backend policy configuration where possible.',
				],
				avoid: [
					'Do not scatter policy decisions across client code when the backend can own them.',
				],
				readNext: ['guides/policy-packs.md', 'api/configuration.md'],
			},
		],
	},
};

function titleCaseSegment(segment: string) {
	return segment
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function pathToDocLabel(path: string) {
	const normalized = path.replace(/^\.\//, '').replace(/\.md$/, '');
	const segments = normalized.split('/');
	const base = segments.at(-1) ?? normalized;

	if (base === 'quickstart') return 'Quickstart';
	if (base === 'README') return 'README';

	return titleCaseSegment(base);
}

function renderLinkedList(paths: string[]) {
	return paths
		.map((path) => `- [${pathToDocLabel(path)}](./${path})`)
		.join('\n');
}

export function getPackageDocsLanding(
	packageName: SupportedDocsPackage
): PackageDocsLanding {
	const config = getAgentPackageConfig(packageName);
	const rules = PACKAGE_RULES[packageName];

	return {
		packageName,
		packageLabel: config.displayTitle,
		purpose: rules.purpose,
		startHere: config.startPages,
		workflowRules: rules.workflowRules,
	};
}

function collectLandingPaths(landing: PackageDocsLanding) {
	const paths = new Set<string>(landing.startHere);
	for (const rule of landing.workflowRules) {
		for (const path of rule.readNext) {
			paths.add(path);
		}
	}
	return paths;
}

export function validatePackageDocsLanding(
	landing: PackageDocsLanding,
	availablePaths: Iterable<string>
) {
	const available = new Set<string>(availablePaths);
	const missing = [...collectLandingPaths(landing)].filter(
		(path) => !available.has(path)
	);

	if (missing.length > 0) {
		throw new Error(
			`Package docs README for ${landing.packageName} references missing docs: ${missing.join(
				', '
			)}`
		);
	}
}

export function renderPackageDocsReadme(
	packageName: SupportedDocsPackage,
	availablePaths: Iterable<string>
) {
	const landing = getPackageDocsLanding(packageName);
	validatePackageDocsLanding(landing, availablePaths);

	const lines = [
		`# ${landing.packageLabel} Docs`,
		'',
		landing.purpose,
		'',
		'If you are changing consent flows, consent UI, script loading, server-side setup, or backend configuration in an app that uses this package, start here before editing code.',
		'',
		'## Start Here',
		'',
		renderLinkedList(landing.startHere),
		'',
		'## Workflow Rules',
	];

	for (const rule of landing.workflowRules) {
		lines.push('', `### ${rule.title}`, '', 'Use this when:');
		for (const item of rule.appliesWhen) {
			lines.push(`- ${item}`);
		}

		lines.push('', 'Prefer:');
		for (const item of rule.prefer) {
			lines.push(`- ${item}`);
		}

		if (rule.fallback && rule.fallback.length > 0) {
			lines.push('', 'If that is not enough:');
			for (const item of rule.fallback) {
				lines.push(`- ${item}`);
			}
		}

		if (rule.avoid && rule.avoid.length > 0) {
			lines.push('', 'Avoid:');
			for (const item of rule.avoid) {
				lines.push(`- ${item}`);
			}
		}

		lines.push('', 'Read next:');
		lines.push(renderLinkedList(rule.readNext));
	}

	return `${lines.join('\n')}\n`;
}
