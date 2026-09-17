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

/**
 * The chrome a surface renders: its banner or its sheet, found by landmark.
 *
 * That landmark travels on React Native's `role` prop rather than `accessibilityRole`, so
 * this cannot reuse {@link roleNodes}. When a caller names no label, the labelled node wins:
 * React Native's own `Modal` is a dialog as well, and the sheet is the one that names itself.
 *
 * @param root - Rendered tree to search.
 * @param label - Surface label to disambiguate by, when the tree can hold more than one.
 * @returns The one chrome element, or a thrown assertion.
 */
export const surfaceNode = function surfaceNode(
	root: HTMLElement,
	label?: string
): HTMLElement {
	const matches = [
		...root.querySelectorAll<HTMLElement>('[role="region"], [role="dialog"]'),
	].filter(
		(node) => label === undefined || node.getAttribute('aria-label') === label
	);
	const chosen =
		matches.length > 1
			? matches.filter((node) => node.hasAttribute('aria-label'))
			: matches;

	if (chosen.length !== 1) {
		throw new Error(
			`expected one consent surface${
				label === undefined ? '' : ` labelled "${label}"`
			}, saw ${chosen.length}`
		);
	}

	return chosen[0] as HTMLElement;
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

/**
 * The hit area a control asked for.
 *
 * A built-in control reaches the platform's 44pt floor through `hitSlop` rather
 * than a drawn `minHeight`, so reading the style alone no longer says whether a
 * finger is covered. The stand-in records the resolved inset on every `Pressable`.
 *
 * @param node - The rendered control.
 * @returns The four edges the touch area extends past the drawn box, zero where the
 * control asked for no slop at all.
 */
export const hitSlop = function hitSlop(node: HTMLElement): {
	bottom: number;
	left: number;
	right: number;
	top: number;
} {
	const raw = node.getAttribute('data-hit-slop');

	if (raw === null) {
		return { bottom: 0, left: 0, right: 0, top: 0 };
	}

	return JSON.parse(raw) as {
		bottom: number;
		left: number;
		right: number;
		top: number;
	};
};

/**
 * The height a control's touch area covers.
 *
 * A web consent action draws 35.5 tall and reaches the platform's 44 through its
 * hit area, so reading `minHeight` no longer says whether a finger is covered.
 * This adds the drawn box and the slop back together so a test can assert the
 * thing that actually matters.
 *
 * @param node - The rendered control.
 * @returns Drawn height plus the slop above and below it.
 */
export const touchHeight = function touchHeight(node: HTMLElement): number {
	const box = nodeStyle(node);
	const label =
		node.firstElementChild === null
			? {}
			: nodeStyle(node.firstElementChild as HTMLElement);
	const number = (
		style: Record<string, unknown>,
		key: string,
		fallback = 0
	): number => {
		const value = style[key];

		return typeof value === 'number' ? value : fallback;
	};
	const padding = number(box, 'paddingVertical');
	const vertical = padding > 0 ? padding * 2 : number(box, 'paddingTop') * 2;
	const slop = JSON.parse(node.getAttribute('data-hit-slop') ?? '{}') as Record<
		string,
		number
	>;

	return (
		vertical +
		number(label, 'lineHeight') +
		number(box, 'borderWidth') * 2 +
		number(slop, 'top') +
		number(slop, 'bottom')
	);
};
