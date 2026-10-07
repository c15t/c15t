import type { CornerPosition } from '@c15t/ui/utils';

import { classes } from '../generated/styles';
import { h, svg } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The `</>` mark, stroked like the React toolbar's `DevToolsIcon`. */
const DEVTOOLS_MARK = ['m18 16 4-4-4-4', 'm6 8-4 4 4 4', 'm14.5 4-5 16'];

const createDevToolsIcon = function createDevToolsIcon(): SVGSVGElement {
	const icon = svg('0 0 24 24', [], {
		fill: 'none',
		stroke: 'currentColor',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'stroke-width': 2,
	});
	for (const d of DEVTOOLS_MARK) {
		const path = document.createElementNS(SVG_NS, 'path');
		path.setAttribute('d', d);
		icon.append(path);
	}
	return icon;
};

/** What {@link createTriggerToolbar} needs. */
export interface TriggerToolbarParams {
	/** Accessible name of the preferences item. */
	ariaLabel: string;
	/** Icon of the preferences item. */
	icon: SVGSVGElement;
	/** Ship the DOM without class names. */
	noStyle: boolean;
	/** Item size. */
	size: 'sm' | 'md' | 'lg';
	/** Runs on a click or key press on an item; `false` cancels it. */
	shouldActivate: (event: MouseEvent) => boolean;
	/** Opens the preference centre. */
	onPreferences: () => void;
	/** Opens or closes DevTools. */
	onDevTools: () => void;
}

/** The two-item trigger shown while DevTools is mounted. */
export interface TriggerToolbar {
	/** The `role="toolbar"` root. */
	element: HTMLDivElement;
	/** Put the preferences item in `corner`, DevTools farthest from it. */
	setCorner: (corner: CornerPosition) => void;
	/** Reflect whether the DevTools panel is open. */
	setOpen: (isOpen: boolean) => void;
	/** Swap the preferences item's icon, for example after a branding change. */
	setIcon: (icon: SVGSVGElement) => void;
}

/**
 * Build the toolbar the trigger becomes while a DevTools panel is mounted:
 * the preferences item and a DevTools item, with the same classes, data
 * attributes and ARIA as the React `ConsentDialogTrigger` toolbar. The
 * caller owns drag, position classes and visibility.
 *
 * @param params - Labels, icon and handlers.
 * @returns The toolbar.
 * @internal
 */
export const createTriggerToolbar = function createTriggerToolbar(
	params: TriggerToolbarParams
): TriggerToolbar {
	const styles = classes.trigger;
	const { noStyle } = params;

	const item = function item(
		action: 'preferences' | 'devtools',
		label: string,
		icon: SVGSVGElement,
		onSelect: () => void
	): HTMLButtonElement {
		return h(
			'button',
			{
				'aria-label': label,
				class: noStyle ? '' : `${styles.toolbarItem} ${styles[params.size]}`,
				'data-c15t-trigger-action': action,
				'data-c15t-trigger-item': action,
				onclick: (event: Event) => {
					if (params.shouldActivate(event as MouseEvent)) {
						onSelect();
					}
				},
				type: 'button',
			},
			h(
				'span',
				{ 'aria-hidden': 'true', class: noStyle ? '' : styles.toolbarIcon },
				icon
			)
		);
	};

	const preferences = item(
		'preferences',
		params.ariaLabel,
		params.icon,
		params.onPreferences
	);
	const devtools = item(
		'devtools',
		'c15t DevTools',
		createDevToolsIcon(),
		params.onDevTools
	);
	devtools.setAttribute('aria-expanded', 'false');

	const element = h('div', {
		'aria-label': 'Privacy controls',
		'aria-orientation': 'horizontal',
		'data-c15t-trigger': 'true',
		'data-c15t-trigger-toolbar': 'true',
		dir: 'ltr',
		role: 'toolbar',
		tabindex: -1,
	});

	// One tab stop; the arrow keys move between items.
	let active = preferences;
	const focusItem = function focusItem(next: HTMLButtonElement): void {
		active = next;
		for (const button of [preferences, devtools]) {
			button.tabIndex = button === active ? 0 : -1;
		}
	};
	for (const button of [preferences, devtools]) {
		button.addEventListener('focus', () => {
			focusItem(button);
		});
	}
	focusItem(preferences);
	element.addEventListener('keydown', (event) => {
		const items = [...element.children] as HTMLButtonElement[];
		const index = items.indexOf(active);
		let next: HTMLButtonElement | undefined;
		if (event.key === 'Home') {
			[next] = items;
		} else if (event.key === 'End') {
			next = items.at(-1);
		} else if (event.key === 'ArrowRight') {
			next = items[(index + 1) % items.length];
		} else if (event.key === 'ArrowLeft') {
			next = items[(index - 1 + items.length) % items.length];
		}
		if (next) {
			event.preventDefault();
			next.focus();
		}
	});

	return {
		element,
		setCorner(corner) {
			// Preferences sits in the corner; DevTools, a development aid,
			// sits farthest from it.
			const order = corner.endsWith('left')
				? [preferences, devtools]
				: [devtools, preferences];
			if (element.firstElementChild !== order[0]) {
				element.append(...order);
			}
		},
		setIcon(icon) {
			preferences.firstElementChild?.replaceChildren(icon);
		},
		setOpen(isOpen) {
			devtools.setAttribute('aria-expanded', String(isOpen));
		},
	};
};
