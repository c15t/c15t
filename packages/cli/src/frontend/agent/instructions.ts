import { isHiddenCharacter } from '../../generate/backend-url.ts';
import { c15tDistTag, c15tDocsOrigin } from '../../generate/release.ts';

/** Where c15t stores consent choices. */
export type C15tStorageMode = 'hosted' | 'offline' | 'custom';

/** Inputs for {@link createC15tSetupInstructions}. */
export interface C15tSetupInstructionsOptions {
	/**
	 * Docs site the agent reads, such as `https://v3.c15t.com`. Defaults to
	 * the site for this CLI's release line.
	 */
	origin?: string;
	/**
	 * npm dist-tag the agent resolves exact versions from, such as `alpha`.
	 * Defaults to the tag that publishes this CLI's release line.
	 */
	distTag?: string;
	/** Storage mode the host already chose. Omit to have the agent ask. */
	mode?: C15tStorageMode;
	/**
	 * Number of the first step heading. Hosts that put their own numbered
	 * steps first pass the next number. Steps refer to each other by name,
	 * not number, so renumbering never breaks a reference.
	 */
	firstStep?: number;
}

/** Inputs for {@link createC15tIntegrationGuidance}. */
export interface C15tIntegrationGuidanceOptions {
	/**
	 * Docs site the agent reads, such as `https://v3.c15t.com`. Defaults to
	 * the site for this CLI's release line.
	 */
	origin?: string;
}

const readDocsOrigin = (input: string): string => {
	if ([...input].some(isHiddenCharacter)) {
		throw new Error(
			'Docs origins cannot contain whitespace or control characters.'
		);
	}
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		throw new Error('Supply the docs origin as an HTTP or HTTPS URL.');
	}
	if (
		(url.protocol !== 'http:' && url.protocol !== 'https:') ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error(
			'Use an HTTP or HTTPS docs origin without credentials, a query or a fragment.'
		);
	}
	return `${url.origin}${url.pathname.replace(/\/+$/u, '')}`;
};

const readDistTag = (input: string): string => {
	// npm rejects tags that parse as a version range, so a tag starts with a
	// letter. The pattern also keeps the tag from carrying other text.
	if (!/^[a-z][\w.-]*$/iu.test(input)) {
		throw new Error(`Invalid npm dist-tag: ${input}`);
	}
	return input;
};

/**
 * Pick the text for the storage mode. Only hosted mode has a consent
 * backend; a custom transport may persist choices some other way, so it
 * never gets the hosted text.
 */
const byMode = (
	mode: C15tStorageMode | undefined,
	text: Record<C15tStorageMode | 'unknown', string>
): string => text[mode ?? 'unknown'];

/**
 * Exact-version lookups per package manager. Package managers do not share
 * a `view` subcommand: Bun has no `bun view`, Yarn 2+ queries the registry
 * through `yarn npm info`, and Yarn 1 reads a tag through `dist-tags`.
 */
const versionLookup = (
	distTag: string
) => `- npm: \`npm view <package>@${distTag} version\`
- pnpm: \`pnpm view <package>@${distTag} version\`
- Yarn 1: \`yarn info <package> dist-tags.${distTag}\`
- Yarn 2+: \`yarn npm info <package>@${distTag} --fields version\`
- Bun: \`bun info <package>@${distTag} version\``;

const storageMode = (mode: C15tStorageMode | undefined, origin: string) => {
	const transport = `the v3 \`init\` and \`save\` contract in \`${origin}/docs/concepts/data-fetching.md\``;
	switch (mode) {
		case 'hosted':
			return 'Use hosted mode with the backend URL from the setup inputs or earlier steps, exactly as given. If none was given, ask for it. Never construct or invent a backend URL or integration ID.';
		case 'offline':
			return 'Use offline mode. Choices stay in the browser and no backend is involved, so do not add a backend URL.';
		case 'custom':
			return `Use \`custom(transport)\` with the app's own transport. It must implement ${transport}; v2 endpoint handlers such as \`setConsent\` do not fit. If the code does not show how the transport reaches the app's backend, ask.`;
		default:
			return `Use the storage mode from the setup inputs or the app's current c15t configuration. If neither settles it, ask the user to choose:

- hosted: a consent backend, such as an Inth project, records each choice. It needs a provisioned HTTP or HTTPS backend URL. Ask for it; never construct or invent a backend URL or integration ID.
- offline: choices stay in the browser and no server keeps a record.
- custom: the app's own transport, implementing ${transport}.

Never choose offline silently. It looks like a working setup but keeps no server record of consent.`;
	}
};

const integrationGuidance = (
	origin: string
) => `Work one tool at a time from the inventory.

1. **Read before editing.** Read the bundled integrations overview (\`node_modules/c15t/docs/integrations/overview.md\`, or \`${origin}/docs/integrations/overview.md\`), then the tool's full guide and the framework's scripts guide. The overview lists each helper's loading behavior; a search excerpt does not. Note the package version, the guide you read, the helper's import, its required options, and what it does before consent and on withdrawal. Never infer that no helper exists because the app does not use one.
2. **Pick the mechanism against the site's requirement.**
   - A \`@c15t/integrations\` helper exists and its loading behavior meets the site's requirement recorded in the inventory → use it through the provider's documented scripts option.
   - The helper loads before a choice (for example "Always loads; signals Google consent") and the site forbids requests before opt-in → do not use it silently. Use the documented gated alternative if the guide gives one; otherwise register a custom script with a c15t category that waits for consent, and tell the user which vendor features that loses (such as consent-mode modeling).
   - An embed or iframe → use the documented consent-gated component.
   - No helper → register a custom script or gate on the documented consent hook, with a category chosen by purpose.
3. **Make c15t own the loader.** Remove the old script tag, SDK bootstrap, framework component (such as \`@next/third-parties\`), noscript pixel, plugin and old consent callback for that tool. Wrapping an old loader in a consent check is not a migration: it misses withdrawal and leaves two loading paths. Consent checks can still guard event calls.
   **Framework vendor packages** (\`@next/third-parties\`, \`@nuxt/scripts\`, \`nuxt-gtag\`, \`vue-gtag\`, \`react-ga4\`, Gatsby and Astro analytics plugins) load the vendor outside c15t. Replace every vendor export the app uses, then remove the package or module once nothing else uses it:

   | Export | Replace with |
   | --- | --- |
   | \`GoogleAnalytics\` (\`@next/third-parties\`), \`useScriptGoogleAnalytics\` (\`@nuxt/scripts\`), the \`nuxt-gtag\` module | The \`gtag\` helper, or a custom c15t script when the site's requirement forbids requests before opt-in |
   | \`GoogleTagManager\`, \`useScriptGoogleTagManager\` | The \`googleTagManager\` helper, or a custom c15t script under the same rule |
   | Other \`@nuxt/scripts\` registry scripts (\`useScriptMetaPixel\`, \`useScriptPlausibleAnalytics\`, …) | That vendor's \`@c15t/integrations\` helper, or a custom c15t script |
   | \`useScriptTriggerConsent\` and other consent triggers | Nothing: c15t decides when the script loads. A second consent trigger keeps a second source of truth. |
   | \`sendGAEvent\`, \`sendGTMEvent\`, \`useGtag().gtag\`, a registry script's \`proxy\` | Calls to the \`gtag\`, \`dataLayer\` or vendor global that c15t loads. \`sendGAEvent\` drops events with a console warning once \`GoogleAnalytics\` is gone. |
   | \`YouTubeEmbed\`, \`GoogleMapsEmbed\`, \`ScriptYouTubePlayer\`, \`ScriptGoogleMaps\` | The YouTube or Google Maps guide: your own iframe inside the framework's consent gate |

   Keep the measurement ID, container ID and \`dataLayer\` name the old code used. \`@nuxt/scripts\` can also load necessary first-party scripts; keep those registrations.
4. **Keep the product's events.** Keep vendor IDs, settings, event names and payloads. Point each event caller at the loader c15t owns, and make sure the call is a no-op or queued by the vendor's own documented queue while consent is missing. Never add a queue that replays events collected without consent, replace tracking with empty functions, or keep a second SDK bootstrap to preserve an event API. Check for module-level SDK calls that run before consent is known.
5. **Withdrawal must stop the tool.** Follow the guide's revocation behavior (opt-out API, reload, or unload). A one-time gate at startup is not enough.
6. **Tag managers.** Inspect the container's tags too. Non-Google tags ignore Consent Mode; give each a consent requirement, or move it out of the container to its own helper. Expose the categories the downstream tags need in the c15t UI. Report container changes you cannot make yourself with an owner and the exact next step.
7. **Search again.** For each tool, search the app and shared packages for its ID, domain, global (\`gtag\`, \`fbq\`, \`posthog\`) and old loader. Every remaining match must have a stated role. Keep one loading path per tool. Remove vendor packages from package.json once nothing imports them (for example \`@next/third-parties\`, \`posthog-js\`, \`@c15t/scripts\`); a leftover dependency invites someone to load the vendor again.

Naming: follow the app's conventions. Name consent code for consent (\`ConsentProvider\`), vendor configuration for the vendor, and event functions for the product action (\`trackSignup\`). Do not prefix app code with \`C15T\`, and avoid names like \`ConsentAwareAnalytics\` or \`AnalyticsV2\`. Keep exported names other code depends on. Use c15t's documented category values. Remove old consent state, files and dependencies only after checking their remaining consumers. Server-side tracking and forwarding are outside the browser consent boundary; list them separately.

Denied consent does not always mean zero network traffic, and choosing c15t does not make the site legally compliant. State the behavior you configured; do not claim compliance.`;

/**
 * Build the rules for moving analytics, pixels, tag managers and embeds
 * behind c15t consent, including the framework vendor package mapping. This
 * is the body of the "Move every tool behind consent" step, without a
 * heading, so a host can reuse it on its own. It refers to the inventory and
 * the site's requirement recorded there by name, never by step number.
 *
 * @param options Docs origin.
 * @returns Markdown guidance without a heading.
 * @throws {Error} When the origin is not a plain HTTP or HTTPS URL.
 * @example
 * const guidance = createC15tIntegrationGuidance({
 * 	origin: 'https://v3.c15t.com',
 * });
 */
export const createC15tIntegrationGuidance = (
	options: C15tIntegrationGuidanceOptions = {}
): string =>
	integrationGuidance(readDocsOrigin(options.origin ?? c15tDocsOrigin()));

/**
 * Build the c15t integration steps a coding agent follows: inventory, install
 * or upgrade, consent-gating every tool, browser verification and handoff.
 * The text covers c15t only. Hosts such as the Inth CLI or the docs site put
 * their own account and backend steps before it, then pass `firstStep`.
 *
 * Every docs link uses `origin`, and versions resolve from `distTag`, so the
 * agent reads the docs for the release it installs. The defaults follow the
 * release line of the CLI that published this source.
 *
 * @param options Docs origin, dist-tag, storage mode and first step number.
 * @returns Markdown instructions without a title.
 * @throws {Error} When the origin is not a plain HTTP or HTTPS URL, the
 * dist-tag is not a valid npm tag, the mode is unknown, or the first step is
 * not a positive integer.
 * @example
 * const instructions = createC15tSetupInstructions({
 * 	origin: 'https://v3.c15t.com',
 * 	distTag: 'alpha',
 * 	mode: 'hosted',
 * 	firstStep: 4,
 * });
 */
export const createC15tSetupInstructions = (
	options: C15tSetupInstructionsOptions = {}
): string => {
	const origin = readDocsOrigin(options.origin ?? c15tDocsOrigin());
	const distTag = readDistTag(options.distTag ?? c15tDistTag());
	const { mode } = options;
	if (mode && !['hosted', 'offline', 'custom'].includes(mode)) {
		throw new Error('Choose hosted, offline, or custom mode.');
	}
	const first = options.firstStep ?? 1;
	if (!Number.isInteger(first) || first < 1) {
		throw new Error('The first step must be a positive integer.');
	}
	const inventory = first;
	const install = first + 1;
	const tools = first + 2;
	const verify = first + 3;
	const handoff = first + 4;
	const askTogether = mode
		? ''
		: ' Ask the questions from the inventory, and the storage mode question if it applies, together.';

	return `Every c15t docs link below uses ${origin}, which documents the c15t release on the \`${distTag}\` npm dist-tag. Other c15t docs hosts and remembered examples can describe a different major version with different APIs, so do not use them.

## ${inventory}. Inventory the application

Do this before installing anything; the result decides which path you take when installing.

1. Find the target app, framework, router, rendering mode (server, static, cached or single-page), package manager, styling and languages. In a monorepo with more than one candidate app, ask which one.
2. Classify the existing consent setup. Walk this tree:

   \`\`\`
   Does any package.json or lockfile list c15t, @c15t/nextjs, @c15t/react or @c15t/scripts?
   ├── Yes, every c15t package is 3.x → keep it; check its storage mode (Storage mode below).
   ├── Yes, any c15t package is below 3.0 → Upgrade path.
   └── No
       ├── Another consent manager or a homegrown banner exists → Replace path.
       └── Nothing → Install path.
   \`\`\`

   A homegrown banner counts as a consent manager: a component or script that shows a choice, stores it (cookie or localStorage) and checks it before tracking.
3. Inventory every optional tool. Search dependencies, imports, root layouts and document heads, inline scripts, framework plugins, environment variable names, vendor domains and IDs, iframes and embeds, and tag-manager containers. Include first-party tracking such as a fetch to an app-owned metrics endpoint. For each tool, record:
   - every file that loads or initializes it
   - every file that sends events through it
   - its IDs and its purpose (measurement, marketing, functionality, experience)
   - whether the current code gates it on consent, and how
4. Read the site's own requirements (PROJECT.md, README, AGENTS.md, legal notes). Write down whether vendors may load with denied defaults before consent or must send no requests at all before opt-in. If nothing says, ask. This is the site's requirement; it decides which integrations to use.

Show the inventory as a short checklist and continue.${askTogether}

## ${install}. Install or upgrade c15t

Resolve exact versions first. Look up \`c15t\`, \`@c15t/integrations\` when any vendor helper is used, and any other \`@c15t/*\` package the framework guide installs, such as \`@c15t/svelte\`. Use the command for the project's package manager; \`npm view\` also works anywhere npm is installed:

${versionLookup(distTag)}

The packages are numbered separately, so their versions can differ. Install each at its exact resolved version with the project's package manager. Never install by tag or without a version. An untagged install resolves npm's default tag, which can be a different major version. A tagged install can resolve to an older release per package when the package manager delays new releases (pnpm's \`minimumReleaseAge\`), and mixing releases installs two copies of the consent engine. After installing, check that exactly one version of \`@c15t/core\` is installed (\`pnpm why @c15t/core\`, \`npm ls @c15t/core\`, \`yarn why @c15t/core\`, \`bun why @c15t/core\`, or the lockfile). Two copies keep two separate consent states. Do not add overrides or resolutions to force it; install the versions the dist-tag resolves instead.

After installing, read \`node_modules/c15t/SKILL.md\` and \`node_modules/c15t/AGENTS.md\` (for Svelte, the same files in \`node_modules/@c15t/svelte\`). They index the bundled docs for the installed version. Read the bundled choose-your-setup page and the full quickstart for this framework before writing code. If the bundled docs are missing, use \`${origin}/docs/concepts/choose-your-setup.md\` and \`${origin}/docs/frameworks/<framework>/quickstart.md\`. Check each API you use against the installed package's exports and types.

### Storage mode

${storageMode(mode, origin)}

### Upgrade path

Upgrade before any other change. v3 renamed most v2 APIs, and editing v2 code by hand produces a mix of both. Read \`${origin}/docs/frameworks/<next|react|javascript>/upgrade-v3.md\`, or \`${origin}/docs/upgrade-v3.md\` for other frameworks, and follow it in order. Always run its codemod command exactly as the guide writes it, with every listed transform, first with \`--dry-run\`, then for real, before editing c15t code by hand. The transforms depend on each other (one renames components, another rewrites import paths), so a subset leaves broken imports. They also cover every file, including ones you have not read; hand edits miss them. Then resolve every \`TODO(c15t v3)\` the codemods leave. A hosted backend such as an Inth project needs no change. If the app runs its own \`@c15t/backend\`, stop and tell the user: a v3 client cannot read a v2 backend, so both must ship together.

${byMode(mode, {
	custom: '',
	hosted:
		"Keep the app's backend URL unless the setup inputs or earlier steps supply another one.\n\n",
	offline: '',
	unknown:
		"In hosted mode, keep the app's backend URL unless the setup inputs or earlier steps supply another one.\n\n",
})}### Replace path

Record the old consent manager's categories, storage key, callbacks and every caller that reads its state. Map each old category to a c15t category by purpose, not by name. Then follow the install path and, while moving tools behind consent, move every caller to c15t and delete the old banner, its storage reads and its callbacks. Old stored choices do not carry over unless the c15t docs describe an import; visitors choose again.

### Install path

Configure the storage mode (Storage mode above).${byMode(mode, {
		custom: '',
		hosted:
			" Put the backend URL in the app's existing environment conventions as a public variable.",
		offline: '',
		unknown:
			" In hosted mode, put the backend URL in the app's existing environment conventions as a public variable.",
	})} Mount one consent provider at the app root, outside route components; two providers keep two separate choices. Render the banner and the preferences dialog. Add a persistent control that reopens preferences, such as a footer link. If the app already has one (from the old banner), rewire it instead of adding a second. Match the app's design, languages, keyboard access, narrow screens, color schemes and reduced motion.

## ${tools}. Move every tool behind consent

${integrationGuidance(origin)}

## ${verify}. Verify in a browser

Run the project's typecheck, tests and production build. Serve the production build${byMode(
		mode,
		{
			custom: '',
			hosted: ' from an origin the consent backend trusts',
			offline: '',
			unknown: ' (in hosted mode, from an origin the consent backend trusts)',
		}
	)} and use a fresh browser profile for each journey. Follow the bundled guides/verify-consent page (\`${origin}/docs/guides/verify-consent.md\`). Check, by network requests and storage rather than by what the page shows:

1. First visit: the banner shows and no optional tool sends a request that the site's requirement forbids.
2. Reject all: nothing optional loads; ${byMode(mode, {
		custom: "the choice reaches the app's transport (its `save` succeeds)",
		hosted: 'the choice is written to the backend (a successful POST)',
		offline: 'the choice is written to browser storage',
		unknown:
			"the choice is written to the backend in hosted mode (a successful POST), reaches the app's transport in custom mode, or is written to browser storage in offline mode",
	})}; it survives a reload and a client-side navigation.
3. Accept all: each tool loads once, its app events fire once per action, and the choice survives a reload.
4. Withdraw: reopen preferences, reject, reload; the tools stop.
5. Granular choices, keyboard use and a narrow viewport.

A closing banner does not prove a saved choice; ${byMode(mode, {
		custom: "wait for the transport's `save` to finish",
		hosted: 'wait for the backend response',
		offline: 'check browser storage',
		unknown:
			"wait for the backend response in hosted mode or the transport's `save` in custom mode, or check browser storage in offline mode",
	})}. Reconcile what you observed with the inventory and investigate any request you did not expect. Fix failures within this task and mark anything you could not access as unverified.

## ${handoff}. Hand back

Report:
- changed files, ${byMode(mode, {
		custom: 'the storage mode and how the transport persists choices',
		hosted: 'the storage mode and the backend URL',
		offline: 'the storage mode',
		unknown: 'the storage mode and, in hosted mode, the backend URL',
	})}
- the c15t version installed and which path you took (install, upgrade or replace)
- the inventory, with each tool's helper or documented exception, removed loading paths, kept event callers and the checks you ran
- what is integrated, browser-verified, unverified or blocked, and who owns each remaining external change

Keep the change focused. Deploy only through the project's authorized workflow.`;
};
