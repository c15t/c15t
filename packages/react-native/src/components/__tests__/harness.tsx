/**
 * Render helpers and role queries for the built-in surfaces.
 *
 * The components render through `react-dom` against the faithful `react-native`
 * stand-in in `src/__tests__/helpers`, which maps `accessibilityRole` onto
 * `data-rn-role` and `accessibilityLabel` onto `aria-label`. Querying those two
 * attributes is what makes these assertions the accessibility contract itself
 * rather than a DOM detail.
 */

import type { KernelTranslations } from '@c15t/core';
import type { ReactNode } from 'react';
import { Profiler } from 'react';

import {
	buildSnapshot,
	createFakeNativeModule,
	flush,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import type {
	FakeNativeModule,
	RenderHandle,
} from '../../__tests__/helpers/fake-native';
import type { ConsentSnapshot } from '../../protocol';
import { C15tProvider } from '../../provider/c15t-provider';

/** The roles every control in these surfaces is expected to carry. */
export const CONTROL_ROLES = ['button', 'link', 'switch'] as const;

/** Backend copy the surfaces are expected to render verbatim. */
export const TRANSLATIONS: KernelTranslations = {
	language: 'en',
	translations: {
		common: {
			acceptAll: 'Alle akzeptieren',
			acknowledge: 'Verstanden',
			customize: 'Auswahlen',
			dismiss: 'Schliessen',
			rejectAll: 'Alle ablehnen',
			save: 'Speichern',
		},
		consentManagerDialog: {
			description: 'Waehle die Kategorien, die du erlaubst.',
			title: 'Zustimmung verwalten',
		},
		consentTypes: {
			experience: {
				description: 'Verbessert die Antworten der App.',
				title: 'Erlebnis',
			},
			functionality: {
				description: 'Eroegnet Funktionen, die du anforderst.',
				title: 'Funktionalitaet',
			},
			marketing: {
				description: 'Zeigt passende Werbung.',
				title: 'Werbung',
			},
			measurement: {
				description: 'Misst die Nutzung der App.',
				title: 'Messung',
			},
			necessary: {
				description: 'Noetig fuer die App.',
				title: 'Notwendig',
			},
		},
		cookieBanner: {
			description: 'Wir verarbeiten deine Daten.',
			noticeDescription: 'Hinweis: Wir verarbeiten deine Daten.',
			noticeTitle: 'Wie wir Daten nutzen',
			title: 'Deine Privatsphaere',
		},
		rights: { preferences: 'Einstellungen' },
	},
};

/** A snapshot carrying backend copy and the given overrides. */
export const translatedSnapshot = function translatedSnapshot(
	overrides: Partial<ConsentSnapshot> = {}
): ConsentSnapshot {
	return buildSnapshot({ translations: TRANSLATIONS, ...overrides });
};

/** What {@link mountSurface} hands a test. */
export interface SurfaceTree extends RenderHandle {
	/** Commits that touched the mounted subtree, from a `Profiler`. */
	commits: () => number;
	/** The native double the surfaces are talking to. */
	fake: FakeNativeModule;
	/** Reset {@link SurfaceTree.commits} to the current count. */
	resetCommits: () => void;
}

/**
 * Mount children under a provider over a fresh native core.
 *
 * @param children - Subtree to render.
 * @param snapshot - Snapshot the core serves first.
 * @returns The tree handle, with commit counts.
 */
export const mountSurface = function mountSurface(
	children: ReactNode,
	snapshot = translatedSnapshot()
): SurfaceTree {
	const fake = createFakeNativeModule({ snapshot });
	let seen = 0;
	let floor = 0;

	const tree = renderTree(
		<C15tProvider>
			<Profiler
				id="surface"
				onRender={() => {
					seen += 1;
				}}
			>
				{children}
			</Profiler>
		</C15tProvider>
	);

	return {
		commits: () => seen - floor,
		container: tree.container,
		fake,
		rerender: tree.rerender,
		resetCommits: () => {
			floor = seen;
		},
		text: tree.text,
		unmount: tree.unmount,
	};
};

/** All elements in the tree carrying a React Native role. */
export const roleNodes = function roleNodes(
	root: HTMLElement,
	role: string
): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(`[data-rn-role="${role}"]`)];
};

/** The one element carrying a role, or a thrown assertion. */
export const requireRole = function requireRole(
	root: HTMLElement,
	role: string,
	name?: string
): HTMLElement {
	const matches = roleNodes(root, role);
	const labelled =
		name === undefined
			? matches
			: matches.filter((node) => node.getAttribute('aria-label') === name);

	if (labelled.length !== 1) {
		throw new Error(
			`expected exactly one ${role}${name === undefined ? '' : ` labelled "${name}"`}, saw ${labelled.length}`
		);
	}

	return labelled[0] as HTMLElement;
};

/** Tap a control the way a subject would, and let React settle. */
export const tap = function tap(node: HTMLElement): void {
	flush(() => {
		node.click();
	});
};

/** The flattened React Native style a node was rendered with. */
export const nodeStyle = function nodeStyle(
	node: HTMLElement
): Record<string, unknown> {
	return JSON.parse(node.getAttribute('data-rn-style') ?? '{}') as Record<
		string,
		unknown
	>;
};
