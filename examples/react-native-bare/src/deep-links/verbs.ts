/**
 * The verbs a demo link can call, in one table.
 *
 * One row per verb, which is the whole design: adding a verb means adding a row,
 * and the on-screen list, the `help` verb, and the README describe the same set
 * because they read this table rather than restate it.
 *
 * Every verb answers with one line. That line is printed on the Diagnostics tab as
 * the receipt for the link, because the only evidence a scripted run leaves behind
 * is a screenshot: the verb has to be visible in the frame that proves it.
 */

import type {
	CommitResult,
	ConsentActions,
	OptionalConsentCategory,
} from '@c15t/react-native';

import type { Appearance } from '../theme';
import { APPEARANCE_HINT, isAppearance } from '../theme';
import type { DemoLink } from './parse';
import { DEMO_REPORT_PARAM, linkFlag } from './parse';

/** What a verb is allowed to touch, handed over by the shell that owns it. */
export interface DemoVerbContext {
	/** The consent actions, exactly as `useConsentActions` returns them. */
	readonly actions: ConsentActions;
	/** Close the dialog and the preference centre. */
	readonly closeSheets: () => void;
	/** Open the built-in consent manager. */
	readonly openDialog: () => void;
	/** Open the built-in preference centre. */
	readonly openPreferences: () => void;
	/** Whether a prompt is still owed, so a verb can name what it left standing. */
	readonly promptOwed: boolean;
	/** Force a colour scheme, or hand the choice back to the platform. */
	readonly setAppearance: (appearance: Appearance) => void;
	/** Show the Diagnostics tab, where the receipt for a link is printed. */
	readonly showDiagnostics: () => void;
}

/** One row of the table. */
export interface DemoVerb {
	/** Runs the verb and answers with the line to print. */
	readonly run: (
		context: DemoVerbContext,
		link: DemoLink
	) => string | Promise<string>;
	/** What the reviewer gets for typing it. */
	readonly summary: string;
	/** Verb as the table and `help` print it, argument included where there is one. */
	readonly usage: string;
	/** The first path segment this row answers to. */
	readonly verb: string;
}

/** Format what the core did, the way the on-screen receipt reads it. */
const describeCommit = (label: string, result: CommitResult): string => {
	if (!result.ok) {
		return `${label}: refused (${result.reason ?? 'no reason given'})`;
	}

	const delivered = result.queued ? 'queued' : 'sent';
	const confirmed =
		result.confirmed.length === 0 ? '' : ` [${result.confirmed.join(', ')}]`;

	return `${label}: rev ${String(result.revision)} ${delivered}${confirmed}`;
};

/** The external id `identify` uses when the link does not name one. */
const DEFAULT_EXTERNAL_ID = 'runner-42';

/** The optional categories a `save` link can name, in policy order. */
const SAVE_CATEGORIES = [
	'experience',
	'functionality',
	'measurement',
	'marketing',
] as const satisfies readonly OptionalConsentCategory[];

/**
 * The categories a `save` link names, leaving the rest alone.
 *
 * Omitted categories keep their stored receipts, which is what the action does and
 * what a partial save has to do. A link that names nothing writes the fixture's
 * standing choice, so a bare verb still produces something a screenshot can confirm.
 */
const selectionFrom = (
	link: DemoLink
): Partial<Record<OptionalConsentCategory, boolean>> => {
	const named = SAVE_CATEGORIES.filter(
		(category) => link.params[category] !== undefined
	);

	if (named.length === 0) {
		return { experience: true, marketing: false };
	}

	const selection: Partial<Record<OptionalConsentCategory, boolean>> = {};

	for (const category of named) {
		selection[category] = linkFlag(link, category);
	}

	return selection;
};

/**
 * Every verb, in the order `help` lists them.
 *
 * `help` is answered by the delivery hook, so the table holds only the verbs that
 * reach the SDK or the screens.
 *
 * `reset` calls the core's wipe, so the table can put a reviewer back at first
 * launch without a reinstall. The sheets close first: a wipe that left the
 * preference centre on screen would show switches read from a snapshot that no
 * longer exists.
 */
export const DEMO_VERBS: readonly DemoVerb[] = [
	{
		run: async (context) =>
			describeCommit('acceptAll', await context.actions.acceptAll()),
		summary: 'Grant every category in the policy scope.',
		usage: 'accept',
		verb: 'accept',
	},
	{
		run: async (context) =>
			describeCommit('rejectAll', await context.actions.rejectAll()),
		summary: 'Grant strictly necessary only.',
		usage: 'reject',
		verb: 'reject',
	},
	{
		run: async (context, link) =>
			describeCommit('save', await context.actions.save(selectionFrom(link))),
		summary: 'Save a per-category set: one parameter per category, 1 or 0.',
		usage: 'save?experience=1&marketing=0',
		verb: 'save',
	},
	{
		run: (context) => {
			context.closeSheets();
			context.actions.dismissNotice();

			// An opt-in banner is not a notice: the core keeps it until the subject
			// decides, so a bare "local" would read like a step that passed.
			return context.promptOwed
				? 'dismissNotice: local; a decision is still owed, so the banner stays'
				: 'dismissNotice: local, nothing sent';
		},
		summary: 'Acknowledge the notice and close any sheet in the way.',
		usage: 'dismiss',
		verb: 'dismiss',
	},
	{
		run: (context) => {
			context.openDialog();

			return 'opened ConsentDialog';
		},
		summary:
			'Open the consent manager, the way the banner Customize button does.',
		usage: 'customize',
		verb: 'customize',
	},
	{
		run: (context) => {
			context.openPreferences();

			return 'opened ConsentPreferences';
		},
		summary: 'Open the preference centre with no prompt outstanding.',
		usage: 'preferences',
		verb: 'preferences',
	},
	{
		run: (context, link) => {
			const wanted = link.rest[0] ?? link.params.scheme ?? link.params.value;

			if (!isAppearance(wanted)) {
				return `scheme: expected ${APPEARANCE_HINT}, got ${String(wanted)}`;
			}

			context.setAppearance(wanted);

			return `appearance: ${wanted}`;
		},
		summary: 'Force a scheme on every surface, or give the choice back.',
		usage: 'scheme/light | scheme/dark | scheme/system',
		verb: 'scheme',
	},
	{
		run: async (context, link) => {
			const externalId = link.params.id ?? link.rest[0] ?? DEFAULT_EXTERNAL_ID;
			await context.actions.identify(externalId);

			return `identify: ${externalId}`;
		},
		summary: 'Attach an external id and load that subject record.',
		usage: `identify?id=${DEFAULT_EXTERNAL_ID}`,
		verb: 'identify',
	},
	{
		run: async (context) => {
			await context.actions.logout();

			return 'logout: external id detached, consent kept';
		},
		summary: 'Detach the external id.',
		usage: 'logout',
		verb: 'logout',
	},
	{
		run: async (context, link) => {
			const country = link.params.country ?? link.rest[0] ?? null;
			await context.actions.setOverrides({ country });

			return `setOverrides: country ${country ?? 'cleared'}`;
		},
		summary: 'Pin a country, or clear the override and let the backend detect.',
		usage: 'overrides?country=DE | overrides?country=',
		verb: 'overrides',
	},
	{
		run: async (context) => {
			await context.actions.refresh();

			return 'refresh: policy re-resolved';
		},
		summary: 'Re-resolve policy and retry the offline queue.',
		usage: 'refresh',
		verb: 'refresh',
	},
	{
		run: async (context) => {
			context.closeSheets();
			await context.actions.reset();

			return 'reset: consent wiped, first-run prompt owed again';
		},
		summary: 'Forget the stored consent and owe the first-run prompt again.',
		usage: 'reset',
		verb: 'reset',
	},
];

/**
 * The verb that prints this list.
 *
 * It is answered by the delivery hook rather than carried as a row, because it calls
 * nothing and a row that calls nothing would have to name itself in its own table.
 */
export const HELP_USAGE = 'help';

const HELP_LINE = `${HELP_USAGE} - Print this list on screen.`;

/**
 * The one flag every verb takes, including this list.
 *
 * It is a parameter rather than a verb because it reports on a verb, and on `help`
 * and on a verb the table does not recognise, so no row owns it.
 */
const REPORT_LINE = `${DEMO_REPORT_PARAM}=1 - Answer on the Diagnostics tab, so the receipt is in the screenshot.`;

/** The table as lines, shared by the `help` verb and the Diagnostics tab. */
export const DEMO_VERB_LINES: readonly string[] = [
	...DEMO_VERBS.map((entry) => `${entry.usage} - ${entry.summary}`),
	HELP_LINE,
	REPORT_LINE,
];
